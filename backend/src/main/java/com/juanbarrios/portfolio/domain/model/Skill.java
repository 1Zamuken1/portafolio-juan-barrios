package com.juanbarrios.portfolio.domain.model;

/**
 * Domain entity representing a technology skill.
 * Pure Java - zero framework dependencies.
 */
public class Skill {

    private Long id;
    private String name;
    private String category;

    /**
     * Color de la categoria a la que pertenece, no del skill.
     *
     * Va desnormalizado en cada skill en vez de en una tabla de categorias:
     * son cuatro categorias y el panel de administracion las edita planas. El
     * valor se repite entre los skills de una misma categoria; la exportacion
     * toma el del primero.
     */
    private String categoryColor;

    private String icon;
    private String color;
    private String brandColorLight;
    private String brandColorDark;
    private String description;
    private int displayOrder;

    public Skill() {}

    public Skill(Long id, String name, String category, String icon, String color, String brandColorLight, String brandColorDark, String description, int displayOrder) {
        this.id = id;
        this.name = name;
        this.category = category;
        this.icon = icon;
        this.color = color;
        this.brandColorLight = brandColorLight;
        this.brandColorDark = brandColorDark;
        this.description = description;
        this.displayOrder = displayOrder;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getCategoryColor() { return categoryColor; }
    public void setCategoryColor(String categoryColor) { this.categoryColor = categoryColor; }

    public String getIcon() { return icon; }
    public void setIcon(String icon) { this.icon = icon; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }

    public int getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(int displayOrder) { this.displayOrder = displayOrder; }

    public String getBrandColorLight() { return brandColorLight; }
    public void setBrandColorLight(String brandColorLight) { this.brandColorLight = brandColorLight; }

    public String getBrandColorDark() { return brandColorDark; }
    public void setBrandColorDark(String brandColorDark) { this.brandColorDark = brandColorDark; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}
