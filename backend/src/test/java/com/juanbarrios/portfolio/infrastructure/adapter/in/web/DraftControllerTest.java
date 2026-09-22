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

import java.util.List;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
        given(drafter.draft(anyString(), anyString())).willReturn(borradorValido());

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
        given(drafter.draft(anyString(), anyString())).willReturn(new ProjectDraft(
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
                .given(drafter).draft(anyString(), anyString());

        mockMvc.perform(post("/api/projects/draft")
                        .with(user("admin"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpo(README)))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.error").exists());
    }
}
