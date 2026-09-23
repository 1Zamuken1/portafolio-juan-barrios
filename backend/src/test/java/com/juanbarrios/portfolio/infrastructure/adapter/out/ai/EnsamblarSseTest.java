package com.juanbarrios.portfolio.infrastructure.adapter.out.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.BufferedReader;
import java.io.StringReader;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * El lector del flujo de Groq.
 *
 * Es la pieza mas quisquillosa del adaptador y la unica que no se puede
 * comprobar mirandola: prefijos, lineas de mantenimiento, trozos sin contenido y
 * un centinela final. Con un flujo escrito a mano se prueba entera sin red y sin
 * gastar cuota.
 */
class EnsamblarSseTest {

    private static final ObjectMapper JSON = new ObjectMapper();

    /** Ejecuta el ensamblado sobre un cuerpo literal y recoge los trozos. */
    private static Resultado ensamblar(String cuerpo) throws Exception {
        List<String> trozos = new ArrayList<>();
        BufferedReader lector = new BufferedReader(new StringReader(cuerpo));

        // La primera linea la lee quien llama, para mirar si esto era un flujo
        // antes de recorrerlo como tal; aqui se hace lo mismo.
        String primera = lector.readLine();
        while (primera != null && primera.isBlank()) primera = lector.readLine();

        String texto = GroqProjectDrafter.ensamblarSse(primera, lector, JSON, trozos::add);
        return new Resultado(texto, trozos);
    }

    private record Resultado(String texto, List<String> trozos) {}

    private static String trozo(String contenido) {
        return "data: {\"choices\":[{\"delta\":{\"content\":\"" + contenido + "\"}}]}";
    }

    @Test
    @DisplayName("junta los trozos en orden y entrega cada uno segun llega")
    void juntaLosTrozosEnOrden() throws Exception {
        Resultado r = ensamblar(String.join("\n",
                trozo("{\\\"name\\\":"),
                trozo("\\\"Gastu\\\"}"),
                "data: [DONE]"));

        assertEquals("{\"name\":\"Gastu\"}", r.texto());
        // Que llegue entero no basta: el sentido de todo esto es que salga por
        // partes mientras se escribe.
        assertEquals(2, r.trozos().size());
    }

    @Test
    @DisplayName("se para en el centinela y no toma nada de despues")
    void seParaEnElCentinela() throws Exception {
        Resultado r = ensamblar(String.join("\n",
                trozo("hola"),
                "data: [DONE]",
                trozo("esto ya no")));

        assertEquals("hola", r.texto());
    }

    @Test
    @DisplayName("ignora las lineas en blanco y las que no son data")
    void ignoraLoQueNoEsData() throws Exception {
        // Entre trozo y trozo va una linea vacia, y una conexion que tarda
        // recibe comentarios de mantenimiento. Ninguna de las dos trae texto, y
        // tratarlas como si lo trajeran reventaria el parseo.
        Resultado r = ensamblar(String.join("\n",
                ": keep-alive",
                "",
                trozo("uno"),
                "",
                "event: message",
                trozo("dos"),
                "",
                "data: [DONE]",
                ""));

        assertEquals("unodos", r.texto());
        assertEquals(2, r.trozos().size());
    }

    @Test
    @DisplayName("no cuenta como trozo lo que llega sin contenido")
    void noCuentaLoQueLlegaSinContenido() throws Exception {
        // El primer fragmento solo trae el rol y el ultimo solo el motivo de
        // parada. Si contaran, el aviso de "empezo a responder" saldria antes
        // de que hubiera una sola letra.
        Resultado r = ensamblar(String.join("\n",
                "data: {\"choices\":[{\"delta\":{\"role\":\"assistant\"}}]}",
                trozo("texto"),
                "data: {\"choices\":[{\"delta\":{},\"finish_reason\":\"stop\"}]}",
                "data: [DONE]"));

        assertEquals("texto", r.texto());
        assertEquals(List.of("texto"), r.trozos());
    }

    @Test
    @DisplayName("tolera que no venga el centinela final")
    void toleraQueFalteElCentinela() throws Exception {
        // Si la conexion se cierra limpiamente sin [DONE], lo que ya llego
        // sigue siendo texto valido; el JSON incompleto lo cazara el parseo.
        Resultado r = ensamblar(trozo("a medias"));
        assertEquals("a medias", r.texto());
    }

    @Test
    @DisplayName("un flujo vacio devuelve vacio, no un fallo")
    void unFlujoVacioDevuelveVacio() throws Exception {
        // Quien llama distingue este caso y lo cuenta como "respondio sin
        // contenido generado"; aqui no hay nada que decidir.
        assertTrue(ensamblar("").texto().isEmpty());
        assertTrue(ensamblar("data: [DONE]").texto().isEmpty());
    }

    @Test
    @DisplayName("acepta el prefijo sin espacio detras de los dos puntos")
    void aceptaElPrefijoSinEspacio() throws Exception {
        // El espacio tras "data:" es opcional en SSE. Darlo por hecho seria
        // atarse a como lo formatea hoy un proveedor concreto.
        Resultado r = ensamblar("data:{\"choices\":[{\"delta\":{\"content\":\"pegado\"}}]}");
        assertEquals("pegado", r.texto());
    }
}
