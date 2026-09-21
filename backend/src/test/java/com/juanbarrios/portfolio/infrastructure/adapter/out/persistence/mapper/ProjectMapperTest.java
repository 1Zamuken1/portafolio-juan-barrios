package com.juanbarrios.portfolio.infrastructure.adapter.out.persistence.mapper;

import com.juanbarrios.portfolio.domain.model.Project;
import com.juanbarrios.portfolio.infrastructure.adapter.out.persistence.entity.ProjectEntity;
import com.juanbarrios.portfolio.testsupport.ProjectFixture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * El mapeo se comprueba por reflexion y no campo a campo a proposito.
 *
 * El riesgo de este mapper no es equivocarse en una traduccion, es olvidar un
 * campo: el valor se pierde en silencio y no hay error en ningun sitio. Con
 * los diagramas de arquitectura en juego, eso significa borrar el contenido
 * del portafolio sin enterarse. Recorriendo los campos por reflexion, el dia
 * que alguien anada el campo 29 al dominio, este test falla solo si no lo
 * mapea.
 */
class ProjectMapperTest {

    @Test
    @DisplayName("ningun campo se pierde en el viaje dominio -> entidad -> dominio")
    void ningunCampoSePierdeEnElViaje() throws IllegalAccessException {
        Project original = ProjectFixture.completo();

        // Antes de nada: la plantilla debe tener todos los campos poblados, o
        // el test daria por buenos campos que en realidad no viaja nadie.
        List<String> sinPoblar = camposNulos(original);
        assertTrue(sinPoblar.isEmpty(),
                "la plantilla de pruebas deja campos sin poblar, asi no se puede verificar nada: " + sinPoblar);

        ProjectEntity entidad = ProjectMapper.toEntity(original);
        Project vuelta = ProjectMapper.toDomain(entidad);

        List<String> perdidos = camposNulos(vuelta);
        assertTrue(perdidos.isEmpty(), "el mapper pierde estos campos: " + perdidos);

        for (Field campo : Project.class.getDeclaredFields()) {
            campo.setAccessible(true);
            assertEquals(campo.get(original), campo.get(vuelta),
                    "el campo " + campo.getName() + " no sobrevive el viaje");
        }
    }

    /** Campos de referencia que quedaron a null; los primitivos no aplican. */
    private static List<String> camposNulos(Project proyecto) throws IllegalAccessException {
        List<String> nulos = new ArrayList<>();
        for (Field campo : Project.class.getDeclaredFields()) {
            if (campo.getType().isPrimitive()) continue;
            campo.setAccessible(true);
            if (campo.get(proyecto) == null) nulos.add(campo.getName());
        }
        return nulos;
    }
}
