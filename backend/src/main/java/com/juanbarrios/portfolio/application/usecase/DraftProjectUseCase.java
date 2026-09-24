package com.juanbarrios.portfolio.application.usecase;

import com.juanbarrios.portfolio.domain.model.Challenge;
import com.juanbarrios.portfolio.domain.model.ProjectDraft;
import com.juanbarrios.portfolio.domain.model.ReadmeMarkdown;
import com.juanbarrios.portfolio.domain.port.out.AvisoDeEtapa;
import com.juanbarrios.portfolio.domain.port.out.ProjectDrafterPort;
import com.juanbarrios.portfolio.domain.port.out.RespuestaIlegibleException;

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
    /** Cabe en la tarjeta y en el titulo de la ficha. Los cuatro que hay miden
     *  entre 5 y 14 caracteres; esto deja sitio de sobra sin admitir una frase
     *  entera donde va un nombre. */
    private static final int NOMBRE_MAX = 80;

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
        return draft(nombre, readme, AvisoDeEtapa.NINGUNO);
    }

    /**
     * Lo mismo, contando por donde va.
     *
     * Es el mismo camino que el de arriba, no una copia: las cotas, el orden y
     * los mensajes de error son los de siempre. Lo unico que cambia es que se
     * avisa al pasar por cada paso.
     */
    public ProjectDraft draft(String nombre, String readme, AvisoDeEtapa aviso) {
        String nombreLimpio = nombre == null ? "" : nombre.trim();
        String readmeLimpio = readme == null ? "" : readme.trim();

        // El nombre ya no se exige a la entrada. Era un paso manual puesto
        // delante del automatico para pedir un dato que casi siempre esta en el
        // readme; ahora, si no viene, lo redacta el borrador y se valida a la
        // salida como cualquier otro campo. Si viene, manda: alguien decidio
        // como se llama el proyecto.
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

        aviso.avisar("entrada", "Readme de " + readmeLimpio.length() + " caracteres"
                + (nombreLimpio.isEmpty()
                        ? ", sin nombre: lo saca del texto"
                        : " para \"" + nombreLimpio + "\""));

        // Un reintento, y solo uno, cuando el borrador no pasa las cotas o la
        // respuesta no se puede leer como borrador (vino vacia, se corto
        // razonando, no era JSON). El
        // modelo falla a veces en algo concreto --una lista vacia, una seccion
        // que se queda corta-- y lo arregla en cuanto se le dice que fue. Sin
        // esto, un borrador bueno en todo menos en los desafios se tiraba
        // entero y habia que volver a pulsar. Solo uno porque cada intento es
        // una llamada de pago: si falla dos veces seguidas, el problema esta en
        // la entrada y lo tiene que ver una persona.
        ProjectDraft borrador;
        try {
            borrador = drafter.draft(nombreLimpio, readmeLimpio, aviso);
            validar(borrador);
        } catch (BorradorInvalidoException | RespuestaIlegibleException primero) {
            aviso.avisar("reintento", primero.getMessage());
            borrador = drafter.draft(nombreLimpio, readmeLimpio, aviso, primero.getMessage());
            validar(borrador);
        }
        aviso.avisar("validacion", "Los " + camposValidados(borrador)
                + " campos caben dentro de las cotas del portafolio");
        return borrador;
    }

    /**
     * Cuantos campos acaba de comprobar validar().
     *
     * Se cuenta y no se escribe un numero fijo porque el numero de challenges
     * varia; un "11 campos" a mano se quedaria desfasado en cuanto cambiara
     * cualquier cosa, que es exactamente lo que le paso a los metadatos de la
     * portada.
     */
    private int camposValidados(ProjectDraft b) {
        // name, shortDescription, fullDescription y las cinco secciones del
        // readme; cada challenge son dos mas.
        return 8 + b.challenges().size() * 2;
    }

    private void validar(ProjectDraft b) {
        if (b == null) {
            throw new BorradorInvalidoException("El redactor no devolvio ningun borrador.");
        }

        // El nombre se comprueba aqui porque desde que dejo de ser obligatorio a
        // la entrada, este es el unico sitio donde se mira. Un borrador sin
        // nombre llegaria al formulario con el campo requerido en blanco.
        exigirTexto(b.name(), "name", 1, NOMBRE_MAX);
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
