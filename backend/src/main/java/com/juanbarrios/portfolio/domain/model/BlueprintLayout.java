package com.juanbarrios.portfolio.domain.model;

/** Disposicion del diagrama: orientacion y lienzo. */
public record BlueprintLayout(
        String orientation,
        BlueprintCanvas canvas
) {}
