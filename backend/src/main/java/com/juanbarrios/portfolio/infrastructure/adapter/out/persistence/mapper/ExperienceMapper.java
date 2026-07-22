package com.juanbarrios.portfolio.infrastructure.adapter.out.persistence.mapper;

import com.juanbarrios.portfolio.domain.model.Experience;
import com.juanbarrios.portfolio.infrastructure.adapter.out.persistence.entity.ExperienceEntity;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Maps between Experience (domain) and ExperienceEntity (JPA).
 */
public class ExperienceMapper {

    private static final String SEPARATOR = "||";

    public static Experience toDomain(ExperienceEntity entity) {
        if (entity == null) return null;
        return new Experience(
                entity.getId(),
                entity.getCompany(),
                entity.getRole(),
                entity.getPeriod(),
                entity.getDescription(),
                splitToList(entity.getAchievements()),
                entity.getDisplayOrder()
        );
    }

    public static ExperienceEntity toEntity(Experience domain) {
        if (domain == null) return null;
        ExperienceEntity entity = new ExperienceEntity();
        entity.setId(domain.getId());
        entity.setCompany(domain.getCompany());
        entity.setRole(domain.getRole());
        entity.setPeriod(domain.getPeriod());
        entity.setDescription(domain.getDescription());
        entity.setAchievements(joinFromList(domain.getAchievements()));
        entity.setDisplayOrder(domain.getDisplayOrder());
        return entity;
    }

    private static List<String> splitToList(String value) {
        if (value == null || value.isBlank()) return Collections.emptyList();
        return Arrays.stream(value.split("\\|\\|"))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
    }

    private static String joinFromList(List<String> list) {
        if (list == null || list.isEmpty()) return "";
        return String.join(SEPARATOR, list);
    }
}
