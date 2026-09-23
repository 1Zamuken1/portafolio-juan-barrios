package com.juanbarrios.portfolio.infrastructure.adapter.in.web;

import com.juanbarrios.portfolio.domain.model.Challenge;
import com.juanbarrios.portfolio.domain.model.ProjectDraft;
import com.juanbarrios.portfolio.domain.model.ReadmeMarkdown;
import com.juanbarrios.portfolio.domain.port.out.DrafterNoDisponibleException;
import com.juanbarrios.portfolio.domain.port.out.ProjectDrafterPort;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * El endpoint de borradores, visto desde fuera.
 *
 * Lo que mas importa aqui es que no se pueda llamar sin autenticar: cada
 * peticion gasta cuota de pago, asi que dejarlo abierto no seria una fuga de
 * informacion sino una factura.
 *
 * El proveedor esta sustituido por un doble. CI no tiene clave de Groq.
 */
@SpringBootTest
@AutoConfigureMockMvc
class DraftControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ProjectDrafterPort drafter;

    /** Un readme cualquiera que pase el minimo de longitud del caso de uso. */
    private static final String README = "# Gastu, gestor de finanzas\\n".repeat(20);

    private static String cuerpo(String readme) {
        return "{\"name\":\"Gastu\",\"readme\":\"" + readme + "\"}";
    }

    private static ProjectDraft borradorValido() {
        return new ProjectDraft(
                "Gestor de finanzas personales construido con Django.",
                "Una aplicacion que centraliza ingresos, gastos y presupuestos, "
                        + "con informes mensuales y exportacion a varios formatos. "
                        + "Pensada para uso individual, sobre una base relacional.",
                new ReadmeMarkdown(
                        "Centralizar el control de las finanzas personales en una sola "
                                + "herramienta, sin depender de hojas de calculo sueltas.",
                        "Django con aplicaciones separadas por dominio, una capa de "
                                + "servicios y persistencia relacional sobre PostgreSQL.",
                        "Registro de movimientos, presupuestos por categoria, informes "
                                + "mensuales y exportacion a Excel, PDF y CSV.",
                        "Django y PostgreSQL, con plantillas del lado del servidor y "
                                + "sin ningun framework de frontend.",
                        "La separacion por aplicaciones simplifico las pruebas y dejo "
                                + "claro donde vivia cada regla de negocio."),
                List.of(
                        new Challenge("Exportacion a multiples formatos",
                                "Unificar la generacion de Excel, PDF y CSV tras una sola interfaz."),
                        new Challenge("Calculo de presupuestos",
                                "Mantener los totales consistentes al editar movimientos pasados.")));
    }

    @Test
    @DisplayName("sin autenticar no se puede gastar cuota")
    void sinAutenticarNoSePuedeGastarCuota() throws Exception {
        mockMvc.perform(post("/api/projects/draft")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpo(README)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("autenticado devuelve el borrador")
    void autenticadoDevuelveElBorrador() throws Exception {
        given(drafter.draft(anyString(), anyString(), any())).willReturn(borradorValido());

        mockMvc.perform(post("/api/projects/draft")
                        .with(user("admin"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpo(README)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.readmeMarkdown.learnings").exists())
                .andExpect(jsonPath("$.challenges.length()").value(2));
    }

    @Test
    @DisplayName("un borrador que no sirve sale como 422, no como 500")
    void unBorradorQueNoSirveSaleComo422() throws Exception {
        // Al modelo se le olvido una seccion. Es un caso esperado, no un fallo
        // del servidor: quien usa el panel tiene que poder distinguirlo.
        ProjectDraft v = borradorValido();
        given(drafter.draft(anyString(), anyString(), any())).willReturn(new ProjectDraft(
                v.shortDescription(), v.fullDescription(),
                new ReadmeMarkdown(v.readmeMarkdown().objective(),
                        v.readmeMarkdown().architecture(),
                        v.readmeMarkdown().mainFeatures(),
                        v.readmeMarkdown().technologies(),
                        null),
                v.challenges()));

        mockMvc.perform(post("/api/projects/draft")
                        .with(user("admin"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpo(README)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    @DisplayName("si el proveedor no responde sale como 503")
    void siElProveedorNoRespondeSaleComo503() throws Exception {
        willThrow(new DrafterNoDisponibleException("Groq no responde"))
                .given(drafter).draft(anyString(), anyString(), any());

        mockMvc.perform(post("/api/projects/draft")
                        .with(user("admin"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpo(README)))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.error").exists());
    }

    // ── El endpoint en streaming ──────────────────────────────────────────

    @Test
    @DisplayName("el streaming tampoco se puede llamar sin autenticar")
    void elStreamingTampocoSeAbre() throws Exception {
        // Gasta la misma cuota que el otro. Tener dos puertas y proteger solo
        // una es la forma habitual de que la nueva se quede abierta.
        mockMvc.perform(post("/api/projects/draft/stream")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpo(README)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("el streaming va contando las etapas y termina con el borrador")
    void elStreamingCuentaLasEtapas() throws Exception {
        // El doble avisa como lo haria el adaptador real, para comprobar que
        // los avisos llegan hasta el cuerpo y no se quedan por el camino.
        given(drafter.draft(anyString(), anyString(), any())).willAnswer(llamada -> {
            com.juanbarrios.portfolio.domain.port.out.AvisoDeEtapa aviso = llamada.getArgument(2);
            aviso.avisar("modelo", "Consultando un-modelo");
            aviso.avisar("respuesta", "un-modelo respondio 100 caracteres en 1,0 s");
            aviso.avisar("parseo", "El JSON tiene la forma esperada");
            return borradorValido();
        });

        String cuerpo = ejecutarStream();

        assertTrue(cuerpo.contains("\"etapa\":\"entrada\""), cuerpo);
        assertTrue(cuerpo.contains("\"etapa\":\"modelo\""), cuerpo);
        assertTrue(cuerpo.contains("\"etapa\":\"respuesta\""), cuerpo);
        assertTrue(cuerpo.contains("\"etapa\":\"validacion\""), cuerpo);
        assertTrue(cuerpo.contains("\"etapa\":\"fin\""), cuerpo);
        assertTrue(cuerpo.contains("learnings"), "el borrador viaja en la ultima linea: " + cuerpo);
    }

    @Test
    @DisplayName("en streaming el fallo viaja en el cuerpo, no en el codigo de estado")
    void enStreamingElFalloViajaEnElCuerpo() throws Exception {
        // Para cuando falla ya se mandaron los 200 y las cabeceras. Si la
        // interfaz mirara el estado veria un exito donde no lo hubo, asi que la
        // linea de error tiene que distinguir igual que lo hacen el 422 y el
        // 503: se reintenta, o solo se espera.
        willThrow(new DrafterNoDisponibleException("Groq no responde"))
                .given(drafter).draft(anyString(), anyString(), any());

        String cuerpo = ejecutarStream();

        assertTrue(cuerpo.contains("\"etapa\":\"error\""), cuerpo);
        assertTrue(cuerpo.contains("\"tipo\":\"nodisponible\""), cuerpo);
        assertTrue(cuerpo.contains("Groq no responde"), cuerpo);
        assertTrue(!cuerpo.contains("\"etapa\":\"fin\""), "no hubo borrador: " + cuerpo);
    }

    /** Lanza la peticion en streaming y devuelve el cuerpo entero ya cerrado. */
    private String ejecutarStream() throws Exception {
        MvcResult resultado = mockMvc.perform(post("/api/projects/draft/stream")
                        .with(user("admin"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpo(README)))
                .andExpect(request().asyncStarted())
                .andReturn();

        return mockMvc.perform(asyncDispatch(resultado))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
    }
}
