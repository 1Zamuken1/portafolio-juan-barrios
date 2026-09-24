package com.juanbarrios.portfolio.domain.service;

import com.juanbarrios.portfolio.domain.model.BlueprintCanvas;
import com.juanbarrios.portfolio.domain.model.BlueprintEdge;
import com.juanbarrios.portfolio.domain.model.BlueprintLayout;
import com.juanbarrios.portfolio.domain.model.BlueprintNode;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

/**
 * Coloca los nodos de un diagrama que llegan sin coordenadas.
 *
 * <p>El modelo decide <i>que</i> piezas tiene el sistema y quien llama a
 * quien; donde va cada una lo decide esto. Es el reparto que hacia falta para
 * que la IA pudiera proponer el diagrama: colocar cajas sin que se pisen es un
 * problema de maquetacion, no de redaccion, y un modelo que escribe
 * coordenadas las escribe distintas cada vez y a menudo encima unas de otras.
 *
 * <p>La maqueta es la de los cuatro diagramas hechos a mano: columnas de
 * izquierda a derecha segun la capa --lo que usa la persona, la aplicacion,
 * la persistencia y los datos--, 380 px entre columnas y 160 entre filas, con
 * cajas de 250 x 96. Las columnas mas cortas se centran respecto a la mas
 * alta, que es lo que hace que el diagrama se lea como un flujo y no como una
 * tabla.
 *
 * <p>Los iconos se limitan a {@link #ICONOS}. El sitio sirve una fuente de
 * devicon recortada a los glifos que usa (scripts/subset-iconos.mjs): una
 * clase fuera de ella no da error, simplemente no se dibuja. Uno que no este en
 * la lista se cambia por el de su capa.
 */
public final class MaquetadorDeDiagrama {

    /** Las capas que entiende el visor, en el orden de las columnas. */
    public static final List<String> GRUPOS = List.of(
            "client", "application", "automation", "persistence", "external", "database");

    /** Columna de cada capa. automation comparte la de application y external
     *  la de persistence: en los diagramas a mano van debajo de ellas. */
    private static final Map<String, Integer> COLUMNA = Map.of(
            "client", 0, "application", 1, "automation", 1,
            "persistence", 2, "external", 2, "database", 3);

    /** El icono de cada capa cuando el propuesto no sirve. */
    private static final Map<String, String> ICONO_DE_CAPA = Map.of(
            "client", "pi pi-desktop", "application", "pi pi-cog", "automation", "pi pi-bolt",
            "persistence", "pi pi-sitemap", "external", "pi pi-link", "database", "pi pi-database");

    /**
     * Los iconos que se pueden proponer. Los devicon son los que estan en la
     * fuente recortada; los de PrimeIcons, un surtido de los que tienen sentido
     * en un diagrama (la fuente de PrimeIcons se sirve entera).
     */
    public static final List<String> ICONOS = List.of(
            "devicon-angular-plain", "devicon-react-original", "devicon-vuejs-plain",
            "devicon-typescript-plain", "devicon-javascript-plain", "devicon-html5-plain",
            "devicon-nodejs-plain", "devicon-spring-original", "devicon-java-plain",
            "devicon-python-plain", "devicon-django-plain", "devicon-electron-original",
            "devicon-playwright-plain", "devicon-docker-plain", "devicon-git-plain",
            "devicon-githubactions-plain", "devicon-postgresql-plain", "devicon-mysql-plain",
            "devicon-sqlite-plain", "devicon-sonarqube-plain", "devicon-vercel-original",
            "devicon-tailwindcss-original", "devicon-vitejs-plain", "devicon-google-plain",
            "devicon-chrome-plain", "devicon-markdown-original", "devicon-json-plain",
            "pi pi-desktop", "pi pi-mobile", "pi pi-globe", "pi pi-user", "pi pi-users",
            "pi pi-cog", "pi pi-server", "pi pi-lock", "pi pi-shield", "pi pi-key",
            "pi pi-database", "pi pi-sitemap", "pi pi-box", "pi pi-bolt", "pi pi-clock",
            "pi pi-link", "pi pi-cloud", "pi pi-sparkles", "pi pi-search", "pi pi-file",
            "pi pi-file-pdf", "pi pi-file-excel", "pi pi-file-export", "pi pi-chart-bar",
            "pi pi-shopping-cart", "pi pi-envelope", "pi pi-bell", "pi pi-home", "pi pi-code");

    static final int MARGEN = 80;
    static final int PASO_X = 380;
    static final int PASO_Y = 160;
    static final int ANCHO = 250;
    static final int ALTO = 96;
    private static final int REJILLA = 40;

    private MaquetadorDeDiagrama() {}

    /** El diagrama colocado: nodos con coordenadas, aristas con puertos y el lienzo. */
    public record Diagrama(List<BlueprintNode> nodos, List<BlueprintEdge> aristas, BlueprintLayout layout) {}

    /**
     * Coloca los nodos. Se supone que ya pasaron la validacion: ids unicos,
     * capas conocidas y aristas entre nodos que existen.
     */
    public static Diagrama maquetar(List<BlueprintNode> nodos, List<BlueprintEdge> aristas) {
        // Las columnas que quedan vacias se cierran: un proyecto sin base de
        // datos no deja un hueco de 380 px a la derecha.
        Set<Integer> usadas = new TreeSet<>();
        for (BlueprintNode n : nodos) usadas.add(COLUMNA.get(n.group()));
        Map<Integer, Integer> compacta = new HashMap<>();
        for (int c : usadas) compacta.put(c, compacta.size());

        // Dentro de una columna, primero la capa principal y luego la que la
        // comparte (automation bajo application, external bajo persistence),
        // y en cada capa el orden en que las propuso el modelo.
        Map<Integer, List<BlueprintNode>> porColumna = new HashMap<>();
        for (BlueprintNode n : nodos) {
            porColumna.computeIfAbsent(compacta.get(COLUMNA.get(n.group())), k -> new ArrayList<>()).add(n);
        }
        porColumna.values().forEach(l -> l.sort(Comparator.comparingInt(n -> GRUPOS.indexOf(n.group()))));

        int filasMax = porColumna.values().stream().mapToInt(List::size).max().orElse(1);

        Map<String, int[]> celda = new HashMap<>();
        List<BlueprintNode> colocados = new ArrayList<>();
        for (BlueprintNode n : nodos) {
            int col = compacta.get(COLUMNA.get(n.group()));
            List<BlueprintNode> columna = porColumna.get(col);
            int fila = columna.indexOf(n);
            // Media fila de desplazamiento por cada fila que le falta a esta
            // columna respecto a la mas alta: asi queda centrada.
            int y = MARGEN + fila * PASO_Y + (filasMax - columna.size()) * PASO_Y / 2;
            int x = MARGEN + col * PASO_X;
            celda.put(n.id(), new int[]{col, fila});
            colocados.add(new BlueprintNode(
                    n.id(), n.label().trim(), recortar(n.description()), icono(n),
                    n.group(), "secondary".equals(n.type()) ? "secondary" : "primary",
                    x, y, ANCHO, ALTO));
        }

        List<BlueprintEdge> conPuertos = new ArrayList<>();
        for (BlueprintEdge e : aristas) {
            int[] de = celda.get(e.from());
            int[] a = celda.get(e.to());
            String salida, llegada;
            if (de[0] < a[0]) { salida = "right"; llegada = "left"; }
            else if (de[0] > a[0]) { salida = "left"; llegada = "right"; }
            else if (de[1] < a[1]) { salida = "bottom"; llegada = "top"; }
            else { salida = "top"; llegada = "bottom"; }
            conPuertos.add(new BlueprintEdge(e.from(), e.to(), salida, llegada, "orthogonal",
                    null, null, null, null));
        }

        int ancho = redondear(2 * MARGEN + (usadas.size() - 1) * PASO_X + ANCHO);
        int alto = redondear(2 * MARGEN + (filasMax - 1) * PASO_Y + ALTO);
        BlueprintLayout layout = new BlueprintLayout("freeform",
                new BlueprintCanvas(ancho, alto, REJILLA, true));

        return new Diagrama(colocados, conPuertos, layout);
    }

    private static String icono(BlueprintNode n) {
        String propuesto = n.icon() == null ? "" : n.icon().trim();
        return ICONOS.contains(propuesto) ? propuesto : ICONO_DE_CAPA.get(n.group());
    }

    private static String recortar(String texto) {
        return texto == null || texto.isBlank() ? null : texto.trim();
    }

    /** Al multiplo de la rejilla, para que el fondo cuadriculado cierre justo. */
    private static int redondear(int valor) {
        return (valor + REJILLA - 1) / REJILLA * REJILLA;
    }
}
