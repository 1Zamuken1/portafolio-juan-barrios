package com.juanbarrios.portfolio.infrastructure.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Impide que un secreto vuelva a quedarse escrito en la configuracion.
 *
 * El fichero se lee del sistema de ficheros y no del classpath a proposito:
 * src/test/resources/application.properties tiene el mismo nombre y tapa al de
 * main, asi que por classpath se leeria el de pruebas y la comprobacion no
 * valdria de nada. Surefire ejecuta con el directorio del modulo como raiz.
 */
class SecretsNotHardcodedTest {

    private static final Path CONFIG = Path.of("src/main/resources/application.properties");

    /** Claves que solo pueden venir del entorno, sin valor por defecto. */
    private static final List<String> CLAVES_SENSIBLES =
            List.of("jwt.secret", "admin.username", "admin.password");

    @Test
    @DisplayName("las claves sensibles se leen del entorno y no traen valor por defecto")
    void clavesSensiblesVienenDelEntorno() throws IOException {
        assertTrue(Files.exists(CONFIG), "no se encuentra " + CONFIG.toAbsolutePath());
        List<String> lineas = Files.readAllLines(CONFIG);

        for (String clave : CLAVES_SENSIBLES) {
            String valor = valorDe(lineas, clave);
            if (valor == null) {
                fail("falta la clave " + clave + " en " + CONFIG);
            }

            // Debe ser exactamente un marcador de entorno: ${ALGO}
            Pattern soloMarcador = Pattern.compile("^\\$\\{[A-Z0-9_]+}$");
            if (!soloMarcador.matcher(valor).matches()) {
                fail("la clave " + clave + " debe leerse del entorno como ${VARIABLE}, "
                        + "sin valor por defecto ni literal. Valor encontrado: " + valor);
            }
        }
    }

    private static String valorDe(List<String> lineas, String clave) {
        for (String linea : lineas) {
            String limpia = linea.trim();
            if (limpia.startsWith("#") || !limpia.startsWith(clave + "=")) {
                continue;
            }
            return limpia.substring(clave.length() + 1).trim();
        }
        return null;
    }
}
