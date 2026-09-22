package com.juanbarrios.portfolio.application.usecase;

import com.juanbarrios.portfolio.domain.model.Project;
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
 * Editar desde un cliente que conoce pocos campos no puede borrar el resto.
 *
 * El formulario del panel de administracion maneja 13 de los 31 campos de un
 * proyecto. Con la actualizacion anterior, que reemplazaba el registro entero,
 * guardar desde ahi habria borrado los diagramas de arquitectura, el readme,
 * el stack estructurado y las metricas, sin ningun error que lo delatara.
 */
@SpringBootTest
class ActualizacionParcialTest {

    @Autowired
    private ProjectUseCase casoDeUso;

    @Autowired
    private ProjectJpaRepository repositorio;

    @Autowired
    private EntityManager entityManager;

    @Test
    @Transactional
    @DisplayName("una edicion parcial conserva los campos que el cliente no envia")
    void unaEdicionParcialConservaLoQueNoLlega() {
        Project completo = ProjectFixture.completo();
        completo.setId(null);
        Long id = repositorio.saveAndFlush(ProjectMapper.toEntity(completo)).getId();

        entityManager.flush();
        entityManager.clear();

        // Lo que enviaria el formulario del panel: solo los campos que conoce.
        Project delFormulario = new Project();
        delFormulario.setName("Gastu Django (editado)");
        delFormulario.setShortDescription("Descripcion nueva.");
        delFormulario.setStatus("Produccion");
        delFormulario.setYear(2026);
        delFormulario.setDisplayOrder(1);

        casoDeUso.updateProject(id, delFormulario);

        entityManager.flush();
        entityManager.clear();

        Project despues = ProjectMapper.toDomain(repositorio.findById(id).orElseThrow());

        // Lo enviado se aplica.
        assertEquals("Gastu Django (editado)", despues.getName());
        assertEquals("Descripcion nueva.", despues.getShortDescription());

        // Y lo que el formulario no conoce sigue ahi.
        assertNotNull(despues.getArchitectureNodes(), "se perdieron los nodos del diagrama");
        assertEquals(completo.getArchitectureNodes(), despues.getArchitectureNodes());
        assertEquals(completo.getArchitectureEdges(), despues.getArchitectureEdges());
        assertEquals(completo.getArchitectureLayout(), despues.getArchitectureLayout());
        assertEquals(completo.getReadmeMarkdown(), despues.getReadmeMarkdown());
        assertEquals(completo.getStructuredStack(), despues.getStructuredStack());
        assertEquals(completo.getStructuredFeatures(), despues.getStructuredFeatures());
        assertEquals(completo.getRawMetrics(), despues.getRawMetrics());
        assertEquals(completo.getChallenges(), despues.getChallenges());
        assertEquals(completo.getTechStack(), despues.getTechStack());
        assertEquals(completo.getLinks(), despues.getLinks());
        assertEquals(completo.getSlug(), despues.getSlug());
    }
}
