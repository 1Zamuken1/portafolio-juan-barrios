package com.juanbarrios.portfolio.infrastructure.adapter.out.persistence.entity;

import jakarta.persistence.*;

/**
 * JPA Entity for Skill table.
 */
@Entity
@Table(name = "skills")
public class SkillEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String category;
    private String icon;
    private String color;

    @Column(name = "display_order")
    private int displayOrder;

    private String brandColorLight;
    private String brandColorDark;

    @Column(length = 500)
    private String description;

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

    public String getBrandColorLight() { return brandColorLight; }
    public void setBrandColorLight(String brandColorLight) { this.brandColorLight = brandColorLight; }

    public String getBrandColorDark() { return brandColorDark; }
    public void setBrandColorDark(String brandColorDark) { this.brandColorDark = brandColorDark; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}
