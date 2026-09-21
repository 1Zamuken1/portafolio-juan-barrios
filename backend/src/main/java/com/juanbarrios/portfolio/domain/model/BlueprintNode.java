package com.juanbarrios.portfolio.domain.model;

/**
 * Nodo del diagrama de arquitectura de un proyecto.
 *
 * Las coordenadas son enteros a proposito: el JSON que consume el frontend
 * las escribe sin decimales, y usar punto flotante haria que la exportacion
 * devolviera 505.0 donde antes habia 505, rompiendo la ida y vuelta.
 */
public record BlueprintNode(
        String id,
        String label,
        String description,
        String icon,
        String group,
        String type,
        Integer x,
        Integer y,
        Integer width,
        Integer height
) {}
