package com.juanbarrios.portfolio.infrastructure.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Todo perfil con su propio motor debe declarar su dialecto.
 *
 * Los perfiles de Spring heredan de application.properties. El fichero base
 * fija el dialecto de SQLite, porque es de la comunidad y Hibernate no lo
 * autodetecta. Eso significa que cualquier perfil que use otro motor tiene
 * que anularlo, y olvidarlo no da error de arranque: la aplicacion levanta y
 * genera DDL del motor equivocado.
 *
 * Paso en produccion. El perfil render dejo de declarar el suyo y PostgreSQL
 * recibio un CREATE TABLE con columnas de tipo "clob". Las tablas sin
 * columnas JSON se crearon igual, porque varchar e integer valen en ambos
 * motores, asi que solo fallo una de tres y el servicio parecia sano.
 */
class DialectoNoFijadoTest {

    private static final String DIALECTO = "spring.jpa.database-platform";
    private static final String DATASOURCE_URL = "spring.datasource.url";

    private static final Path RECURSOS = Path.of("src/main/resources");

    @Test
    @DisplayName("cada perfil que define su datasource declara tambien su dialecto")
    void cadaPerfilConDatasourceDeclaraSuDialecto() throws IOException {
        List<Path> perfiles;
        try (var ficheros = Files.list(RECURSOS)) {
            perfiles = ficheros
                    .filter(f -> {
                        String n = f.getFileName().toString();
                        return n.startsWith("application-") && n.endsWith(".properties");
                    })
                    .toList();
        }

        assertTrue(declara(RECURSOS.resolve("application.properties"), DIALECTO),
                "el fichero base deberia declarar el dialecto de SQLite: es de la "
                        + "comunidad y Hibernate no lo autodetecta");

        for (Path perfil : perfiles) {
            // Los ficheros de ejemplo documentan, no configuran nada.
            if (perfil.getFileName().toString().endsWith(".example")) continue;

            if (declara(perfil, DATASOURCE_URL) && !declara(perfil, DIALECTO)) {
                fail(perfil.getFileName() + " apunta a otra base de datos pero no declara "
                        + DIALECTO + ". Heredaria el dialecto de SQLite del fichero base y "
                        + "generaria DDL del motor equivocado, sin fallar al arrancar.");
            }
        }
    }

    private static boolean declara(Path fichero, String clave) throws IOException {
        if (!Files.exists(fichero)) return false;
        for (String linea : Files.readAllLines(fichero)) {
            String limpia = linea.trim();
            if (!limpia.startsWith("#") && limpia.startsWith(clave + "=")) return true;
        }
        return false;
    }
}
