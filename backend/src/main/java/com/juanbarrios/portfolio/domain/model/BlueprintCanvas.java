package com.juanbarrios.portfolio.domain.model;

/** Dimensiones del lienzo sobre el que se dibuja el diagrama. */
public record BlueprintCanvas(
        Integer width,
        Integer height,
        Integer gridSize,
        Boolean showGrid
) {}
