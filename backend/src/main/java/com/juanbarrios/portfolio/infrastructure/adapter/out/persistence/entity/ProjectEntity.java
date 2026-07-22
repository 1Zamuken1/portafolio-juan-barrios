package com.juanbarrios.portfolio.infrastructure.adapter.out.persistence.entity;

import jakarta.persistence.*;

/**
 * JPA Entity for Project table. Lives in infrastructure only.
 * Mapped to/from the domain Project via ProjectMapper.
 */
@Entity
@Table(name = "projects")
public class ProjectEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(name = "short_description", length = 500)
    private String shortDescription;

    @Column(name = "full_description", length = 2000)
    private String fullDescription;

    private String role;
    private int year;
    private String status;

    /** Stored as comma-separated values */
    @Column(length = 1000)
    private String technologies;

    @Column(length = 2000)
    private String features;

    @Column(length = 1000)
    private String highlights;

    @Column(name = "github_url")
    private String githubUrl;

    @Column(name = "live_url")
    private String liveUrl;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "display_order")
    private int displayOrder;

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

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

    public String getTechnologies() { return technologies; }
    public void setTechnologies(String technologies) { this.technologies = technologies; }

    public String getFeatures() { return features; }
    public void setFeatures(String features) { this.features = features; }

    public String getHighlights() { return highlights; }
    public void setHighlights(String highlights) { this.highlights = highlights; }

    public String getGithubUrl() { return githubUrl; }
    public void setGithubUrl(String githubUrl) { this.githubUrl = githubUrl; }

    public String getLiveUrl() { return liveUrl; }
    public void setLiveUrl(String liveUrl) { this.liveUrl = liveUrl; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public int getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(int displayOrder) { this.displayOrder = displayOrder; }
}
