package com.juanbarrios.portfolio.application.usecase;

import com.juanbarrios.portfolio.domain.model.BlueprintEdge;
import com.juanbarrios.portfolio.domain.model.BlueprintNode;
import com.juanbarrios.portfolio.domain.model.Challenge;
import com.juanbarrios.portfolio.domain.model.ProjectDraft;
import com.juanbarrios.portfolio.domain.model.ProjectLinks;
import com.juanbarrios.portfolio.domain.model.ReadmeMarkdown;
import com.juanbarrios.portfolio.domain.service.MaquetadorDeDiagrama;
import com.juanbarrios.portfolio.domain.service.Vocabulario;

import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
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

    // Las listas y la arquitectura son opcionales: vacias significan "el readme
    // no lo dice". Solo tienen techo, medido sobre los cuatro proyectos: 6
    // funcionalidades y 6 destacados de menos de 90 letras, 7 palabras clave,
    // y resumenes de arquitectura de menos de 40.
    private static final int LISTA_MAX = 10;
    private static final int ENTRADA_MAX = 160;
    private static final int PALABRA_MAX = 40;
    private static final int ARQUITECTURA_MAX = 100;

    // El diagrama tambien es opcional: sin piezas en el readme, no hay
    // diagrama. Los hechos a mano tienen entre 6 y 11 nodos; por debajo de 3
    // no es un diagrama y por encima de 12 no se lee en la ficha.
    private static final int NODOS_MIN = 3;
    private static final int NODOS_MAX = 12;
    private static final int ARISTAS_MAX = 20;
    private static final int ETIQUETA_MAX = 32;
    private static final int DESCRIPCION_NODO_MAX = 60;

    // El stack y las caracteristicas por grupos, medidos sobre los cuatro
    // proyectos: hasta 6 capas de hasta 7 tecnologias, y hasta 6 grupos de
    // hasta 6 caracteristicas.
    private static final int GRUPOS_MAX = 9;
    private static final int POR_GRUPO_MAX = 10;
    private static final int TECNOLOGIA_MAX = 40;
    private static final int NOMBRE_GRUPO_MAX = 32;
    private static final int CARACTERISTICA_MAX = 90;

    /** La URL de un repositorio de GitHub: owner y repo, y nada detras que importe. */
    private static final Pattern REPO = Pattern.compile(
            "^https?://(?:www\\.)?github\\.com/([A-Za-z0-9._-]+)/([A-Za-z0-9._-]+?)(?:\\.git)?/?$");

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
            borrador = normalizar(drafter.draft(nombreLimpio, readmeLimpio, aviso));
            validar(borrador);
        } catch (BorradorInvalidoException | RespuestaIlegibleException primero) {
            aviso.avisar("reintento", primero.getMessage());
            borrador = normalizar(drafter.draft(nombreLimpio, readmeLimpio, aviso, primero.getMessage()));
            validar(borrador);
        }
        borrador = conEnlaceDelReadme(borrador, readmeLimpio);
        borrador = conDiagramaColocado(borrador);
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
        // readme; cada challenge son dos mas, y cada nodo del diagrama uno.
        int nodos = b.architectureNodes() == null ? 0 : b.architectureNodes().size();
        return 8 + b.challenges().size() * 2 + nodos;
    }

    /**
     * Lleva el stack y los grupos de caracteristicas a su vocabulario. Un
     * "Architecture" donde iba "Arquitectura" no merece una llamada mas: se
     * corrige aqui. Lo que no es ninguna capa del stack no se puede corregir,
     * y eso lo rechaza validar().
     */
    private ProjectDraft normalizar(ProjectDraft b) {
        if (b == null || (b.structuredStack() == null && b.structuredFeatures() == null)) return b;
        return b.conEstructura(
                Vocabulario.normalizarStack(b.structuredStack()),
                Vocabulario.normalizarCaracteristicas(b.structuredFeatures()));
    }

    /**
     * Deja el enlace al repositorio solo si esta escrito en el readme.
     *
     * No se pide otra vez si falla: un enlace que no esta en el texto se lo ha
     * inventado el modelo, y la respuesta correcta es no tenerlo, no gastar
     * otra llamada en buscarlo. Se compara contra el readme y no contra un
     * patron porque una URL de GitHub bien formada puede ser igual de falsa.
     */
    private ProjectDraft conEnlaceDelReadme(ProjectDraft b, String readme) {
        String propuesto = b.links() == null || b.links().github() == null ? "" : b.links().github().trim();
        Matcher m = REPO.matcher(propuesto);
        if (!m.matches()) return b.links() == null ? b : b.conEnlaces(null);

        String limpio = "https://github.com/" + m.group(1) + "/" + m.group(2);
        String sinEsquema = ("github.com/" + m.group(1) + "/" + m.group(2)).toLowerCase(Locale.ROOT);
        boolean escrito = readme.toLowerCase(Locale.ROOT).contains(sinEsquema);
        return b.conEnlaces(escrito ? new ProjectLinks(limpio, null, null) : null);
    }

    private ProjectDraft conDiagramaColocado(ProjectDraft b) {
        if (b.architectureNodes() == null || b.architectureNodes().isEmpty()) {
            // Sin diagrama no se tocan ni las aristas ni el lienzo: vacio quiere
            // decir "el readme no lo da", y asi lo recibe el formulario.
            return b.architectureEdges() == null && b.architectureLayout() == null
                    ? b : b.conDiagrama(null, null, null);
        }
        List<BlueprintEdge> aristas = b.architectureEdges() == null ? List.of() : b.architectureEdges();
        MaquetadorDeDiagrama.Diagrama d = MaquetadorDeDiagrama.maquetar(b.architectureNodes(), aristas);
        return b.conDiagrama(d.nodos(), d.aristas(), d.layout());
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
        exigirLista(b.features(), "features", ENTRADA_MAX);
        exigirLista(b.highlights(), "highlights", ENTRADA_MAX);
        exigirLista(b.keywords(), "keywords", PALABRA_MAX);
        exigirCorto(b.coreArchitecture(), "coreArchitecture");
        exigirCorto(b.databaseArchitecture(), "databaseArchitecture");
        exigirCorto(b.aiArchitecture(), "aiArchitecture");

        exigirDiagrama(b.architectureNodes(), b.architectureEdges());
        exigirGrupos(b.structuredStack(), "structuredStack", TECNOLOGIA_MAX, true);
        exigirGrupos(b.structuredFeatures(), "structuredFeatures", CARACTERISTICA_MAX, false);

        for (int i = 0; i < b.challenges().size(); i++) {
            Challenge c = b.challenges().get(i);
            if (c == null) {
                throw new BorradorInvalidoException("El challenge " + (i + 1) + " llego vacio.");
            }
            exigirTexto(c.title(), "challenges[" + i + "].title", 1, 160);
            exigirTexto(c.description(), "challenges[" + i + "].description", 1, SECCION_MAX);
        }
    }

    /** Una lista opcional: puede faltar o venir vacia, pero no desbordarse. */
    private void exigirLista(List<String> lista, String campo, int maximoPorEntrada) {
        if (lista == null) return;
        if (lista.size() > LISTA_MAX) {
            throw new BorradorInvalidoException(
                    "La lista " + campo + " trae " + lista.size() + " entradas, maximo " + LISTA_MAX + ".");
        }
        for (int i = 0; i < lista.size(); i++) {
            String entrada = lista.get(i);
            if (entrada == null || entrada.isBlank()) {
                throw new BorradorInvalidoException("La entrada " + (i + 1) + " de " + campo + " llego vacia.");
            }
            if (entrada.trim().length() > maximoPorEntrada) {
                throw new BorradorInvalidoException(
                        "La entrada " + (i + 1) + " de " + campo + " es demasiado larga ("
                                + entrada.trim().length() + " caracteres, maximo " + maximoPorEntrada + ").");
            }
        }
    }

    /**
     * El diagrama es opcional, pero si viene tiene que poder dibujarse: ids
     * unicos, capas que el visor conoce y aristas entre nodos que existen. Una
     * arista a un nodo que no esta no se ve como error en la ficha: se ve como
     * una linea que sale de ninguna parte.
     */
    private void exigirDiagrama(List<BlueprintNode> nodos, List<BlueprintEdge> aristas) {
        if (nodos == null || nodos.isEmpty()) return;
        if (nodos.size() < NODOS_MIN || nodos.size() > NODOS_MAX) {
            throw new BorradorInvalidoException(
                    "El diagrama trae " + nodos.size() + " nodos; tienen que ser entre "
                            + NODOS_MIN + " y " + NODOS_MAX + ", o ninguno.");
        }
        Set<String> ids = new HashSet<>();
        for (int i = 0; i < nodos.size(); i++) {
            BlueprintNode n = nodos.get(i);
            if (n == null || n.id() == null || n.id().isBlank()) {
                throw new BorradorInvalidoException("El nodo " + (i + 1) + " del diagrama llego sin id.");
            }
            if (!ids.add(n.id())) {
                throw new BorradorInvalidoException("El id \"" + n.id() + "\" se repite en el diagrama.");
            }
            exigirTexto(n.label(), "architectureNodes[" + i + "].label", 1, ETIQUETA_MAX);
            if (n.description() != null && n.description().trim().length() > DESCRIPCION_NODO_MAX) {
                throw new BorradorInvalidoException(
                        "La descripcion del nodo \"" + n.id() + "\" es demasiado larga ("
                                + n.description().trim().length() + " caracteres, maximo "
                                + DESCRIPCION_NODO_MAX + ").");
            }
            if (!MaquetadorDeDiagrama.GRUPOS.contains(n.group())) {
                throw new BorradorInvalidoException(
                        "El nodo \"" + n.id() + "\" tiene el group \"" + n.group() + "\"; tiene que ser uno de "
                                + String.join(", ", MaquetadorDeDiagrama.GRUPOS) + ".");
            }
        }
        if (aristas == null) return;
        if (aristas.size() > ARISTAS_MAX) {
            throw new BorradorInvalidoException(
                    "El diagrama trae " + aristas.size() + " aristas, maximo " + ARISTAS_MAX + ".");
        }
        for (BlueprintEdge e : aristas) {
            if (e == null || !ids.contains(e.from()) || !ids.contains(e.to())) {
                throw new BorradorInvalidoException(
                        "Una arista del diagrama une nodos que no existen: "
                                + (e == null ? "null" : e.from() + " -> " + e.to()) + ".");
            }
            if (e.from().equals(e.to())) {
                throw new BorradorInvalidoException("Una arista del diagrama une el nodo \"" + e.from() + "\" consigo mismo.");
            }
        }
    }

    /**
     * Un campo por grupos opcional. En el stack, cada clave tiene que ser una
     * capa del vocabulario (ya normalizada: aqui solo llega lo que no era
     * ninguna); en las caracteristicas, el nombre del grupo es libre.
     */
    private void exigirGrupos(java.util.Map<String, List<String>> grupos, String campo,
                              int maximoPorEntrada, boolean soloCapas) {
        if (grupos == null || grupos.isEmpty()) return;
        if (grupos.size() > GRUPOS_MAX) {
            throw new BorradorInvalidoException(
                    campo + " trae " + grupos.size() + " grupos, maximo " + GRUPOS_MAX + ".");
        }
        for (var e : grupos.entrySet()) {
            String clave = e.getKey();
            if (soloCapas && !Vocabulario.CAPAS.containsKey(clave)) {
                throw new BorradorInvalidoException(
                        "structuredStack usa la capa \"" + clave + "\", que no existe: tiene que ser una de "
                                + String.join(", ", Vocabulario.CAPAS.keySet()) + ".");
            }
            if (!soloCapas && (clave.isBlank() || clave.length() > NOMBRE_GRUPO_MAX)) {
                throw new BorradorInvalidoException(
                        "El grupo \"" + clave + "\" de " + campo + " tiene que tener entre 1 y "
                                + NOMBRE_GRUPO_MAX + " caracteres.");
            }
            if (e.getValue().size() > POR_GRUPO_MAX) {
                throw new BorradorInvalidoException(
                        "El grupo \"" + clave + "\" de " + campo + " trae " + e.getValue().size()
                                + " entradas, maximo " + POR_GRUPO_MAX + ".");
            }
            for (String x : e.getValue()) {
                if (x.length() > maximoPorEntrada) {
                    throw new BorradorInvalidoException(
                            "Una entrada del grupo \"" + clave + "\" de " + campo + " es demasiado larga ("
                                    + x.length() + " caracteres, maximo " + maximoPorEntrada + ").");
                }
            }
        }
    }

    /** Un resumen de una linea opcional: vacio vale, un parrafo no. */
    private void exigirCorto(String valor, String campo) {
        if (valor != null && valor.trim().length() > ARQUITECTURA_MAX) {
            throw new BorradorInvalidoException(
                    "El campo " + campo + " es demasiado largo (" + valor.trim().length()
                            + " caracteres, maximo " + ARQUITECTURA_MAX + "): es un resumen de una linea.");
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
