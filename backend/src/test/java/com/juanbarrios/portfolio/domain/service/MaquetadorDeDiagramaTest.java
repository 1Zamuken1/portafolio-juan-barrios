package com.juanbarrios.portfolio.domain.service;

import com.juanbarrios.portfolio.domain.model.BlueprintEdge;
import com.juanbarrios.portfolio.domain.model.BlueprintNode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * La maqueta del diagrama que propone la IA.
 *
 * Lo que importa no es el pixel exacto sino lo que haria ilegible el diagrama:
 * dos cajas en el mismo sitio, una capa fuera de su columna o un lienzo que
 * corta la ultima caja.
 */
class MaquetadorDeDiagramaTest {

    private static BlueprintNode nodo(String id, String grupo) {
        return new BlueprintNode(id, id, null, null, grupo, null, null, null, null, null);
    }

    private static BlueprintEdge arista(String de, String a) {
        return new BlueprintEdge(de, a, null, null, null, null, null, null, null);
    }

    /** El de Salsamentaria, tal como lo describiria el modelo. */
    private static final List<BlueprintNode> SALSAMENTARIA = List.of(
            nodo("spa", "client"), nodo("api", "application"), nodo("security", "application"),
            nodo("jpa", "persistence"), nodo("sonar", "external"), nodo("mysql", "database"));

    @Test
    @DisplayName("ninguna caja se pisa con otra")
    void ningunaCajaSePisa() {
        var d = MaquetadorDeDiagrama.maquetar(SALSAMENTARIA, List.of());
        Set<String> sitios = new HashSet<>();
        for (BlueprintNode n : d.nodos()) {
            assertTrue(sitios.add(n.x() + "," + n.y()), "dos nodos en " + n.x() + "," + n.y());
        }
    }

    @Test
    @DisplayName("cada capa va en su columna, y external debajo de persistence")
    void cadaCapaEnSuColumna() {
        var d = MaquetadorDeDiagrama.maquetar(SALSAMENTARIA, List.of());
        var porId = d.nodos().stream().collect(java.util.stream.Collectors.toMap(BlueprintNode::id, n -> n));

        assertEquals(80, porId.get("spa").x());
        assertEquals(460, porId.get("api").x());
        assertEquals(porId.get("api").x(), porId.get("security").x());
        assertEquals(840, porId.get("jpa").x());
        assertEquals(porId.get("jpa").x(), porId.get("sonar").x());
        assertTrue(porId.get("sonar").y() > porId.get("jpa").y());
        assertEquals(1220, porId.get("mysql").x());
    }

    /** El de GastuApp tal como lo propuso la IA la primera vez. */
    private static final List<BlueprintNode> GASTU = List.of(
            nodo("client", "client"), nodo("api", "application"), nodo("orm", "persistence"),
            nodo("db", "database"), nodo("google", "external"), nodo("gemini", "external"));
    private static final List<BlueprintEdge> GASTU_ARISTAS = List.of(
            arista("client", "api"), arista("api", "orm"), arista("orm", "db"),
            arista("api", "google"), arista("api", "gemini"));

    private static java.util.Map<String, BlueprintNode> porId(MaquetadorDeDiagrama.Diagrama d) {
        return d.nodos().stream().collect(java.util.stream.Collectors.toMap(BlueprintNode::id, n -> n));
    }

    @Test
    @DisplayName("una cadena sale recta: la base de datos, a la altura del ORM que la usa")
    void unaCadenaSaleRecta() {
        // Lo que paso con GastuApp: centrando cada columna, la base de datos
        // quedo a la altura de Google OAuth y la linea ORM -> DB bajaba en
        // escalon pegada a otra caja.
        var n = porId(MaquetadorDeDiagrama.maquetar(GASTU, GASTU_ARISTAS));
        assertEquals(n.get("orm").y(), n.get("db").y());
    }

    @Test
    @DisplayName("una pieza que reparte a varias queda en medio de ellas")
    void quienRepartQuedaEnMedio() {
        var n = porId(MaquetadorDeDiagrama.maquetar(GASTU, GASTU_ARISTAS));
        int media = (n.get("orm").y() + n.get("google").y() + n.get("gemini").y()) / 3;
        assertEquals(media, n.get("api").y());
        assertEquals(n.get("api").y(), n.get("client").y(), "y el cliente, en linea con la API");
    }

    @Test
    @DisplayName("lo de arriba del todo empieza en el margen")
    void loDeArribaEmpiezaEnElMargen() {
        var d = MaquetadorDeDiagrama.maquetar(GASTU, GASTU_ARISTAS);
        assertEquals(80, d.nodos().stream().mapToInt(BlueprintNode::y).min().orElseThrow());
        var sin = MaquetadorDeDiagrama.maquetar(SALSAMENTARIA, List.of());
        assertEquals(80, sin.nodos().stream().mapToInt(BlueprintNode::y).min().orElseThrow());
    }

    @Test
    @DisplayName("con aristas tampoco se pisa ninguna caja")
    void conAristasNingunaSePisa() {
        var d = MaquetadorDeDiagrama.maquetar(GASTU, GASTU_ARISTAS);
        Set<String> sitios = new HashSet<>();
        for (BlueprintNode x : d.nodos()) assertTrue(sitios.add(x.x() + "," + x.y()), x.id());
    }

    @Test
    @DisplayName("los puertos siguen la direccion de la arista")
    void losPuertosSiguenLaDireccion() {
        var d = MaquetadorDeDiagrama.maquetar(SALSAMENTARIA,
                List.of(arista("spa", "api"), arista("api", "security"), arista("mysql", "jpa")));
        assertEquals("right", d.aristas().get(0).fromPort());
        assertEquals("bottom", d.aristas().get(1).fromPort(), "misma columna, hacia abajo");
        assertEquals("top", d.aristas().get(1).toPort());
        assertEquals("left", d.aristas().get(2).fromPort(), "de derecha a izquierda");
    }

    @Test
    @DisplayName("el lienzo cabe todo y cierra en la rejilla")
    void elLienzoCabeTodo() {
        var d = MaquetadorDeDiagrama.maquetar(SALSAMENTARIA, List.of());
        var lienzo = d.layout().canvas();
        for (BlueprintNode n : d.nodos()) {
            assertTrue(n.x() + n.width() <= lienzo.width());
            assertTrue(n.y() + n.height() <= lienzo.height());
        }
        assertEquals(0, lienzo.width() % 40);
        assertEquals(0, lienzo.height() % 40);
    }

    @Test
    @DisplayName("los iconos que se proponen al modelo son todos iconos de verdad")
    void losIconosDeLaListaExisten() throws Exception {
        // La fuente de devicon del sitio esta recortada: un icono fuera de
        // ella no da error, simplemente no se dibuja. Se lee el CSS que la
        // acompana para no mantener dos listas a mano.
        var css = java.nio.file.Path.of("..", "public", "fonts", "iconos.css");
        if (!java.nio.file.Files.exists(css)) return; // el backend suelto, sin el frontend al lado
        String texto = java.nio.file.Files.readString(css);
        for (String icono : MaquetadorDeDiagrama.ICONOS) {
            if (!icono.startsWith("devicon-")) continue;
            assertTrue(texto.contains("." + icono), icono + " no esta en la fuente recortada");
        }
    }
}
