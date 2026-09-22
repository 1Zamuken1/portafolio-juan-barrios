package com.juanbarrios.portfolio.infrastructure.adapter.out.ai;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.juanbarrios.portfolio.domain.model.ProjectDraft;
import com.juanbarrios.portfolio.domain.port.out.DrafterNoDisponibleException;
import com.juanbarrios.portfolio.domain.port.out.ProjectDrafterPort;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * Adaptador de salida: pide el borrador a Groq.
 *
 * Es el unico punto del proyecto que sabe que existe Groq. El caso de uso habla
 * con {@link ProjectDrafterPort} y no se entera de nada de lo que hay aqui, asi
 * que cambiar de proveedor es escribir otro adaptador.
 *
 * <p><b>Sobre el formato de respuesta.</b> Groq expone una API compatible con
 * la de OpenAI y admite {@code response_format: json_object}, que garantiza
 * JSON sintacticamente valido pero no que traiga los campos que pedimos ni que
 * esten rellenos. Por eso el caso de uso valida lo que sale de aqui.
 *
 * <p>El modo de esquema estricto, que si lo garantizaria, solo esta en algunos
 * modelos --entre ellos los gpt-oss que ahora usamos por defecto--. No se usa
 * porque {@code GROQ_MODEL} es configurable: atar el adaptador a una capacidad
 * que el modelo configurado puede no tener cambiaria un fallo claro por uno
 * raro. La validacion del caso de uso vale para cualquier modelo.
 *
 * <p><b>Sobre el modelo por defecto.</b> Se cambia sin tocar codigo, con
 * {@code GROQ_MODEL}, porque Groq retira modelos cada pocos meses y el sintoma
 * es un 404. Ya paso: el primer defecto de esta clase fue
 * {@code llama-3.3-70b-versatile}, retirado el 16 de agosto de 2026 para los
 * planes gratuito y developer.
 *
 * <p><b>Sobre la clave.</b> Si no esta definida, este adaptador falla al
 * llamarlo, no al arrancar. Es deliberado y distinto de lo que hace
 * {@code jwt.secret}, que si impide el arranque: sin JWT no hay panel de
 * administracion, pero sin clave de Groq el portafolio entero funciona
 * exactamente igual y solo deja de estar disponible un boton.
 */
@Component
public class GroqProjectDrafter implements ProjectDrafterPort {

    private static final Logger log = LoggerFactory.getLogger(GroqProjectDrafter.class);

    private final String apiKey;
    private final List<String> modelos;
    private final RestClient http;

    /** Groq retiro el modelo que se le pidio. Interna: no sale del adaptador. */
    private static class ModeloRetirado extends RuntimeException {
        final transient String modelo;

        ModeloRetirado(String modelo) {
            super(modelo);
            this.modelo = modelo;
        }
    }

    /**
     * Parte la lista de modelos separada por comas y quita los huecos.
     *
     * Se admite una lista y no un solo nombre porque Groq retira modelos cada
     * pocos meses sin avisar a quien los usa. Con uno solo, el dia que caiga el
     * boton deja de funcionar hasta que alguien se entere; con una lista, se
     * pasa al siguiente y sigue en pie.
     */
    static List<String> separarModelos(String configurado) {
        if (configurado == null) return List.of();
        return Arrays.stream(configurado.split(","))
                .map(String::trim)
                .filter(m -> !m.isEmpty())
                .toList();
    }

    /**
     * Mapper propio del adaptador, no el compartido de Spring: aqui se parsea
     * texto de origen no confiable y conviene fijar el comportamiento en vez de
     * heredar el que tenga configurado la aplicacion. Se ignoran los campos
     * desconocidos porque el modelo anade extras de vez en cuando y eso no es
     * motivo para tirar un borrador que por lo demas esta bien.
     */
    private final ObjectMapper json = new ObjectMapper()
            .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);

    public GroqProjectDrafter(
            @Value("${groq.api-key:}") String apiKey,
            @Value("${groq.model:openai/gpt-oss-120b,openai/gpt-oss-20b,qwen/qwen3.6-27b}") String modelos,
            @Value("${groq.base-url:https://api.groq.com/openai/v1}") String baseUrl) {

        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.modelos = separarModelos(modelos);

        // Redactar ~2000 caracteres tarda bastante mas que una peticion
        // normal, pero tampoco puede quedarse colgado para siempre ocupando un
        // hilo del servidor.
        SimpleClientHttpRequestFactory fabrica = new SimpleClientHttpRequestFactory();
        fabrica.setConnectTimeout(Duration.ofSeconds(10));
        fabrica.setReadTimeout(Duration.ofSeconds(90));

        this.http = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(fabrica)
                .build();
    }

    @Override
    public ProjectDraft draft(String nombre, String readme) {
        if (apiKey.isEmpty()) {
            throw new DrafterNoDisponibleException(
                    "No hay clave de Groq configurada. Define GROQ_API_KEY en el entorno.");
        }
        if (modelos.isEmpty()) {
            throw new DrafterNoDisponibleException(
                    "No hay ningun modelo configurado. Define GROQ_MODEL en el entorno.");
        }

        List<String> retirados = new ArrayList<>();

        for (String modelo : modelos) {
            try {
                ProjectDraft borrador = parsear(pedirRespuesta(modelo, nombre, readme));
                if (!retirados.isEmpty()) {
                    // Que quede constancia: el borrador salio, pero de un
                    // modelo distinto al preferido y eso cambia el resultado.
                    log.warn("Groq retiro {}. Se redacto con {}. Actualiza GROQ_MODEL.",
                            String.join(", ", retirados), modelo);
                }
                return borrador;
            } catch (ModeloRetirado e) {
                retirados.add(e.modelo);
                // Se prueba el siguiente. Cualquier otro fallo --401, 429, un
                // corte de red-- sube tal cual: reintentarlo con otro modelo
                // no arreglaria nada y solo gastaria cuota.
            }
        }

        throw new DrafterNoDisponibleException(sinModelosVivos(retirados));
    }

    /**
     * Mensaje para cuando Groq ha retirado todos los modelos configurados.
     *
     * Le pregunta a Groq cuales tiene ahora y los pone en el mensaje. Es una
     * llamada de mas, pero solo ocurre cuando ya no hay nada que hacer, y sin
     * ella averiguar el nombre correcto significa buscar en la documentacion
     * un cambio del que nadie avisa. Con ella, el propio error trae la lista.
     */
    private String sinModelosVivos(List<String> retirados) {
        String vivos;
        try {
            vivos = String.join("\n  - ", modelosDisponibles());
        } catch (Exception e) {
            vivos = null;
        }

        String mensaje = "Groq ya no tiene ninguno de los modelos configurados: "
                + String.join(", ", retirados) + ".";

        if (vivos == null || vivos.isBlank()) {
            return mensaje + "\n\nNo se pudo consultar la lista actual. Mirala en "
                    + "https://console.groq.com/docs/deprecations y actualiza GROQ_MODEL.";
        }
        return mensaje + "\n\nModelos disponibles ahora mismo con esta clave:\n  - " + vivos
                + "\n\nPon uno de estos en GROQ_MODEL. Admite varios separados por comas, "
                + "y se usan en orden: asi el dia que retiren el primero se pasa al "
                + "siguiente en vez de dejar de funcionar.";
    }

    /** Los modelos de texto que Groq acepta ahora mismo con esta clave. */
    private List<String> modelosDisponibles() throws Exception {
        String cuerpo = http.get()
                .uri("/models")
                .header("Authorization", "Bearer " + apiKey)
                .retrieve()
                .body(String.class);

        List<String> ids = new ArrayList<>();
        for (JsonNode modelo : json.readTree(cuerpo).path("data")) {
            String id = modelo.path("id").asText("");
            // Whisper transcribe y no redacta: ofrecerlo aqui solo despistaria.
            if (!id.isBlank() && !id.startsWith("whisper")) ids.add(id);
        }
        ids.sort(String::compareTo);
        return ids;
    }

    /** Hace la llamada y devuelve el texto que genero el modelo. */
    private String pedirRespuesta(String modelo, String nombre, String readme) {
        Map<String, Object> peticion = Map.of(
                "model", modelo,
                // Cero temperatura: esto no es escritura creativa, es extraer
                // lo que ya dice el readme. Cuanto menos invente, mejor.
                "temperature", 0.2,
                "response_format", Map.of("type", "json_object"),
                "messages", java.util.List.of(
                        Map.of("role", "system", "content", DraftPrompt.SISTEMA),
                        Map.of("role", "user", "content", DraftPrompt.usuario(nombre, readme))));

        String cuerpo;
        try {
            cuerpo = http.post()
                    .uri("/chat/completions")
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(peticion)
                    .retrieve()
                    .body(String.class);
        } catch (RestClientResponseException e) {
            String respuesta = e.getResponseBodyAsString();

            // Un modelo retirado no es un fallo del que haya que rendirse:
            // hay mas en la lista. Se marca para que draft() pruebe el
            // siguiente.
            if (esModeloRetirado(e.getStatusCode().value(), respuesta)) {
                throw new ModeloRetirado(modelo);
            }

            // El cuerpo del error SI se incluye. Antes se ocultaba por si
            // llevara dentro la cabecera de autorizacion, y eso fue un error:
            // Groq responde un objeto JSON de error que no repite nada de la
            // peticion, y sin el un 404 sale como "NotFound" a secas.
            // Indistinguible de una URL mal puesta, de una ruta que no existe
            // o de un modelo retirado, que es justo lo que paso. Es el mismo
            // fallo que el 403 vacio de /error: esconder el motivo hace que
            // cualquier causa se vea igual.
            throw new DrafterNoDisponibleException(
                    "Groq respondio " + e.getStatusCode().value() + ": "
                            + pista(e.getStatusCode().value(), respuesta), e);
        } catch (Exception e) {
            throw new DrafterNoDisponibleException(
                    "No se pudo contactar con Groq: " + e.getClass().getSimpleName(), e);
        }

        try {
            JsonNode raiz = json.readTree(cuerpo);
            JsonNode texto = raiz.path("choices").path(0).path("message").path("content");
            if (texto.isMissingNode() || texto.asText().isBlank()) {
                throw new DrafterNoDisponibleException(
                        "Groq respondio sin contenido generado.");
            }
            return texto.asText();
        } catch (DrafterNoDisponibleException e) {
            throw e;
        } catch (Exception e) {
            throw new DrafterNoDisponibleException(
                    "La respuesta de Groq no tenia el formato esperado.", e);
        }
    }

    /** Convierte el texto generado en un borrador. */
    private ProjectDraft parsear(String contenido) {
        String limpio = quitarVallas(contenido);
        try {
            return json.readValue(limpio, ProjectDraft.class);
        } catch (Exception e) {
            throw new DrafterNoDisponibleException(
                    "El modelo no devolvio un borrador con la forma esperada.", e);
        }
    }

    /**
     * Distingue "este modelo ya no existe" de cualquier otro 404.
     *
     * Groq lo marca con {@code code: model_not_found}. Se mira tambien el texto
     * porque el codigo no siempre viene y, sin esa red, un modelo retirado
     * pararia la cadena de reserva justo cuando mas falta hace.
     */
    static boolean esModeloRetirado(int estado, String cuerpo) {
        if (estado != 404 || cuerpo == null) return false;
        String texto = cuerpo.toLowerCase();
        return texto.contains("model_not_found")
                || (texto.contains("model") && texto.contains("does not exist"));
    }

    /**
     * Saca el mensaje del error de Groq y, si el estado es de los conocidos,
     * dice que hacer.
     *
     * Sin esto un fallo salia como el nombre de la excepcion a secas y
     * cualquier causa se veia igual: el mismo error que el 403 vacio de
     * /error que este proyecto ya habia pagado una vez.
     */
    static String pista(int estado, String cuerpo) {
        String mensaje = mensajeDeGroq(cuerpo);

        if (estado == 404) {
            // Un modelo retirado no llega hasta aqui: esModeloRetirado() lo
            // desvia antes para probar el siguiente de la lista. Un 404 que
            // llegue a este punto es otra cosa, casi siempre la URL base.
            return mensaje + "\n\nLa ruta no existe. Revisa GROQ_BASE_URL: "
                    + "deberia ser https://api.groq.com/openai/v1.";
        }
        if (estado == 401) {
            return mensaje + "\n\nRevisa GROQ_API_KEY en el dashboard de Render.";
        }
        if (estado == 429) {
            return mensaje + "\n\nSe agoto la cuota o el limite por minuto. Reintenta mas tarde.";
        }
        return mensaje;
    }

    /** El campo error.message de la respuesta, o el cuerpo crudo si no lo trae. */
    private static String mensajeDeGroq(String cuerpo) {
        if (cuerpo == null || cuerpo.isBlank()) return "(sin cuerpo en la respuesta)";
        try {
            JsonNode mensaje = new ObjectMapper().readTree(cuerpo).path("error").path("message");
            if (!mensaje.isMissingNode() && !mensaje.asText().isBlank()) {
                return mensaje.asText();
            }
        } catch (Exception ignorado) {
            // No era JSON. Se devuelve el cuerpo tal cual, recortado.
        }
        return cuerpo.length() > 500 ? cuerpo.substring(0, 500) + "..." : cuerpo;
    }

    /**
     * Quita las vallas de codigo si el modelo envuelve el JSON en ```json.
     *
     * El modo objeto JSON deberia evitarlo, pero no cuesta nada protegerse y
     * es el fallo mas comun cuando se cambia de modelo.
     */
    static String quitarVallas(String texto) {
        String t = texto.trim();
        if (!t.startsWith("```")) return t;

        int primerSalto = t.indexOf('\n');
        if (primerSalto < 0) return t;
        t = t.substring(primerSalto + 1);

        int ultimaValla = t.lastIndexOf("```");
        if (ultimaValla >= 0) t = t.substring(0, ultimaValla);

        return t.trim();
    }
}
