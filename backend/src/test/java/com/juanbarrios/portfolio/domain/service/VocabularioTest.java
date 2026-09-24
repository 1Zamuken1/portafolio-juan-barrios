package com.juanbarrios.portfolio.domain.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class VocabularioTest {

    @Test
    @DisplayName("los sinonimos van a su capa y el stack sale en su orden, sin repetir")
    void elStackSeNormaliza() {
        // Ordenado a proposito: el de entrada tiene "persistence" antes que
        // "database", y los dos son la misma capa.
        Map<String, List<String>> entrada = new java.util.LinkedHashMap<>();
        entrada.put("persistence", List.of("JSON"));
        entrada.put("Backend", List.of("Java", "Spring Boot"));
        entrada.put("database", List.of("MySQL", "JSON"));
        var s = Vocabulario.normalizarStack(entrada);
        assertEquals(List.of("backend", "database"), new ArrayList<>(s.keySet()));
        assertEquals(List.of("JSON", "MySQL"), s.get("database"), "juntas y sin repetir");
        assertNull(Vocabulario.capa("blockchain"));
    }

    @Test
    @DisplayName("un grupo comun escrito en ingles recupera su nombre; uno del dominio, su mayuscula")
    void losGruposSeNormalizan() {
        assertEquals("Arquitectura", Vocabulario.grupo("Architecture"));
        assertEquals("Interfaz", Vocabulario.grupo("user interface"));
        assertEquals("Seguridad", Vocabulario.grupo("Autenticación"));
        assertEquals("Finanzas", Vocabulario.grupo("finanzas"));
    }

    @Test
    @DisplayName("la copia en Java dice lo mismo que src/assets/data/vocabulario.json")
    void coincideConElDelFrontend() throws Exception {
        Path json = Path.of("..", "src", "assets", "data", "vocabulario.json");
        if (!Files.exists(json)) return; // el backend suelto, sin el frontend al lado
        JsonNode v = new ObjectMapper().readTree(Files.readString(json));

        List<String> capas = new ArrayList<>();
        v.get("stack").forEach(c -> {
            capas.add(c.get("clave").asText());
            List<String> sinonimos = new ArrayList<>();
            c.get("sinonimos").forEach(x -> sinonimos.add(x.asText()));
            assertEquals(sinonimos, Vocabulario.CAPAS.get(c.get("clave").asText()), c.get("clave").asText());
        });
        assertEquals(capas, new ArrayList<>(Vocabulario.CAPAS.keySet()));

        List<String> grupos = new ArrayList<>();
        v.get("caracteristicas").forEach(c -> {
            grupos.add(c.get("titulo").asText());
            List<String> sinonimos = new ArrayList<>();
            c.get("sinonimos").forEach(x -> sinonimos.add(x.asText()));
            assertEquals(sinonimos, Vocabulario.GRUPOS.get(c.get("titulo").asText()), c.get("titulo").asText());
        });
        assertEquals(grupos, new ArrayList<>(Vocabulario.GRUPOS.keySet()));
    }
}
