package com.juanbarrios.portfolio.infrastructure.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Un fallo tiene que llegar al cliente como lo que es.
 *
 * Spring reenvia internamente a /error cuando algo va mal. Si esa ruta exige
 * autenticacion, la respuesta que sale es un 403 vacio y la causa real queda
 * oculta: un cuerpo mal formado, una ruta inexistente y una excepcion de
 * persistencia se ven identicos desde fuera.
 *
 * Paso de verdad, dos veces en la misma sesion: un 403 en el login que
 * parecia un problema de credenciales resulto ser un JSON roto, y un 403 en
 * GET /api/projects que parecia un problema de permisos era un fallo al leer
 * la base.
 */
@SpringBootTest
@AutoConfigureMockMvc
class ErroresVisiblesTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("una ruta inexistente responde 404, no 403")
    void rutaInexistenteDevuelve404() throws Exception {
        mockMvc.perform(get("/api/no-existe"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("un cuerpo mal formado responde 400, no 403")
    void cuerpoMalFormadoDevuelve400() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"x\",\"password\":}"))
                .andExpect(status().isBadRequest());
    }
}
