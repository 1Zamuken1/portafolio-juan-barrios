package com.juanbarrios.portfolio.infrastructure.adapter.out.persistence.entity;

import com.juanbarrios.portfolio.domain.model.BlueprintEdge;
import com.juanbarrios.portfolio.domain.model.BlueprintLayout;
import com.juanbarrios.portfolio.domain.model.BlueprintNode;
import com.juanbarrios.portfolio.domain.model.Challenge;
import com.juanbarrios.portfolio.domain.model.ProjectLinks;
import com.juanbarrios.portfolio.domain.model.ReadmeMarkdown;
import com.juanbarrios.portfolio.domain.model.TechStackItem;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.List;
import java.util.Map;

/**
 * Entidad JPA de la tabla projects. Vive solo en infraestructura.
 *
 * Los campos con forma de documento se guardan en columnas JSON en vez de en
 * tablas hijas: son claves arbitrarias y colecciones que siempre se leen
 * enteras, nunca por partes. Modelarlos relacionalmente serian ocho tablas y
 * varias de ellas clave-valor.
 *
 * Las listas simples tambien pasan por JSON. Antes se guardaban unidas con un
 * separador de dos barras verticales en una sola columna, lo que corrompia la
 * fila si algun texto contenia ese separador.
 */
@Entity
@Table(name = "projects")
public class ProjectEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String slug;

    /** "type" es palabra habitual en SQL; se renombra la columna por seguridad. */
    @Column(name = "project_type")
    private String type;

    @Column(name = "short_description", length = 500)
    private String shortDescription;

    @Column(name = "full_description", length = 2000)
    private String fullDescription;

    private String role;
    private int year;
    private String status;

    @Column(name = "team_size")
    private Integer teamSize;

    @Column(name = "display_order")
    private int displayOrder;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "core_architecture", length = 1000)
    private String coreArchitecture;

    @Column(name = "database_architecture", length = 1000)
    private String databaseArchitecture;

    @Column(name = "ai_architecture", length = 1000)
    private String aiArchitecture;

    @Column(name = "github_url")
    private String githubUrl;

    @Column(name = "live_url")
    private String liveUrl;

    @JdbcTypeCode(SqlTypes.JSON)
    private List<String> keywords;

    @JdbcTypeCode(SqlTypes.JSON)
    private List<String> technologies;

    @JdbcTypeCode(SqlTypes.JSON)
    private List<String> features;

    @JdbcTypeCode(SqlTypes.JSON)
    private List<String> highlights;

    @JdbcTypeCode(SqlTypes.JSON)
    private ProjectLinks links;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "tech_stack")
    private List<TechStackItem> techStack;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "structured_stack")
    private Map<String, List<String>> structuredStack;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "structured_features")
    private Map<String, List<String>> structuredFeatures;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "raw_metrics")
    private Map<String, Object> rawMetrics;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "readme_markdown")
    private ReadmeMarkdown readmeMarkdown;

    @JdbcTypeCode(SqlTypes.JSON)
    private List<Challenge> challenges;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "architecture_nodes")
    private List<BlueprintNode> architectureNodes;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "architecture_edges")
    private List<BlueprintEdge> architectureEdges;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "architecture_layout")
    private BlueprintLayout architectureLayout;

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

    public String getCoreArchitecture() { return coreArchitecture; }
    public void setCoreArchitecture(String coreArchitecture) { this.coreArchitecture = coreArchitecture; }

    public String getDatabaseArchitecture() { return databaseArchitecture; }
    public void setDatabaseArchitecture(String databaseArchitecture) { this.databaseArchitecture = databaseArchitecture; }

    public String getAiArchitecture() { return aiArchitecture; }
    public void setAiArchitecture(String aiArchitecture) { this.aiArchitecture = aiArchitecture; }

    public String getGithubUrl() { return githubUrl; }
    public void setGithubUrl(String githubUrl) { this.githubUrl = githubUrl; }

    public String getLiveUrl() { return liveUrl; }
    public void setLiveUrl(String liveUrl) { this.liveUrl = liveUrl; }

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

    public List<BlueprintNode> getArchitectureNodes() { return architectureNodes; }
    public void setArchitectureNodes(List<BlueprintNode> architectureNodes) { this.architectureNodes = architectureNodes; }

    public List<BlueprintEdge> getArchitectureEdges() { return architectureEdges; }
    public void setArchitectureEdges(List<BlueprintEdge> architectureEdges) { this.architectureEdges = architectureEdges; }

    public BlueprintLayout getArchitectureLayout() { return architectureLayout; }
    public void setArchitectureLayout(BlueprintLayout architectureLayout) { this.architectureLayout = architectureLayout; }
}
