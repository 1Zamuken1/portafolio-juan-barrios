package com.juanbarrios.portfolio.testsupport;

import com.juanbarrios.portfolio.domain.model.BendPoint;
import com.juanbarrios.portfolio.domain.model.BlueprintCanvas;
import com.juanbarrios.portfolio.domain.model.BlueprintEdge;
import com.juanbarrios.portfolio.domain.model.BlueprintLayout;
import com.juanbarrios.portfolio.domain.model.BlueprintNode;
import com.juanbarrios.portfolio.domain.model.Challenge;
import com.juanbarrios.portfolio.domain.model.Project;
import com.juanbarrios.portfolio.domain.model.ProjectLinks;
import com.juanbarrios.portfolio.domain.model.ReadmeMarkdown;
import com.juanbarrios.portfolio.domain.model.TechStackItem;

import java.util.List;
import java.util.Map;

/**
 * Proyecto con todos los campos poblados, para los tests de mapeo y
 * persistencia.
 *
 * Reproduce las formas dificiles de los datos reales: claves arbitrarias en
 * lenguaje natural, metricas con valores de tipos mezclados y aristas
 * heterogeneas, unas con puertos y otras con vertices explicitos.
 */
public final class ProjectFixture {

    private ProjectFixture() {}

    public static Project completo() {
        Project p = new Project();
        p.setId(1L);
        p.setName("Gastu Django");
        p.setSlug("gastu-django");
        p.setType("Web Application");
        p.setShortDescription("Sistema de gestion financiera personal con IA.");
        p.setFullDescription("Descripcion larga del caso de estudio.");
        p.setRole("Product Owner - Backend Developer");
        p.setYear(2026);
        p.setStatus("Produccion");
        p.setTeamSize(4);
        p.setDisplayOrder(1);
        p.setImageUrl("/assets/images/projects/gastu-django.png");

        p.setKeywords(List.of("finanzas", "ia", "django"));
        p.setTechnologies(List.of("Python", "Django"));
        p.setFeatures(List.of("Autenticacion hibrida", "Reportes"));
        p.setHighlights(List.of("4 desarrolladores", "En produccion"));

        p.setLinks(new ProjectLinks("https://github.com/1Zamuken1/gastu", null, null));
        p.setTechStack(List.of(
                new TechStackItem("Python", "devicon-python-plain"),
                new TechStackItem("Django", "devicon-django-plain")
        ));

        p.setStructuredStack(Map.of(
                "backend", List.of("Python", "Django ORM"),
                "database", List.of("SQLite", "PostgreSQL")
        ));
        p.setStructuredFeatures(Map.of(
                "Autenticacion", List.of("Google OAuth", "Email"),
                "Reportes", List.of("PDF", "Excel")
        ));

        // Valores de tipos mezclados, como en los datos reales.
        p.setRawMetrics(Map.of(
                "Modulos principales", 7,
                "Estado", "Produccion"
        ));

        p.setReadmeMarkdown(new ReadmeMarkdown(
                "Objetivo del proyecto.",
                "Arquitectura por capas.",
                "Funcionalidades principales.",
                "Tecnologias empleadas.",
                "Aprendizajes obtenidos."
        ));

        p.setChallenges(List.of(
                new Challenge("Autenticacion hibrida", "Coexistencia de logins sociales y tradicionales.")
        ));

        p.setCoreArchitecture("Django Apps + Services Layer");
        p.setDatabaseArchitecture("SQLite / PostgreSQL");
        p.setAiArchitecture("Gemini Flash + Groq Fallback");

        p.setArchitectureNodes(List.of(
                new BlueprintNode("landing", "Landing", "Entrada principal.", "pi pi-home",
                        "client", "primary", 80, 80, 250, 96),
                new BlueprintNode("auth", "Authentication", "Identidad y acceso.", "pi pi-lock",
                        "application", "secondary", 460, 240, 250, 96)
        ));

        p.setArchitectureEdges(List.of(
                // Con puertos explicitos.
                new BlueprintEdge("landing", "auth", "right", "left", "orthogonal",
                        null, null, null, null),
                // Con vertices a mano, el escape para trazados que no salen limpios.
                new BlueprintEdge("auth", "landing", null, null, null,
                        List.of(new BendPoint(505, 176), new BendPoint(505, 208)),
                        "vuelve", 2, "6 4")
        ));

        p.setArchitectureLayout(new BlueprintLayout(
                "freeform",
                new BlueprintCanvas(1800, 900, 40, true)
        ));

        p.setGithubUrl("https://github.com/1Zamuken1/gastu");
        p.setLiveUrl("https://gastu.example.com");

        return p;
    }
}
