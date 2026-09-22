package com.juanbarrios.portfolio.domain.model;

import java.util.List;

/**
 * Borrador de los campos de prosa de un proyecto, redactado a partir de un
 * readme.
 *
 * Deliberadamente NO es un {@link Project}: un borrador nunca se persiste. Se
 * devuelve para que una persona lo revise y lo pegue en el formulario, y de ahi
 * sigue el camino normal de guardado. Si esto fuera un Project seria demasiado
 * facil enviarlo directo al repositorio.
 *
 * Solo lleva prosa. Los campos con vocabulario propio (techStack y sus iconos
 * devicon, structuredStack, structuredFeatures, rawMetrics) quedan fuera a
 * proposito: sus claves ya son inconsistentes entre proyectos --conviven
 * "Arquitectura" y "Architecture", "IA" y "Artificial Intelligence", y tres
 * variantes de "Formatos de exportacion"-- y un modelo generandolas libremente
 * anadiria una cuarta cada vez. Los iconos son peor todavia: son clases CSS
 * concretas que el modelo no puede adivinar, solo acertar por casualidad.
 * Los diagramas tambien quedan fuera: colocar nodos sin solapamientos es un
 * problema de layout, no de redaccion.
 */
public record ProjectDraft(
        String shortDescription,
        String fullDescription,
        ReadmeMarkdown readmeMarkdown,
        List<Challenge> challenges
) {}
