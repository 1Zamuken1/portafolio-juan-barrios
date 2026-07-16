package com.juanbarrios.portfolio.domain.model;

/**
 * Domain entity representing a technology skill.
 * Pure Java - zero framework dependencies.
 */
public class Skill {

    private Long id;
    private String name;
    private String category;
    private String icon;
    private String color;
    private int displayOrder;

    public Skill() {}

    public Skill(Long id, String name, String category, String icon, String color, int displayOrder) {
        this.id = id;
        this.name = name;
        this.category = category;
        this.icon = icon;
        this.color = color;
        this.displayOrder = displayOrder;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getIcon() { return icon; }
    public void setIcon(String icon) { this.icon = icon; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }

    public int getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(int displayOrder) { this.displayOrder = displayOrder; }
}
