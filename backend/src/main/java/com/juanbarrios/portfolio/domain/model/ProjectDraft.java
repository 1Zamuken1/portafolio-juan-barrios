package com.juanbarrios.portfolio.domain.model;

import java.util.List;
import java.util.Map;

/**
 * Borrador de los campos de prosa de un proyecto, redactado a partir de un
 * readme.
 *
 * Deliberadamente NO es un {@link Project}: un borrador nunca se persiste. Se
 * devuelve para que una persona lo revise y lo pegue en el formulario, y de ahi
 * sigue el camino normal de guardado. Si esto fuera un Project seria demasiado
 * facil enviarlo directo al repositorio.
 *
 * <p>Lleva tambien las listas (funcionalidades, destacados, palabras clave) y
 * los tres resumenes de arquitectura. Son opcionales a proposito: un readme
 * que no nombra base de datos ni IA tiene que devolverlos vacios, no
 * inventados. Vacio quiere decir "el readme no lo dice", y el formulario deja
 * entonces lo que hubiera.
 *
 * <p>Lo que sigue fuera son los campos con vocabulario propio (techStack y sus iconos
 * devicon, structuredStack, structuredFeatures, rawMetrics) quedan fuera a
 * proposito: sus claves ya son inconsistentes entre proyectos --conviven
 * "Arquitectura" y "Architecture", "IA" y "Artificial Intelligence", y tres
 * variantes de "Formatos de exportacion"-- y un modelo generandolas libremente
 * anadiria una cuarta cada vez. Los iconos son peor todavia: son clases CSS
 * concretas que el modelo no puede adivinar, solo acertar por casualidad.
 *
 * <p>El diagrama de arquitectura si entra, pero partido: el modelo propone las
 * piezas y quien llama a quien, y las coordenadas las pone
 * {@link com.juanbarrios.portfolio.domain.service.MaquetadorDeDiagrama}.
 * Colocar nodos sin solapamientos es un problema de maquetacion, no de
 * redaccion. Y el enlace al repositorio solo sale si esta escrito en el readme.
 *
 * <p>El nombre si entra, aunque no sea prosa. Antes habia que escribirlo a mano
 * <b>antes</b> de poder redactar, y eso ponia un paso manual delante del
 * automatico justo cuando el dato ya estaba en el readme. Ademas el titulo de
 * un repositorio suele venir como identificador --"tsuki-translator"-- y
 * convertirlo en algo legible es precisamente redactar.
 */
public record ProjectDraft(
        String name,
        String shortDescription,
        String fullDescription,
        ReadmeMarkdown readmeMarkdown,
        List<Challenge> challenges,
        List<String> features,
        List<String> highlights,
        List<String> keywords,
        String coreArchitecture,
        String databaseArchitecture,
        String aiArchitecture,
        ProjectLinks links,
        List<BlueprintNode> architectureNodes,
        List<BlueprintEdge> architectureEdges,
        BlueprintLayout architectureLayout,
        Map<String, List<String>> structuredStack,
        Map<String, List<String>> structuredFeatures
) {

    /** Un borrador solo con la prosa: listas y arquitectura sin decir. */
    public ProjectDraft(String name, String shortDescription, String fullDescription,
                        ReadmeMarkdown readmeMarkdown, List<Challenge> challenges) {
        this(name, shortDescription, fullDescription, readmeMarkdown, challenges,
                null, null, null, null, null, null);
    }

    /** Con listas y arquitectura, sin enlace ni diagrama. */
    public ProjectDraft(String name, String shortDescription, String fullDescription,
                        ReadmeMarkdown readmeMarkdown, List<Challenge> challenges,
                        List<String> features, List<String> highlights, List<String> keywords,
                        String coreArchitecture, String databaseArchitecture, String aiArchitecture) {
        this(name, shortDescription, fullDescription, readmeMarkdown, challenges,
                features, highlights, keywords, coreArchitecture, databaseArchitecture, aiArchitecture,
                null, null, null, null, null, null);
    }

    /** El mismo borrador con otro enlace. */
    public ProjectDraft conEnlaces(ProjectLinks otros) {
        return new ProjectDraft(name, shortDescription, fullDescription, readmeMarkdown, challenges,
                features, highlights, keywords, coreArchitecture, databaseArchitecture, aiArchitecture,
                otros, architectureNodes, architectureEdges, architectureLayout,
                structuredStack, structuredFeatures);
    }

    /** El mismo borrador con el diagrama ya colocado. */
    public ProjectDraft conDiagrama(List<BlueprintNode> nodos, List<BlueprintEdge> aristas, BlueprintLayout layout) {
        return new ProjectDraft(name, shortDescription, fullDescription, readmeMarkdown, challenges,
                features, highlights, keywords, coreArchitecture, databaseArchitecture, aiArchitecture,
                links, nodos, aristas, layout, structuredStack, structuredFeatures);
    }

    /** El mismo borrador con el stack y las caracteristicas por grupos. */
    public ProjectDraft conEstructura(Map<String, List<String>> stack, Map<String, List<String>> grupos) {
        return new ProjectDraft(name, shortDescription, fullDescription, readmeMarkdown, challenges,
                features, highlights, keywords, coreArchitecture, databaseArchitecture, aiArchitecture,
                links, architectureNodes, architectureEdges, architectureLayout, stack, grupos);
    }
}
