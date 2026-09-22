package com.juanbarrios.portfolio.application.usecase;

import com.juanbarrios.portfolio.domain.model.Challenge;
import com.juanbarrios.portfolio.domain.model.ProjectDraft;
import com.juanbarrios.portfolio.domain.model.ReadmeMarkdown;
import com.juanbarrios.portfolio.domain.port.out.ProjectDrafterPort;

/**
 * Pide un borrador y comprueba que sirva antes de devolverlo.
 *
 * La validacion vive aqui y no en el adaptador a proposito: el adaptador sabe
 * de HTTP y de JSON, pero que una descripcion corta de 900 caracteres no sirve
 * es una regla del portafolio, no del proveedor. Si manana se cambia Groq por
 * otro, estas reglas siguen valiendo.
 *
 * <p><b>Por que se valida.</b> El modelo que usamos no soporta el modo de
 * esquema estricto, solo el modo objeto JSON: garantiza JSON bien formado, no
 * que tenga los campos que pedimos ni que esten rellenos. Sin esta comprobacion
 * un borrador a medias llegaria al formulario con secciones en blanco y se
 * guardaria sin que nada avisara.
 */
public class DraftProjectUseCase {

    /**
     * Cotas tomadas de los cuatro proyectos reales del portafolio, no elegidas
     * a ojo: shortDescription mide entre 57 y 81 caracteres, fullDescription
     * entre 247 y 267, las secciones del readme entre 140 y 383, y hay entre 3
     * y 4 challenges. Los margenes de abajo dejan aire suficiente para que un
     * proyecto distinto quepa, pero rechazan lo que claramente se salio del
     * formato: una frase suelta donde iba un parrafo, o un ensayo donde iba una
     * linea de tarjeta.
     */
    private static final int SHORT_MAX = 200;
    private static final int FULL_MIN = 80;
    private static final int FULL_MAX = 800;
    private static final int SECCION_MIN = 60;
    private static final int SECCION_MAX = 1200;
    private static final int CHALLENGES_MIN = 2;
    private static final int CHALLENGES_MAX = 6;

    /**
     * Un readme mas corto que esto no da material para redactar nada: el modelo
     * rellenaria el hueco inventando. Y por arriba se corta porque cada
     * caracter enviado se paga y un readme enorme suele ser documentacion
     * entera, no la descripcion del proyecto.
     */
    private static final int README_MIN = 200;
    private static final int README_MAX = 20_000;

    private final ProjectDrafterPort drafter;

    public DraftProjectUseCase(ProjectDrafterPort drafter) {
        this.drafter = drafter;
    }

    public ProjectDraft draft(String nombre, String readme) {
        String nombreLimpio = nombre == null ? "" : nombre.trim();
        String readmeLimpio = readme == null ? "" : readme.trim();

        if (nombreLimpio.isEmpty()) {
            throw new BorradorInvalidoException("Falta el nombre del proyecto.");
        }
        if (readmeLimpio.length() < README_MIN) {
            throw new BorradorInvalidoException(
                    "El texto de entrada es demasiado corto (" + readmeLimpio.length()
                            + " caracteres, minimo " + README_MIN + "). Con menos que eso "
                            + "el borrador se lo inventaria casi todo.");
        }
        if (readmeLimpio.length() > README_MAX) {
            throw new BorradorInvalidoException(
                    "El texto de entrada es demasiado largo (" + readmeLimpio.length()
                            + " caracteres, maximo " + README_MAX + "). Pega solo el readme.");
        }

        ProjectDraft borrador = drafter.draft(nombreLimpio, readmeLimpio);
        validar(borrador);
        return borrador;
    }

    private void validar(ProjectDraft b) {
        if (b == null) {
            throw new BorradorInvalidoException("El redactor no devolvio ningun borrador.");
        }

        exigirTexto(b.shortDescription(), "shortDescription", 1, SHORT_MAX);
        exigirTexto(b.fullDescription(), "fullDescription", FULL_MIN, FULL_MAX);

        ReadmeMarkdown r = b.readmeMarkdown();
        if (r == null) {
            throw new BorradorInvalidoException("Falta el bloque readmeMarkdown.");
        }
        // Las cinco secciones son las que dibuja el caso de estudio. Si una
        // llega vacia, en la pagina queda un titulo con nada debajo.
        exigirTexto(r.objective(), "readmeMarkdown.objective", SECCION_MIN, SECCION_MAX);
        exigirTexto(r.architecture(), "readmeMarkdown.architecture", SECCION_MIN, SECCION_MAX);
        exigirTexto(r.mainFeatures(), "readmeMarkdown.mainFeatures", SECCION_MIN, SECCION_MAX);
        exigirTexto(r.technologies(), "readmeMarkdown.technologies", SECCION_MIN, SECCION_MAX);
        exigirTexto(r.learnings(), "readmeMarkdown.learnings", SECCION_MIN, SECCION_MAX);

        if (b.challenges() == null
                || b.challenges().size() < CHALLENGES_MIN
                || b.challenges().size() > CHALLENGES_MAX) {
            throw new BorradorInvalidoException(
                    "Se esperaban entre " + CHALLENGES_MIN + " y " + CHALLENGES_MAX
                            + " challenges y llegaron "
                            + (b.challenges() == null ? 0 : b.challenges().size()) + ".");
        }
        for (int i = 0; i < b.challenges().size(); i++) {
            Challenge c = b.challenges().get(i);
            if (c == null) {
                throw new BorradorInvalidoException("El challenge " + (i + 1) + " llego vacio.");
            }
            exigirTexto(c.title(), "challenges[" + i + "].title", 1, 160);
            exigirTexto(c.description(), "challenges[" + i + "].description", 1, SECCION_MAX);
        }
    }

    private void exigirTexto(String valor, String campo, int minimo, int maximo) {
        if (valor == null || valor.isBlank()) {
            throw new BorradorInvalidoException("El campo " + campo + " llego vacio.");
        }
        int longitud = valor.trim().length();
        if (longitud < minimo) {
            throw new BorradorInvalidoException(
                    "El campo " + campo + " es demasiado corto (" + longitud
                            + " caracteres, minimo " + minimo + ").");
        }
        if (longitud > maximo) {
            throw new BorradorInvalidoException(
                    "El campo " + campo + " es demasiado largo (" + longitud
                            + " caracteres, maximo " + maximo + ").");
        }
    }
}
