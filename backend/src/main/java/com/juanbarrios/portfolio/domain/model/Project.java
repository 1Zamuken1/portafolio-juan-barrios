package com.juanbarrios.portfolio.domain.model;

import java.util.List;

/**
 * Domain entity representing a portfolio project.
 * Pure Java - zero framework dependencies.
 */
public class Project {

    private Long id;
    private String name;
    private String shortDescription;
    private String fullDescription;
    private String role;
    private int year;
    private String status;
    private List<String> technologies;
    private List<String> features;
    private List<String> highlights;
    private String githubUrl;
    private String liveUrl;
    private String imageUrl;
    private int displayOrder;

    public Project() {}

    public Project(Long id, String name, String shortDescription, String fullDescription,
                   String role, int year, String status, List<String> technologies,
                   List<String> features, List<String> highlights,
                   String githubUrl, String liveUrl, String imageUrl, int displayOrder) {
        this.id = id;
        this.name = name;
        this.shortDescription = shortDescription;
        this.fullDescription = fullDescription;
        this.role = role;
        this.year = year;
        this.status = status;
        this.technologies = technologies;
        this.features = features;
        this.highlights = highlights;
        this.githubUrl = githubUrl;
        this.liveUrl = liveUrl;
        this.imageUrl = imageUrl;
        this.displayOrder = displayOrder;
    }

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

    public List<String> getTechnologies() { return technologies; }
    public void setTechnologies(List<String> technologies) { this.technologies = technologies; }

    public List<String> getFeatures() { return features; }
    public void setFeatures(List<String> features) { this.features = features; }

    public List<String> getHighlights() { return highlights; }
    public void setHighlights(List<String> highlights) { this.highlights = highlights; }

    public String getGithubUrl() { return githubUrl; }
    public void setGithubUrl(String githubUrl) { this.githubUrl = githubUrl; }

    public String getLiveUrl() { return liveUrl; }
    public void setLiveUrl(String liveUrl) { this.liveUrl = liveUrl; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public int getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(int displayOrder) { this.displayOrder = displayOrder; }
}
