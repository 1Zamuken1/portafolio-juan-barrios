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

    /**
     * Las de arriba no pueden tener valor por defecto porque sin ellas la
     * aplicacion no debe arrancar. Pero hay credenciales que si lo admiten:
     * {@code groq.api-key} tiene un defecto vacio a proposito, para que el
     * backend siga en pie sin el redactor de borradores.
     *
     * Aun asi no puede llevar dentro un valor literal. Esta comprobacion es mas
     * ancha que la de arriba: mira cualquier clave que suene a credencial y
     * exige que lo que haya a la derecha empiece por un marcador de entorno,
     * tenga defecto o no.
     */
    @Test
    @DisplayName("ninguna clave que suene a credencial lleva un valor literal")
    void ningunaCredencialLlevaValorLiteral() throws IOException {
        Pattern sospechosa = Pattern.compile("(secret|password|api-key|apikey|token)",
                Pattern.CASE_INSENSITIVE);

        for (String linea : Files.readAllLines(CONFIG)) {
            String limpia = linea.trim();
            if (limpia.startsWith("#") || !limpia.contains("=")) continue;

            int igual = limpia.indexOf('=');
            String clave = limpia.substring(0, igual).trim();
            String valor = limpia.substring(igual + 1).trim();

            if (!sospechosa.matcher(clave).find()) continue;

            if (!valor.startsWith("${")) {
                fail("la clave " + clave + " parece una credencial y tiene un valor "
                        + "literal en " + CONFIG + ". Debe leerse del entorno.");
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
