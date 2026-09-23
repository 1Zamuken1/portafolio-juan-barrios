package com.juanbarrios.portfolio.infrastructure.adapter.out.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.juanbarrios.portfolio.domain.port.out.DrafterNoDisponibleException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * La salida de emergencia: Groq contesto de una pieza pese a pedirle un flujo.
 *
 * Pasó de verdad. El lector de SSE recorrió el cuerpo entero sin reconocer una
 * sola línea y lo único que se pudo decir fue «respondió sin contenido
 * generado» —el mismo tipo de mensaje que ya costó una hora el día que
 * retiraron un modelo—. Que el dibujo salga más pobre no es motivo para no dar
 * un resultado, así que una respuesta normal se lee como lo que es.
 */
class RespuestaDeUnaPiezaTest {

    private static final ObjectMapper JSON = new ObjectMapper();

    private static final String NORMAL = """
            {"choices":[{"message":{"role":"assistant","content":"{\\"name\\":\\"Gastu\\"}"}}]}""";

    @Test
    @DisplayName("una respuesta normal se lee igual que un flujo")
    void unaRespuestaNormalSeLee() {
        List<String> trozos = new ArrayList<>();
        String texto = GroqProjectDrafter.contenidoDeUnaPieza(NORMAL, JSON, trozos::add);

        assertEquals("{\"name\":\"Gastu\"}", texto);
        // Sale por el mismo canal que los trozos --entero de una vez-- para que
        // el resto del camino no tenga que enterarse de por donde vino.
        assertEquals(List.of("{\"name\":\"Gastu\"}"), trozos);
    }

    @Test
    @DisplayName("si no trae texto, el error dice que llego en su lugar")
    void siNoTraeTextoLoDice() {
        // Lo que de verdad se compra aqui: un mensaje que no obliga a adivinar.
        String sinContenido = "{\"choices\":[{\"message\":{\"role\":\"assistant\"}}]}";

        DrafterNoDisponibleException e = assertThrows(DrafterNoDisponibleException.class,
                () -> GroqProjectDrafter.contenidoDeUnaPieza(sinContenido, JSON, t -> { }));

        assertTrue(e.getMessage().contains("choices[0].message.content"), e.getMessage());
        assertTrue(e.getMessage().contains("assistant"),
                "el mensaje deberia traer lo que llego, y dijo: " + e.getMessage());
    }

    @Test
    @DisplayName("si no es ni JSON, tambien ensenia lo que llego")
    void siNoEsNiJsonLoEnsenia() {
        DrafterNoDisponibleException e = assertThrows(DrafterNoDisponibleException.class,
                () -> GroqProjectDrafter.contenidoDeUnaPieza(
                        "<html>502 Bad Gateway</html>", JSON, t -> { }));

        assertTrue(e.getMessage().contains("502 Bad Gateway"), e.getMessage());
    }

    @Test
    @DisplayName("un cuerpo enorme se recorta antes de entrar en el mensaje")
    void unCuerpoEnormeSeRecorta() {
        // El mensaje va al panel y al log. Volcar treinta kilobytes ahi hace el
        // error menos legible, no mas.
        DrafterNoDisponibleException e = assertThrows(DrafterNoDisponibleException.class,
                () -> GroqProjectDrafter.contenidoDeUnaPieza("x".repeat(30_000), JSON, t -> { }));

        assertTrue(e.getMessage().length() < 1_000,
                "el mensaje media " + e.getMessage().length());
        assertTrue(e.getMessage().contains("..."), e.getMessage());
    }
}
