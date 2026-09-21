package com.juanbarrios.portfolio.domain.model;

import java.util.List;

/** Arista del diagrama de arquitectura. */
public record BlueprintEdge(
        String from,
        String to,
        String fromPort,
        String toPort,
        String routeType,
        List<BendPoint> bendPoints,
        String label,
        Integer strokeWidth,
        String strokeDasharray
) {}
