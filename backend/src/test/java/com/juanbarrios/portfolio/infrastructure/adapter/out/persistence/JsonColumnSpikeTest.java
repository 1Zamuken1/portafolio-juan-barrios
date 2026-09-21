package com.juanbarrios.portfolio.infrastructure.adapter.out.persistence;

import com.juanbarrios.portfolio.infrastructure.adapter.out.persistence.entity.ProjectEntity;
import com.juanbarrios.portfolio.infrastructure.adapter.out.persistence.repository.ProjectJpaRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * Sondeo del mapeo a columnas JSON.
 *
 * Los campos ricos del portafolio (nodos del diagrama, metricas, stack
 * estructurado) son documentos con claves arbitrarias. Antes de modelarlos
 * todos hay que confirmar que Hibernate los sabe guardar y recuperar en las
 * dos bases que usa el proyecto: SQLite aqui y PostgreSQL en produccion.
 */
@SpringBootTest
class JsonColumnSpikeTest {

    @Autowired
    private ProjectJpaRepository repositorio;

    @Test
    @Transactional
    @DisplayName("una lista se guarda y se recupera desde una columna JSON")
    void listaSobreviveElViajeALaBaseDeDatos() {
        ProjectEntity entidad = new ProjectEntity();
        entidad.setName("Sondeo");
        entidad.setKeywords(List.of("java", "spring", "arquitectura hexagonal"));

        Long id = repositorio.saveAndFlush(entidad).getId();
        assertNotNull(id, "la entidad deberia haberse guardado");

        ProjectEntity recuperada = repositorio.findById(id).orElseThrow();
        assertEquals(
                List.of("java", "spring", "arquitectura hexagonal"),
                recuperada.getKeywords(),
                "la lista deberia volver intacta de la columna JSON"
        );
    }
}
