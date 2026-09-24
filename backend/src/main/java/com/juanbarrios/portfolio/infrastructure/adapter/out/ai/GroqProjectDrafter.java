package com.juanbarrios.portfolio.infrastructure.adapter.out.ai;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.juanbarrios.portfolio.domain.model.ProjectDraft;
import com.juanbarrios.portfolio.domain.port.out.AvisoDeEtapa;
import com.juanbarrios.portfolio.domain.port.out.DrafterNoDisponibleException;
import com.juanbarrios.portfolio.domain.port.out.RespuestaIlegibleException;
import com.juanbarrios.portfolio.domain.port.out.ProjectDrafterPort;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

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
    public ProjectDraft draft(String nombre, String readme, AvisoDeEtapa aviso) {
        return draft(nombre, readme, aviso, null);
    }

    @Override
    public ProjectDraft draft(String nombre, String readme, AvisoDeEtapa aviso, String correccion) {
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
                aviso.avisar("modelo", retirados.isEmpty()
                        ? "Consultando " + modelo
                        : "Probando " + modelo + ", que es el siguiente de la lista");

                long arranque = System.nanoTime();
                String contenido = pedirRespuesta(modelo, nombre, readme, correccion, aviso);
                long tardo = (System.nanoTime() - arranque) / 1_000_000;

                aviso.avisar("respuesta", modelo + " respondio " + contenido.length()
                        + " caracteres en " + segundos(tardo));

                ProjectDraft borrador = parsear(contenido);
                aviso.avisar("parseo", "El JSON tiene la forma esperada");

                if (!retirados.isEmpty()) {
                    // Que quede constancia: el borrador salio, pero de un
                    // modelo distinto al preferido y eso cambia el resultado.
                    log.warn("Groq retiro {}. Se redacto con {}. Actualiza GROQ_MODEL.",
                            String.join(", ", retirados), modelo);
                }
                return borrador;
            } catch (ModeloRetirado e) {
                retirados.add(e.modelo);
                aviso.avisar("modelo", "Groq ya no tiene " + e.modelo + "; queda retirado");
                // Se prueba el siguiente. Cualquier otro fallo --401, 429, un
                // corte de red-- sube tal cual: reintentarlo con otro modelo
                // no arreglaria nada y solo gastaria cuota.
            }
        }

        throw new DrafterNoDisponibleException(sinModelosVivos(retirados));
    }

    /**
     * Milisegundos a algo que se lee de un vistazo: "8,4 s".
     *
     * A mano y no con String.format porque el formato numerico depende de la
     * configuracion regional del servidor, y este texto va a una interfaz en
     * espaniol: en Render saldria "8.4 s" sin que aqui se viera el porque.
     */
    private static String segundos(long ms) {
        return (ms / 1000) + "," + ((ms % 1000) / 100) + " s";
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

    /**
     * Hace la llamada y devuelve el texto que genero el modelo, contandolo
     * segun llega.
     *
     * <p><b>Se pide en streaming.</b> El resultado es el mismo texto que antes;
     * lo que cambia es que en vez de esperar ocho segundos callados, cada trozo
     * que manda el modelo sale por {@code aviso} en cuanto llega. Ese es todo
     * el motivo: ocho segundos sin nada en pantalla no se distinguen de una
     * conexion colgada.
     *
     * <p>El JSON sigue parseandose <b>al final y entero</b>. Un objeto a medias
     * no se puede validar, asi que lo que se enseina mientras llega es texto
     * para mirar, no datos para usar. La diferencia importa: nada del
     * formulario se toca hasta que el borrador completo pasa las cotas.
     */
    private String pedirRespuesta(String modelo, String nombre, String readme, String correccion,
                                  AvisoDeEtapa aviso) {
        Map<String, Object> peticion = new java.util.LinkedHashMap<>();
        peticion.put("model", modelo);
        // Poca temperatura: esto no es escritura creativa, es extraer lo que
        // ya dice el readme. Cuanto menos invente, mejor.
        peticion.put("temperature", 0.2);
        peticion.put("response_format", Map.of("type", "json_object"));
        peticion.put("stream", true);
        // Tope holgado: la ficha ronda los tres mil caracteres, pero un modelo
        // que razona gasta tokens antes de escribirla. Sin tope explicito se
        // usa el del modelo, y con el de algunos se quedaba a medias.
        peticion.put("max_completion_tokens", 8192);
        if (razonaDemasiado(modelo)) {
            // Los gpt-oss razonan antes de responder, y con el esfuerzo por
            // defecto un readme largo se les iba entero en el razonamiento: el
            // flujo llegaba sin una letra de la ficha. Extraer de un readme no
            // necesita pensarlo mucho. Solo para ellos: otros modelos de la
            // lista rechazan el parametro.
            peticion.put("reasoning_effort", "low");
        }
        peticion.put("messages", java.util.List.of(
                Map.of("role", "system", "content", DraftPrompt.SISTEMA),
                Map.of("role", "user", "content", DraftPrompt.usuario(nombre, readme, correccion))));

        try {
            // exchange() y no retrieve(): hace falta el cuerpo como flujo para
            // leerlo mientras entra. A cambio, exchange no lanza por si solo
            // ante un estado de error, asi que el estado se comprueba a mano
            // dentro --y ese chequeo es el que mantiene viva la deteccion de
            // modelo retirado--.
            return http.post()
                    .uri("/chat/completions")
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(peticion)
                    .exchange((peticionHttp, respuesta) -> leerFlujo(modelo, respuesta, aviso));

        } catch (ModeloRetirado | DrafterNoDisponibleException e) {
            // RespuestaIlegibleException es un DrafterNoDisponibleException y
            // sube tal cual: el caso de uso la reintenta.
            throw e;
        } catch (Exception e) {
            throw new DrafterNoDisponibleException(
                    "No se pudo contactar con Groq: " + e.getClass().getSimpleName(), e);
        }
    }

    /**
     * Lee la respuesta en streaming de Groq y devuelve el texto completo.
     *
     * El formato es el de SSE: lineas {@code data: {...}} con un trozo de texto
     * cada una, y una ultima {@code data: [DONE]}.
     */
    private String leerFlujo(String modelo, ClientHttpResponse respuesta, AvisoDeEtapa aviso)
            throws IOException {

        int estado = respuesta.getStatusCode().value();
        if (estado != 200) {
            String cuerpo = new String(respuesta.getBody().readAllBytes(), StandardCharsets.UTF_8);

            // Un modelo retirado no es un fallo del que haya que rendirse: hay
            // mas en la lista. Se marca para que draft() pruebe el siguiente.
            if (esModeloRetirado(estado, cuerpo)) {
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
                    "Groq respondio " + estado + ": " + pista(estado, cuerpo));
        }

        long arranque = System.nanoTime();
        boolean[] primero = {true};

        Consumer<String> porTrozo = trozo -> {
            if (primero[0]) {
                primero[0] = false;
                // El primer token es el dato que separa "el modelo esta
                // pensando" de "la peticion no ha salido". Sin el, los dos se
                // ven igual: una pantalla quieta.
                aviso.avisar("modelo", modelo + " empezo a responder a los "
                        + segundos((System.nanoTime() - arranque) / 1_000_000));
            }
            aviso.avisar("texto", trozo);
        };

        try (BufferedReader lector = new BufferedReader(
                new InputStreamReader(respuesta.getBody(), StandardCharsets.UTF_8))) {

            String primera = primeraLineaUtil(lector);
            if (primera == null) {
                throw new DrafterNoDisponibleException(
                        "Groq respondio 200 con el cuerpo vacio. No hay nada que redactar "
                                + "ni motivo que dar: reintenta, y si se repite mira el estado "
                                + "del servicio en https://groqstatus.com.");
            }

            // Se mira lo que de verdad llego en vez de dar por hecho que es un
            // flujo. Pedir stream:true no obliga a nadie a mandarlo: si la
            // respuesta viene de una pieza, el lector de SSE la recorreria
            // entera sin reconocer una sola linea y diria "sin contenido
            // generado", que es exactamente el tipo de mensaje que ya costo una
            // hora con el modelo retirado.
            if (primera.startsWith("data:")) {
                Diagnostico visto = new Diagnostico();
                String completo = ensamblarSse(primera, lector, json, porTrozo, visto);
                if (completo.isEmpty()) {
                    throw new RespuestaIlegibleException(visto.porQueVinoVacio());
                }
                return completo;
            }

            // No era un flujo. Se lee como la respuesta de siempre, que es
            // formato conocido, y el texto sale de golpe en vez de letra a
            // letra: peor de ver, pero el borrador se redacta igual. Que el
            // dibujo sea mas pobre no es motivo para no dar un resultado.
            log.warn("Groq no respondio en streaming pese a pedirselo; se lee de una pieza. "
                    + "Primera linea: {}", recortar(primera));
            return contenidoDeUnaPieza(primera + "\n" + leerResto(lector), json, porTrozo);
        }
    }

    /** La primera linea con algo dentro, o null si el cuerpo no traia ninguna. */
    private static String primeraLineaUtil(BufferedReader lector) throws IOException {
        String linea;
        while ((linea = lector.readLine()) != null) {
            if (!linea.isBlank()) return linea;
        }
        return null;
    }

    private static String leerResto(BufferedReader lector) throws IOException {
        StringBuilder resto = new StringBuilder();
        String linea;
        while ((linea = lector.readLine()) != null) {
            resto.append(linea).append('\n');
        }
        return resto.toString();
    }

    /**
     * Saca el texto de una respuesta normal, la que no viene por trozos.
     *
     * Lo entrega entero de una vez por el mismo canal que los trozos, para que
     * quien mira vea aparecer el texto igual --de golpe, eso si-- y el resto del
     * camino no tenga que enterarse de por donde vino.
     */
    static String contenidoDeUnaPieza(String cuerpo, ObjectMapper json, Consumer<String> porTrozo) {
        try {
            JsonNode texto = json.readTree(cuerpo)
                    .path("choices").path(0).path("message").path("content");

            if (texto.isMissingNode() || texto.asText().isBlank()) {
                throw new DrafterNoDisponibleException(
                        "La respuesta de Groq no traia texto en choices[0].message.content. "
                                + "Llego esto:\n  " + recortar(cuerpo));
            }

            porTrozo.accept(texto.asText());
            return texto.asText();

        } catch (DrafterNoDisponibleException e) {
            throw e;
        } catch (Exception e) {
            throw new DrafterNoDisponibleException(
                    "La respuesta de Groq no se pudo leer ni como flujo ni como respuesta "
                            + "normal. Llego esto:\n  " + recortar(cuerpo), e);
        }
    }

    /** Un trozo de texto que quepa en un mensaje de error sin llenar el log. */
    private static String recortar(String texto) {
        String limpio = texto == null ? "" : texto.strip();
        return limpio.length() > 400 ? limpio.substring(0, 400) + "..." : limpio;
    }

    /**
     * Junta el texto de un flujo SSE y va entregando cada trozo segun aparece.
     *
     * <p>Vive aparte, y recibe un lector en vez de una respuesta HTTP, para
     * poder probarlo con un flujo escrito a mano. Es la pieza nueva y la mas
     * quisquillosa de todo el adaptador --prefijos, lineas en blanco, el
     * centinela final, trozos sin contenido-- y la unica forma de comprobarla
     * sin llamar a Groq de verdad es esta.
     *
     * <p>El formato de OpenAI, que Groq copia: lineas {@code data: {...}} con un
     * trozo cada una, separadas por lineas vacias, y una ultima
     * {@code data: [DONE]}.
     */
    static String ensamblarSse(String primeraLinea, BufferedReader lector, ObjectMapper json,
                               Consumer<String> porTrozo) throws IOException {
        return ensamblarSse(primeraLinea, lector, json, porTrozo, new Diagnostico());
    }

    /**
     * Lo que se vio pasar por el flujo, para poder decir por que no trajo texto.
     *
     * <p>Antes, un flujo sin texto se contaba enseniando su primera linea, que
     * es siempre la misma: el saludo con el rol y el contenido vacio. No decia
     * nada. Lo que de verdad explica un flujo vacio esta en las demas: si el
     * modelo se paro por falta de espacio, si todo lo que escribio fue
     * razonamiento, o si Groq metio un error a mitad.
     */
    static final class Diagnostico {
        int lineas;
        int razonamiento;
        String motivoDeParada;
        String ultima;

        String porQueVinoVacio() {
            if ("length".equals(motivoDeParada)) {
                return "El modelo se quedo sin espacio antes de escribir la ficha"
                        + (razonamiento > 0 ? " (se le fue en " + razonamiento + " caracteres de razonamiento)" : "")
                        + ". Groq cerro con finish_reason=length.";
            }
            if (razonamiento > 0) {
                return "El modelo razono " + razonamiento + " caracteres pero no escribio la ficha"
                        + (motivoDeParada != null ? " (finish_reason=" + motivoDeParada + ")" : "") + ".";
            }
            return "Groq mando un flujo de " + lineas + " lineas sin texto dentro"
                    + (motivoDeParada != null ? " (finish_reason=" + motivoDeParada + ")" : "")
                    + ". La ultima fue:\n  " + recortar(ultima == null ? "" : ultima);
        }
    }

    static String ensamblarSse(String primeraLinea, BufferedReader lector, ObjectMapper json,
                               Consumer<String> porTrozo, Diagnostico visto) throws IOException {

        StringBuilder completo = new StringBuilder();

        // La primera linea la lee quien llama, para poder mirar si esto era de
        // verdad un flujo antes de recorrerlo como tal. Entra aqui igual que las
        // demas en vez de descartarse: en un flujo corto puede ser la unica que
        // traiga texto.
        for (String linea = primeraLinea; linea != null; linea = lector.readLine()) {
            // Lo que no sea data: son lineas en blanco, comentarios de
            // mantenimiento de la conexion y cabeceras de evento. Ninguna trae
            // texto, y tratarlas como si lo trajeran reventaria el parseo.
            if (!linea.startsWith("data:")) continue;

            String dato = linea.substring("data:".length()).trim();
            if (dato.isEmpty()) continue;
            if ("[DONE]".equals(dato)) break;

            visto.lineas++;
            visto.ultima = linea;
            JsonNode nodo = json.readTree(dato);

            // Groq mete los errores dentro del flujo cuando ya ha empezado a
            // responder: por ejemplo json_validate_failed, si lo que genero el
            // modelo no era JSON en modo json_object. Antes se saltaban como
            // cualquier linea sin texto y el fallo salia como "flujo vacio".
            JsonNode error = nodo.has("error") ? nodo.path("error") : nodo.path("x_groq").path("error");
            if (!error.isMissingNode() && !error.isNull()) {
                String codigo = error.path("code").asText("");
                String mensaje = error.path("message").asText(error.toString());
                throw new RespuestaIlegibleException(
                        "Groq corto la respuesta con un error"
                                + (codigo.isEmpty() ? "" : " (" + codigo + ")") + ": " + mensaje);
            }

            JsonNode opcion = nodo.path("choices").path(0);
            String parada = opcion.path("finish_reason").asText("");
            if (!parada.isEmpty() && !"null".equals(parada)) visto.motivoDeParada = parada;
            visto.razonamiento += opcion.path("delta").path("reasoning").asText("").length();

            String trozo = opcion.path("delta").path("content").asText("");

            // El primer fragmento solo trae el rol y el ultimo solo el motivo de
            // parada: los dos llegan sin contenido y no son texto. Los modelos
            // que razonan mandan ademas fragmentos con el razonamiento en otra
            // clave, que tampoco es la ficha.
            if (trozo.isEmpty()) continue;

            completo.append(trozo);
            porTrozo.accept(trozo);
        }

        return completo.toString();
    }

    /** Los modelos que razonan antes de responder y admiten reasoning_effort. */
    static boolean razonaDemasiado(String modelo) {
        return modelo != null && modelo.startsWith("openai/gpt-oss");
    }

    /** Convierte el texto generado en un borrador. */
    private ProjectDraft parsear(String contenido) {
        String limpio = quitarVallas(contenido);
        try {
            return json.readValue(limpio, ProjectDraft.class);
        } catch (Exception e) {
            throw new RespuestaIlegibleException(
                    "El modelo no devolvio un borrador con la forma esperada: "
                            + e.getClass().getSimpleName(), e);
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
