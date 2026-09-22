package com.juanbarrios.portfolio.infrastructure.adapter.in.web;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * La ruta de salud debe responder sin autenticacion y sin tocar la base.
 */
@SpringBootTest
@AutoConfigureMockMvc
class HealthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("responde 200 sin credenciales")
    void respondeSinCredenciales() throws Exception {
        mockMvc.perform(get("/api/health")).andExpect(status().isOk());
    }

    @Test
    @DisplayName("render apunta su comprobacion a la ruta de salud, no a una de datos")
    void renderApuntaALaRutaDeSalud() throws IOException {
        Path blueprint = Path.of("..", "render.yaml");
        assertTrue(Files.exists(blueprint), "no se encuentra render.yaml");

        String contenido = Files.readString(blueprint);
        assertTrue(contenido.contains("healthCheckPath: /api/health"),
                "render.yaml debe comprobar /api/health. Apuntar la comprobacion a un "
                        + "endpoint de datos crea un punto muerto: si esa tabla se rompe, el "
                        + "despliegue que la arreglaria no llega a promoverse.");
    }
}
