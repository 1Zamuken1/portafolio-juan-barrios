package com.juanbarrios.portfolio.infrastructure.adapter.out.persistence.mapper;

import com.juanbarrios.portfolio.domain.model.Project;
import com.juanbarrios.portfolio.infrastructure.adapter.out.persistence.entity.ProjectEntity;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Maps between Project (domain) and ProjectEntity (JPA).
 * Lists are stored as pipe-separated strings in the DB.
 */
public class ProjectMapper {

    private static final String SEPARATOR = "||";

    public static Project toDomain(ProjectEntity entity) {
        if (entity == null) return null;
        return new Project(
                entity.getId(),
                entity.getName(),
                entity.getShortDescription(),
                entity.getFullDescription(),
                entity.getRole(),
                entity.getYear(),
                entity.getStatus(),
                splitToList(entity.getTechnologies()),
                splitToList(entity.getFeatures()),
                splitToList(entity.getHighlights()),
                entity.getGithubUrl(),
                entity.getLiveUrl(),
                entity.getImageUrl(),
                entity.getDisplayOrder()
        );
    }

    public static ProjectEntity toEntity(Project domain) {
        if (domain == null) return null;
        ProjectEntity entity = new ProjectEntity();
        entity.setId(domain.getId());
        entity.setName(domain.getName());
        entity.setShortDescription(domain.getShortDescription());
        entity.setFullDescription(domain.getFullDescription());
        entity.setRole(domain.getRole());
        entity.setYear(domain.getYear());
        entity.setStatus(domain.getStatus());
        entity.setTechnologies(joinFromList(domain.getTechnologies()));
        entity.setFeatures(joinFromList(domain.getFeatures()));
        entity.setHighlights(joinFromList(domain.getHighlights()));
        entity.setGithubUrl(domain.getGithubUrl());
        entity.setLiveUrl(domain.getLiveUrl());
        entity.setImageUrl(domain.getImageUrl());
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
