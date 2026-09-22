package com.juanbarrios.portfolio.infrastructure.adapter.out.ai;

import com.juanbarrios.portfolio.domain.port.out.DrafterNoDisponibleException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Lo que se puede probar del adaptador sin salir a la red.
 */
class GroqProjectDrafterTest {

    private static GroqProjectDrafter conClave(String clave) {
        return new GroqProjectDrafter(clave, "modelo-de-prueba", "https://ejemplo.invalid/v1");
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
     */
    @Test
    @DisplayName("un 404 dice que el modelo no existe y donde cambiarlo")
    void un404ExplicaQueEsElModelo() {
        String cuerpoDeGroq = """
                {"error":{"message":"The model `llama-3.3-70b-versatile` does not exist \
                or you do not have access to it.","type":"invalid_request_error",\
                "code":"model_not_found"}}""";

        String pista = GroqProjectDrafter.pista(404, cuerpoDeGroq);

        assertTrue(pista.contains("does not exist"),
                "debe incluir lo que dijo Groq, y dijo: " + pista);
        assertTrue(pista.contains("GROQ_MODEL"),
                "debe decir donde se cambia el modelo, y dijo: " + pista);
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
