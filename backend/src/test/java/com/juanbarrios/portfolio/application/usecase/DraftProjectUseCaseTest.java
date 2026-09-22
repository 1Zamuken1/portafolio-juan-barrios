package com.juanbarrios.portfolio.application.usecase;

import com.juanbarrios.portfolio.domain.model.Challenge;
import com.juanbarrios.portfolio.domain.model.ProjectDraft;
import com.juanbarrios.portfolio.domain.model.ReadmeMarkdown;
import com.juanbarrios.portfolio.domain.port.out.DrafterNoDisponibleException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Lo que devuelve el redactor no es de fiar y este test lo trata como tal.
 *
 * El modelo que usamos no soporta el modo de esquema estricto, solo el modo
 * objeto JSON: eso garantiza JSON bien formado, no que venga completo. Un
 * borrador al que le falte una seccion, o que traiga un ensayo donde iba una
 * linea de tarjeta, tiene que pararse aqui: despues ya va camino del formulario
 * y de ahi a la base de datos.
 *
 * Se prueba con un doble del puerto, sin red. CI no tiene clave de Groq y no
 * debe gastar llamadas de pago.
 */
class DraftProjectUseCaseTest {

    /** Un readme cualquiera que pase el minimo de longitud. */
    private static final String README = "# Gastu, gestor de finanzas\n".repeat(20);

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

    /** Puerto de mentira: devuelve lo que se le diga, sin salir a la red. */
    private static DraftProjectUseCase conRespuesta(ProjectDraft respuesta) {
        return new DraftProjectUseCase((nombre, readme) -> respuesta);
    }

    @Test
    @DisplayName("un borrador completo pasa y llega intacto")
    void unBorradorCompletoPasa() {
        ProjectDraft esperado = borradorValido();
        assertEquals(esperado, conRespuesta(esperado).draft("Gastu", README));
    }

    @Test
    @DisplayName("se rechaza si falta una seccion del readme, diciendo cual")
    void seRechazaSiFaltaUnaSeccion() {
        ProjectDraft v = borradorValido();
        ProjectDraft incompleto = new ProjectDraft(
                v.shortDescription(), v.fullDescription(),
                new ReadmeMarkdown(
                        v.readmeMarkdown().objective(),
                        v.readmeMarkdown().architecture(),
                        v.readmeMarkdown().mainFeatures(),
                        v.readmeMarkdown().technologies(),
                        null),
                v.challenges());

        BorradorInvalidoException e = assertThrows(BorradorInvalidoException.class,
                () -> conRespuesta(incompleto).draft("Gastu", README));
        assertTrue(e.getMessage().contains("learnings"),
                "el mensaje deberia nombrar la seccion que fallo, y dijo: " + e.getMessage());
    }

    @Test
    @DisplayName("se rechaza si una seccion llega en blanco")
    void seRechazaSiUnaSeccionLlegaEnBlanco() {
        ProjectDraft v = borradorValido();
        ProjectDraft enBlanco = new ProjectDraft(
                v.shortDescription(), v.fullDescription(),
                new ReadmeMarkdown("   ",
                        v.readmeMarkdown().architecture(),
                        v.readmeMarkdown().mainFeatures(),
                        v.readmeMarkdown().technologies(),
                        v.readmeMarkdown().learnings()),
                v.challenges());

        assertThrows(BorradorInvalidoException.class,
                () -> conRespuesta(enBlanco).draft("Gastu", README));
    }

    @Test
    @DisplayName("se rechaza una descripcion corta que en realidad es un ensayo")
    void seRechazaUnaDescripcionCortaDemasiadoLarga() {
        ProjectDraft v = borradorValido();
        ProjectDraft desbordada = new ProjectDraft(
                "palabra ".repeat(60), v.fullDescription(), v.readmeMarkdown(), v.challenges());

        BorradorInvalidoException e = assertThrows(BorradorInvalidoException.class,
                () -> conRespuesta(desbordada).draft("Gastu", README));
        assertTrue(e.getMessage().contains("shortDescription"), e.getMessage());
    }

    @Test
    @DisplayName("se rechaza si no llega ningun challenge")
    void seRechazaSinChallenges() {
        ProjectDraft v = borradorValido();
        ProjectDraft sinChallenges = new ProjectDraft(
                v.shortDescription(), v.fullDescription(), v.readmeMarkdown(), List.of());

        assertThrows(BorradorInvalidoException.class,
                () -> conRespuesta(sinChallenges).draft("Gastu", README));
    }

    @Test
    @DisplayName("se rechaza un challenge sin descripcion")
    void seRechazaUnChallengeSinDescripcion() {
        ProjectDraft v = borradorValido();
        ProjectDraft manco = new ProjectDraft(
                v.shortDescription(), v.fullDescription(), v.readmeMarkdown(),
                List.of(
                        new Challenge("Un titulo suelto", ""),
                        new Challenge("Otro titulo", "Con su descripcion.")));

        BorradorInvalidoException e = assertThrows(BorradorInvalidoException.class,
                () -> conRespuesta(manco).draft("Gastu", README));
        assertTrue(e.getMessage().contains("challenges[0]"), e.getMessage());
    }

    @Test
    @DisplayName("un readme demasiado corto se rechaza sin llegar a llamar al redactor")
    void seRechazaUnReadmeCortoSinLlamar() {
        boolean[] llamado = {false};
        DraftProjectUseCase caso = new DraftProjectUseCase((nombre, readme) -> {
            llamado[0] = true;
            return borradorValido();
        });

        assertThrows(BorradorInvalidoException.class, () -> caso.draft("Gastu", "Hola"));
        assertFalse(llamado[0], "no se debe pagar una llamada por un texto que no da material");
    }

    @Test
    @DisplayName("se rechaza sin nombre de proyecto")
    void seRechazaSinNombre() {
        assertThrows(BorradorInvalidoException.class,
                () -> conRespuesta(borradorValido()).draft("  ", README));
    }

    @Test
    @DisplayName("si el proveedor no responde, el fallo no se confunde con un borrador invalido")
    void elFalloDelProveedorNoSeConfundeConUnBorradorInvalido() {
        // Son dos situaciones distintas para quien usa el panel: un borrador
        // invalido se reintenta o se mejora el readme; un proveedor caido no
        // tiene nada que revisar. Si ambas salieran igual, el mensaje mentiria.
        DraftProjectUseCase caso = new DraftProjectUseCase((nombre, readme) -> {
            throw new DrafterNoDisponibleException("Groq no responde");
        });

        assertThrows(DrafterNoDisponibleException.class, () -> caso.draft("Gastu", README));
    }
}
