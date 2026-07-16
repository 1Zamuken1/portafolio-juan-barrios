package com.juanbarrios.portfolio.domain.model;

import java.util.List;

/**
 * Domain entity representing a professional experience.
 * Pure Java - zero framework dependencies.
 */
public class Experience {

    private Long id;
    private String company;
    private String role;
    private String period;
    private String description;
    private List<String> achievements;
    private int displayOrder;

    public Experience() {}

    public Experience(Long id, String company, String role, String period,
                      String description, List<String> achievements, int displayOrder) {
        this.id = id;
        this.company = company;
        this.role = role;
        this.period = period;
        this.description = description;
        this.achievements = achievements;
        this.displayOrder = displayOrder;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCompany() { return company; }
    public void setCompany(String company) { this.company = company; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getPeriod() { return period; }
    public void setPeriod(String period) { this.period = period; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public List<String> getAchievements() { return achievements; }
    public void setAchievements(List<String> achievements) { this.achievements = achievements; }

    public int getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(int displayOrder) { this.displayOrder = displayOrder; }
}
