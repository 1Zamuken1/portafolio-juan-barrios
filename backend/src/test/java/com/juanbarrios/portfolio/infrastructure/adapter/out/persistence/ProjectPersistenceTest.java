package com.juanbarrios.portfolio.infrastructure.adapter.out.persistence;

import com.juanbarrios.portfolio.domain.model.Project;
import com.juanbarrios.portfolio.infrastructure.adapter.out.persistence.entity.ProjectEntity;
import com.juanbarrios.portfolio.infrastructure.adapter.out.persistence.mapper.ProjectMapper;
import com.juanbarrios.portfolio.infrastructure.adapter.out.persistence.repository.ProjectJpaRepository;
import com.juanbarrios.portfolio.testsupport.ProjectFixture;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * Comprueba que los campos con forma de documento sobreviven el viaje a la
 * base de datos: diagramas, mapas con claves arbitrarias y metricas con
 * valores de tipos mezclados.
 *
 * El contexto de persistencia se vacia entre la escritura y la lectura. Sin
 * eso, findById devuelve la misma instancia que acabamos de guardar desde la
 * cache de primer nivel y el test pasaria sin haber deserializado nada, que
 * es justo lo que se quiere verificar.
 */
@SpringBootTest
class ProjectPersistenceTest {

    @Autowired
    private ProjectJpaRepository repositorio;

    @Autowired
    private EntityManager entityManager;

    @Test
    @Transactional
    @DisplayName("un proyecto completo sobrevive el viaje a las columnas JSON")
    void proyectoCompletoSobreviveElViaje() {
        Project original = ProjectFixture.completo();
        original.setId(null); // lo asigna la base

        ProjectEntity guardada = repositorio.saveAndFlush(ProjectMapper.toEntity(original));
        Long id = guardada.getId();
        assertNotNull(id);

        entityManager.flush();
        entityManager.clear();

        Project recuperado = ProjectMapper.toDomain(repositorio.findById(id).orElseThrow());

        assertEquals(original.getArchitectureNodes(), recuperado.getArchitectureNodes(),
                "los nodos del diagrama deberian volver intactos");
        assertEquals(original.getArchitectureEdges(), recuperado.getArchitectureEdges(),
                "las aristas, incluidos los vertices explicitos, deberian volver intactas");
        assertEquals(original.getArchitectureLayout(), recuperado.getArchitectureLayout(),
                "el lienzo deberia volver intacto");
        assertEquals(original.getStructuredStack(), recuperado.getStructuredStack(),
                "las claves arbitrarias del stack deberian conservarse");
        assertEquals(original.getRawMetrics(), recuperado.getRawMetrics(),
                "las metricas mezclan texto y numeros: ambos deberian conservar su tipo");
        assertEquals(original.getReadmeMarkdown(), recuperado.getReadmeMarkdown(),
                "las secciones del readme deberian volver intactas");
        assertEquals(original.getChallenges(), recuperado.getChallenges(),
                "los desafios deberian volver intactos");
        assertEquals(original.getTechStack(), recuperado.getTechStack(),
                "el stack con iconos deberia volver intacto");
        assertEquals(original.getLinks(), recuperado.getLinks(),
                "los enlaces deberian volver intactos, con live a null incluido");
        assertEquals(original.getKeywords(), recuperado.getKeywords(),
                "las listas simples ya no usan separador de texto");
    }
}
