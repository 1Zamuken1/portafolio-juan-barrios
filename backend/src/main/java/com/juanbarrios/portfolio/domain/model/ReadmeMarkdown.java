package com.juanbarrios.portfolio.domain.model;

/** Secciones en markdown que componen el readme del caso de estudio. */
public record ReadmeMarkdown(
        String objective,
        String architecture,
        String mainFeatures,
        String technologies,
        String learnings
) {}
