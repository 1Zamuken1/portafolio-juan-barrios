package com.juanbarrios.portfolio.infrastructure.adapter.out.ai;

import com.juanbarrios.portfolio.domain.port.out.DrafterNoDisponibleException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Lo que se puede probar del adaptador sin salir a la red.
 */
class GroqProjectDrafterTest {

    private static GroqProjectDrafter conClave(String clave) {
        return new GroqProjectDrafter(clave, "modelo-de-prueba", "https://ejemplo.invalid/v1");
    }

    /**
     * El cuerpo exacto con el que Groq anuncia un modelo retirado. Es el que
     * devolvio de verdad cuando llama-3.3-70b-versatile dejo de existir.
     */
    private static final String RETIRADO = """
            {"error":{"message":"The model `llama-3.3-70b-versatile` does not exist \
            or you do not have access to it.","type":"invalid_request_error",\
            "code":"model_not_found"}}""";

    @Test
    @DisplayName("un modelo retirado se reconoce por el codigo de Groq")
    void unModeloRetiradoSeReconoce() {
        assertTrue(GroqProjectDrafter.esModeloRetirado(404, RETIRADO));
    }

    @Test
    @DisplayName("tambien se reconoce si falta el codigo y solo viene el texto")
    void seReconocePorElTextoSiFaltaElCodigo() {
        // Sin esta red, un cambio de formato en la respuesta pararia la cadena
        // de reserva justo el dia que hace falta.
        assertTrue(GroqProjectDrafter.esModeloRetirado(404,
                "{\"error\":{\"message\":\"The model foo does not exist\"}}"));
    }

    @Test
    @DisplayName("otros 404 no se confunden con un modelo retirado")
    void otros404NoSeConfunden() {
        // Un 404 por la URL base mal puesta no debe consumir la lista de
        // reserva probando modelos que nunca van a responder.
        assertFalse(GroqProjectDrafter.esModeloRetirado(404, "<html>404 Not Found</html>"));
        assertFalse(GroqProjectDrafter.esModeloRetirado(401, RETIRADO));
    }

    @Test
    @DisplayName("la lista de modelos se parte por comas y tolera espacios")
    void laListaDeModelosSeParte() {
        assertEquals(
                List.of("openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.6-27b"),
                GroqProjectDrafter.separarModelos(
                        " openai/gpt-oss-120b , openai/gpt-oss-20b ,, qwen/qwen3.6-27b "));
    }

    @Test
    @DisplayName("un solo modelo sigue siendo una lista de uno")
    void unSoloModeloSigueValiendo() {
        assertEquals(List.of("openai/gpt-oss-120b"),
                GroqProjectDrafter.separarModelos("openai/gpt-oss-120b"));
    }

    @Test
    @DisplayName("sin ningun modelo configurado se avisa en vez de llamar a ciegas")
    void sinModeloConfiguradoSeAvisa() {
        GroqProjectDrafter sinModelo =
                new GroqProjectDrafter("clave-cualquiera", "  ,  ", "https://ejemplo.invalid/v1");

        DrafterNoDisponibleException e = assertThrows(DrafterNoDisponibleException.class,
                () -> sinModelo.draft("Gastu", "texto"));
        assertTrue(e.getMessage().contains("GROQ_MODEL"), e.getMessage());
    }

    @Test
    @DisplayName("sin clave configurada avisa de eso y no intenta llamar")
    void sinClaveAvisaYNoLlama() {
        // Importa el mensaje: si esto saliera como un error de red generico,
        // la causa real --una variable de entorno sin definir en Render-- seria
        // lo ultimo que se mirase.
        DrafterNoDisponibleException e = assertThrows(DrafterNoDisponibleException.class,
                () -> conClave("").draft("Gastu", "texto"));
        assertTrue(e.getMessage().contains("GROQ_API_KEY"), e.getMessage());
    }

    @Test
    @DisplayName("una clave que es solo espacios cuenta como no configurada")
    void unaClaveEnBlancoCuentaComoNoConfigurada() {
        assertThrows(DrafterNoDisponibleException.class,
                () -> conClave("   ").draft("Gastu", "texto"));
    }

    @Test
    @DisplayName("se quitan las vallas de codigo si el modelo envuelve el JSON")
    void seQuitanLasVallasDeCodigo() {
        String envuelto = "```json\n{\"shortDescription\":\"hola\"}\n```";
        assertEquals("{\"shortDescription\":\"hola\"}",
                GroqProjectDrafter.quitarVallas(envuelto));
    }

    @Test
    @DisplayName("un JSON sin vallas se deja tal cual")
    void unJsonSinVallasSeDejaIgual() {
        String limpio = "{\"shortDescription\":\"hola\"}";
        assertEquals(limpio, GroqProjectDrafter.quitarVallas(limpio));
    }

    /**
     * Un 404 de Groq salia como "NotFound" a secas porque el cuerpo del error
     * se ocultaba a proposito. Con eso, un modelo retirado, una URL mal puesta
     * y una ruta inexistente se veian identicos, y se busco la causa en la
     * clave y en el despliegue antes que en el modelo. Es el mismo fallo que
     * el 403 vacio de /error.
     *
     * Ahora el cuerpo siempre viaja en el mensaje, sea cual sea el estado.
     */
    @Test
    @DisplayName("el mensaje lleva siempre lo que dijo Groq")
    void elMensajeLlevaLoQueDijoGroq() {
        assertTrue(GroqProjectDrafter.pista(404, RETIRADO).contains("does not exist"),
                "sin esto, la causa real queda invisible");
    }

    @Test
    @DisplayName("un 404 que no es un modelo retirado apunta a la URL base")
    void un404QueNoEsModeloApuntaALaUrl() {
        // Los modelos retirados no llegan a pista(): se desvian antes para
        // probar el siguiente de la lista. Lo que llega aqui es otra cosa.
        String pista = GroqProjectDrafter.pista(404, "<html>404 Not Found</html>");
        assertTrue(pista.contains("GROQ_BASE_URL"), pista);
    }

    @Test
    @DisplayName("un 401 apunta a la clave, no al modelo")
    void un401ApuntaALaClave() {
        String pista = GroqProjectDrafter.pista(401, "{\"error\":{\"message\":\"Invalid API Key\"}}");
        assertTrue(pista.contains("GROQ_API_KEY"), pista);
        assertTrue(pista.contains("Invalid API Key"), pista);
    }

    @Test
    @DisplayName("un cuerpo que no es JSON se devuelve tal cual en vez de perderse")
    void unCuerpoQueNoEsJsonNoSePierde() {
        String pista = GroqProjectDrafter.pista(500, "<html>Bad Gateway</html>");
        assertTrue(pista.contains("Bad Gateway"), pista);
    }

    @Test
    @DisplayName("una respuesta sin cuerpo lo dice en vez de quedarse en blanco")
    void unaRespuestaSinCuerpoLoDice() {
        assertTrue(GroqProjectDrafter.pista(502, "").contains("sin cuerpo"));
    }
}
