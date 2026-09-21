package com.juanbarrios.portfolio.domain.model;

import java.util.List;
import java.util.Map;

/**
 * Entidad de dominio de un proyecto del portafolio.
 * Java puro, sin dependencias de framework.
 *
 * Modela todo lo que el sitio publico muestra, no solo lo que cabia en
 * columnas simples: los diagramas de arquitectura, las secciones del readme,
 * el stack estructurado y las metricas. Esos campos tienen forma de documento
 * y se persisten como JSON; ver ProjectEntity.
 */
public class Project {

    private Long id;
    private String name;
    private String slug;
    private String type;
    private String shortDescription;
    private String fullDescription;
    private String role;
    private int year;
    private String status;
    private Integer teamSize;
    private int displayOrder;
    private String imageUrl;

    private List<String> keywords;
    private List<String> technologies;
    private List<String> features;
    private List<String> highlights;

    private ProjectLinks links;
    private List<TechStackItem> techStack;

    /** Claves arbitrarias en lenguaje natural: "Backend", "IA", "Base de datos". */
    private Map<String, List<String>> structuredStack;
    private Map<String, List<String>> structuredFeatures;

    /** Valores mixtos: unas metricas son texto y otras numeros. */
    private Map<String, Object> rawMetrics;

    private ReadmeMarkdown readmeMarkdown;
    private List<Challenge> challenges;

    private String coreArchitecture;
    private String databaseArchitecture;
    private String aiArchitecture;

    private List<BlueprintNode> architectureNodes;
    private List<BlueprintEdge> architectureEdges;
    private BlueprintLayout architectureLayout;

    /** Heredados: el frontend migro a links.github y links.live. */
    private String githubUrl;
    private String liveUrl;

    public Project() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getShortDescription() { return shortDescription; }
    public void setShortDescription(String shortDescription) { this.shortDescription = shortDescription; }

    public String getFullDescription() { return fullDescription; }
    public void setFullDescription(String fullDescription) { this.fullDescription = fullDescription; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public int getYear() { return year; }
    public void setYear(int year) { this.year = year; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Integer getTeamSize() { return teamSize; }
    public void setTeamSize(Integer teamSize) { this.teamSize = teamSize; }

    public int getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(int displayOrder) { this.displayOrder = displayOrder; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public List<String> getKeywords() { return keywords; }
    public void setKeywords(List<String> keywords) { this.keywords = keywords; }

    public List<String> getTechnologies() { return technologies; }
    public void setTechnologies(List<String> technologies) { this.technologies = technologies; }

    public List<String> getFeatures() { return features; }
    public void setFeatures(List<String> features) { this.features = features; }

    public List<String> getHighlights() { return highlights; }
    public void setHighlights(List<String> highlights) { this.highlights = highlights; }

    public ProjectLinks getLinks() { return links; }
    public void setLinks(ProjectLinks links) { this.links = links; }

    public List<TechStackItem> getTechStack() { return techStack; }
    public void setTechStack(List<TechStackItem> techStack) { this.techStack = techStack; }

    public Map<String, List<String>> getStructuredStack() { return structuredStack; }
    public void setStructuredStack(Map<String, List<String>> structuredStack) { this.structuredStack = structuredStack; }

    public Map<String, List<String>> getStructuredFeatures() { return structuredFeatures; }
    public void setStructuredFeatures(Map<String, List<String>> structuredFeatures) { this.structuredFeatures = structuredFeatures; }

    public Map<String, Object> getRawMetrics() { return rawMetrics; }
    public void setRawMetrics(Map<String, Object> rawMetrics) { this.rawMetrics = rawMetrics; }

    public ReadmeMarkdown getReadmeMarkdown() { return readmeMarkdown; }
    public void setReadmeMarkdown(ReadmeMarkdown readmeMarkdown) { this.readmeMarkdown = readmeMarkdown; }

    public List<Challenge> getChallenges() { return challenges; }
    public void setChallenges(List<Challenge> challenges) { this.challenges = challenges; }

    public String getCoreArchitecture() { return coreArchitecture; }
    public void setCoreArchitecture(String coreArchitecture) { this.coreArchitecture = coreArchitecture; }

    public String getDatabaseArchitecture() { return databaseArchitecture; }
    public void setDatabaseArchitecture(String databaseArchitecture) { this.databaseArchitecture = databaseArchitecture; }

    public String getAiArchitecture() { return aiArchitecture; }
    public void setAiArchitecture(String aiArchitecture) { this.aiArchitecture = aiArchitecture; }

    public List<BlueprintNode> getArchitectureNodes() { return architectureNodes; }
    public void setArchitectureNodes(List<BlueprintNode> architectureNodes) { this.architectureNodes = architectureNodes; }

    public List<BlueprintEdge> getArchitectureEdges() { return architectureEdges; }
    public void setArchitectureEdges(List<BlueprintEdge> architectureEdges) { this.architectureEdges = architectureEdges; }

    public BlueprintLayout getArchitectureLayout() { return architectureLayout; }
    public void setArchitectureLayout(BlueprintLayout architectureLayout) { this.architectureLayout = architectureLayout; }

    public String getGithubUrl() { return githubUrl; }
    public void setGithubUrl(String githubUrl) { this.githubUrl = githubUrl; }

    public String getLiveUrl() { return liveUrl; }
    public void setLiveUrl(String liveUrl) { this.liveUrl = liveUrl; }
}
