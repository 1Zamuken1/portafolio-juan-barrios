package com.juanbarrios.portfolio.infrastructure.adapter.in.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.juanbarrios.portfolio.application.usecase.BorradorInvalidoException;
import com.juanbarrios.portfolio.application.usecase.DraftProjectUseCase;
import com.juanbarrios.portfolio.domain.model.ProjectDraft;
import com.juanbarrios.portfolio.domain.port.out.DrafterNoDisponibleException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.io.OutputStream;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Redacta un borrador a partir de un readme pegado en el panel.
 *
 * <p><b>Este endpoint nunca guarda nada.</b> Devuelve el borrador para que la
 * persona lo revise en el formulario y decida; el guardado sigue siendo el POST
 * o el PUT de siempre. Separarlo asi evita que una respuesta de un modelo entre
 * sola en la base de datos.
 *
 * <p><b>Requiere autenticacion</b>, no por privacidad del contenido sino porque
 * cada llamada gasta cuota de pago. La proteccion viene de SecurityConfig, que
 * solo abre los GET de /api/** y deja todo lo demas autenticado; lo comprueba
 * {@code DraftControllerTest}.
 */
@RestController
@RequestMapping("/api/projects")
public class DraftController {

    /** Lo que envia el panel: el nombre del proyecto y el readme pegado. */
    public record PeticionBorrador(String name, String readme) {}

    private final DraftProjectUseCase casoDeUso;
    private final ObjectMapper json = new ObjectMapper();

    public DraftController(DraftProjectUseCase casoDeUso) {
        this.casoDeUso = casoDeUso;
    }

    @PostMapping("/draft")
    public ResponseEntity<ProjectDraft> draft(@RequestBody PeticionBorrador peticion) {
        return ResponseEntity.ok(
                casoDeUso.draft(peticion.name(), peticion.readme()));
    }

    /**
     * Lo mismo, pero contando por donde va mientras lo hace.
     *
     * <p>Redactar tarda unos ocho segundos y casi todos son la llamada al
     * modelo. Con la respuesta de una sola vez no hay forma de distinguir "esta
     * pensando" de "se colgo", y cuando falla el motivo llega al final y de
     * golpe. Aqui cada paso sale en cuanto ocurre.
     *
     * <p><b>NDJSON y no SSE</b>: un objeto JSON por linea. SSE tiene a su favor
     * EventSource, pero EventSource solo hace GET y el readme va en el cuerpo;
     * meterlo en la URL seria mandar miles de caracteres por el query. Con
     * NDJSON se lee la respuesta con fetch, que si admite POST.
     *
     * <p><b>El error viaja dentro del cuerpo</b>, no en el codigo de estado. Para
     * cuando falla algo ya se mandaron los 200 y las cabeceras, asi que la
     * unica forma de contarlo es una linea mas. Por eso cada linea lleva
     * {@code etapa}, y la interfaz mira ese campo y no el estado HTTP.
     */
    @PostMapping(value = "/draft/stream", produces = "application/x-ndjson")
    public StreamingResponseBody draftStream(@RequestBody PeticionBorrador peticion) {
        return salida -> {
            try {
                ProjectDraft borrador = casoDeUso.draft(
                        peticion.name(), peticion.readme(),
                        (etapa, detalle) -> escribir(salida, Map.<String, Object>of(
                                "etapa", etapa, "detalle", detalle)));

                escribir(salida, Map.<String, Object>of("etapa", "fin", "borrador", borrador));

            } catch (BorradorInvalidoException e) {
                contarElFallo(salida, error("invalido", e.getMessage()));
            } catch (DrafterNoDisponibleException e) {
                contarElFallo(salida, error("nodisponible", e.getMessage()));
            } catch (StreamCortado e) {
                // Cerraron la pestania o cancelaron a medias. No hay a quien
                // contarselo y no es un fallo que registrar.
            } catch (RuntimeException e) {
                // Sin este catch la excepcion subiria a un contenedor que ya no
                // puede responder nada, y la conexion se cortaria en seco: por
                // fuera se veria igual que un corte de red.
                contarElFallo(salida, error("inesperado",
                        "Fallo inesperado al redactar: " + e.getClass().getSimpleName()));
            }
        };
    }

    /**
     * Manda la linea del fallo, y se calla si tampoco eso se puede.
     *
     * Se escribe desde un catch, y escribir puede fallar a su vez porque la
     * conexion se haya ido: pasa cuando quien miraba cierra la pestania justo
     * cuando algo revienta. Dejar que esa segunda excepcion suba taparia la
     * primera y no arreglaria nada.
     */
    private void contarElFallo(OutputStream salida, Map<String, Object> linea) {
        try {
            escribir(salida, linea);
        } catch (StreamCortado ignorado) {
            // Ya no hay nadie al otro lado.
        }
    }

    /**
     * Los dos casos que distingue la respuesta normal, aqui como tipo.
     *
     * Son los mismos que el 422 y el 503: uno se reintenta revisando la
     * entrada, el otro solo se espera. La diferencia importa igual aunque el
     * estado HTTP ya no pueda expresarla.
     */
    private static Map<String, Object> error(String tipo, String detalle) {
        Map<String, Object> linea = new LinkedHashMap<>();
        linea.put("etapa", "error");
        linea.put("tipo", tipo);
        linea.put("detalle", detalle == null ? "Sin detalle." : detalle);
        return linea;
    }

    /**
     * Manda una linea y la empuja hasta el navegador.
     *
     * El flush no es opcional: sin el, todo se acumula en el buffer y llega
     * junto al final, que es exactamente lo que este endpoint existe para
     * evitar.
     */
    private void escribir(OutputStream salida, Map<String, Object> linea) {
        try {
            salida.write(json.writeValueAsBytes(linea));
            salida.write('\n');
            salida.flush();
        } catch (Exception e) {
            // La conexion se cerro por el otro lado: cerraron la pestania o
            // cancelaron. No hay a quien contarselo.
            throw new StreamCortado(e);
        }
    }

    /** La conexion se fue mientras se escribia. */
    private static class StreamCortado extends RuntimeException {
        StreamCortado(Throwable causa) {
            super(causa);
        }
    }

    /**
     * El borrador llego mal: hay algo que revisar y reintentar.
     *
     * 422 y no 400: la peticion estaba bien formada, lo que no sirve es lo que
     * devolvio el modelo. Distinguirlo importa porque la accion es distinta.
     */
    @ExceptionHandler(BorradorInvalidoException.class)
    public ResponseEntity<Map<String, String>> borradorInvalido(BorradorInvalidoException e) {
        return ResponseEntity.unprocessableEntity().body(Map.of("error", e.getMessage()));
    }

    /** El proveedor no esta disponible: no hay nada que revisar, solo esperar. */
    @ExceptionHandler(DrafterNoDisponibleException.class)
    public ResponseEntity<Map<String, String>> noDisponible(DrafterNoDisponibleException e) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of("error", e.getMessage()));
    }
}
