package com.juanbarrios.portfolio.infrastructure.adapter.out.persistence;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.juanbarrios.portfolio.domain.model.Project;
import com.juanbarrios.portfolio.infrastructure.adapter.out.persistence.mapper.ProjectMapper;
import com.juanbarrios.portfolio.infrastructure.adapter.out.persistence.repository.ProjectJpaRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * La ida y vuelta completa del espejo, sin HTTP: se toma el projects.json
 * real que consume el sitio, se deserializa, se guarda, se relee y se vuelve
 * a serializar. El resultado debe ser el mismo documento.
 *
 * Este es el test que impide que una sincronizacion borre en silencio los
 * diagramas de arquitectura, las secciones del readme o las metricas. El JSON
 * es hoy la unica copia completa del contenido: la base gratuita de Render se
 * elimino con todo dentro, y si un volcado saliera incompleto no habria de
 * donde recuperarlo.
 *
 * Se lee el fichero del frontend en vez de duplicarlo aqui a proposito: lo
 * que se verifica es justamente el contrato con ese fichero, y una copia se
 * desincronizaria del original sin avisar.
 */
@SpringBootTest
class MirrorRoundTripTest {

    private static final Path JSON_DEL_SITIO =
            Path.of("..", "src", "assets", "data", "projects.json");

    /**
     * El id queda fuera de la comparacion: lo asigna la base al insertar. El
     * script de espejo lo conserva por slug al escribir el fichero, para que
     * las URLs publicas no se renumeren.
     */
    private static final String CAMPO_VOLATIL = "id";

    @Autowired
    private ProjectJpaRepository repositorio;

    @Autowired
    private EntityManager entityManager;

    private final ObjectMapper json = new ObjectMapper()
            .setSerializationInclusion(JsonInclude.Include.NON_NULL);

    @Test
    @Transactional
    @DisplayName("el projects.json del sitio sobrevive el viaje completo por la base")
    void elJsonDelSitioSobreviveElViaje() throws IOException {
        assertTrue(Files.exists(JSON_DEL_SITIO),
                "no se encuentra " + JSON_DEL_SITIO.toAbsolutePath()
                        + ". Este test se ejecuta desde el modulo backend.");

        String original = Files.readString(JSON_DEL_SITIO);
        List<Project> proyectos = json.readValue(original, new TypeReference<>() {});
        assertTrue(proyectos.size() >= 4, "se esperaban al menos los cuatro casos de estudio");

        // Ida: dominio -> entidad -> base
        List<Long> ids = new ArrayList<>();
        for (Project p : proyectos) {
            p.setId(null);
            ids.add(repositorio.saveAndFlush(ProjectMapper.toEntity(p)).getId());
        }

        // Sin esto se releeria de la cache de primer nivel y no se comprobaria
        // que las columnas JSON se deserializan bien.
        entityManager.flush();
        entityManager.clear();

        // Vuelta: base -> entidad -> dominio -> JSON
        List<Project> recuperados = new ArrayList<>();
        for (Long id : ids) {
            recuperados.add(ProjectMapper.toDomain(repositorio.findById(id).orElseThrow()));
        }

        List<Map<String, Object>> esperado = comoArbol(original);
        List<Map<String, Object>> obtenido = comoArbol(json.writeValueAsString(recuperados));

        assertEquals(esperado.size(), obtenido.size(), "se perdio algun proyecto por el camino");

        for (int i = 0; i < esperado.size(); i++) {
            Map<String, Object> antes = esperado.get(i);
            Map<String, Object> despues = obtenido.get(i);
            String nombre = String.valueOf(antes.get("name"));

            // Primero el detalle campo a campo: si algo falla, el mensaje dice
            // cual, en vez de volcar dos documentos de mil lineas.
            for (String clave : antes.keySet()) {
                assertEquals(antes.get(clave), despues.get(clave),
                        "el proyecto " + nombre + " no conserva el campo " + clave);
            }
            assertEquals(antes.keySet(), despues.keySet(),
                    "el proyecto " + nombre + " gana o pierde campos en el viaje");
        }
    }

    /** Arbol de Map y List, con los numeros normalizados por Jackson. */
    private List<Map<String, Object>> comoArbol(String texto) throws IOException {
        List<Map<String, Object>> arbol = json.readValue(texto, new TypeReference<>() {});
        for (Map<String, Object> proyecto : arbol) {
            proyecto.remove(CAMPO_VOLATIL);
        }
        return arbol;
    }
}
