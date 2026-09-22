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
}
