package com.juanbarrios.portfolio.infrastructure.adapter.in.web;

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

    public DraftController(DraftProjectUseCase casoDeUso) {
        this.casoDeUso = casoDeUso;
    }

    @PostMapping("/draft")
    public ResponseEntity<ProjectDraft> draft(@RequestBody PeticionBorrador peticion) {
        return ResponseEntity.ok(
                casoDeUso.draft(peticion.name(), peticion.readme()));
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
