package com.juanbarrios.portfolio.infrastructure.adapter.in.web;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Comprobacion de salud para el proveedor de hosting.
 *
 * No consulta la base de datos a proposito. Render marca un despliegue como
 * fallido si su ruta de salud no responde 2xx, y apuntarla a un endpoint de
 * datos crea un punto muerto: si una tabla queda rota, la comprobacion falla,
 * el despliegue no se promueve y el arreglo que repararia la tabla no llega a
 * entrar nunca.
 *
 * Paso de verdad: la ruta de salud era /api/projects, esa tabla quedo sin
 * crear por un dialecto equivocado, y el despliegue con la correccion se
 * quedo bloqueado detras de su propio sintoma.
 */
@RestController
@RequestMapping("/api/health")
public class HealthController {

    @GetMapping
    public ResponseEntity<Map<String, String>> salud() {
        return ResponseEntity.ok(Map.of("status", "UP"));
    }
}
