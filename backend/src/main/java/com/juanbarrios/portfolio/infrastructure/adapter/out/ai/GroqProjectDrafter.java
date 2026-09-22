package com.juanbarrios.portfolio.infrastructure.adapter.out.ai;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.juanbarrios.portfolio.domain.model.ProjectDraft;
import com.juanbarrios.portfolio.domain.port.out.DrafterNoDisponibleException;
import com.juanbarrios.portfolio.domain.port.out.ProjectDrafterPort;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Duration;
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
 * JSON sintacticamente valido. Lo que NO garantiza es que tenga los campos que
 * pedimos ni que esten rellenos: el modo de esquema estricto solo esta
 * disponible en unos pocos modelos y no en el que usamos por defecto. Por eso
 * el caso de uso valida lo que sale de aqui.
 *
 * <p><b>Sobre la clave.</b> Si no esta definida, este adaptador falla al
 * llamarlo, no al arrancar. Es deliberado y distinto de lo que hace
 * {@code jwt.secret}, que si impide el arranque: sin JWT no hay panel de
 * administracion, pero sin clave de Groq el portafolio entero funciona
 * exactamente igual y solo deja de estar disponible un boton.
 */
@Component
public class GroqProjectDrafter implements ProjectDrafterPort {

    private final String apiKey;
    private final String modelo;
    private final RestClient http;

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
            @Value("${groq.model:llama-3.3-70b-versatile}") String modelo,
            @Value("${groq.base-url:https://api.groq.com/openai/v1}") String baseUrl) {

        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.modelo = modelo;

        // Un modelo de 70B redactando ~2000 caracteres tarda bastante mas que
        // una peticion normal, pero tampoco puede quedarse colgado para siempre
        // ocupando un hilo del servidor.
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

        String contenido = pedirRespuesta(nombre, readme);
        return parsear(contenido);
    }

    /** Hace la llamada y devuelve el texto que genero el modelo. */
    private String pedirRespuesta(String nombre, String readme) {
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
        } catch (Exception e) {
            // Se envuelve sin incluir el mensaje original tal cual: las
            // respuestas de error de una API pueden llevar dentro la cabecera
            // de autorizacion de la peticion que fallo.
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
