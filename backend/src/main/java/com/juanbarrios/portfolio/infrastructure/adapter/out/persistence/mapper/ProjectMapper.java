package com.juanbarrios.portfolio.infrastructure.adapter.out.persistence.mapper;

import com.juanbarrios.portfolio.domain.model.Project;
import com.juanbarrios.portfolio.infrastructure.adapter.out.persistence.entity.ProjectEntity;

/**
 * Traduce entre Project (dominio) y ProjectEntity (JPA).
 *
 * Ya no hay serializacion a mano: las colecciones y los documentos viajan
 * como columnas JSON, asi que el mapeo es campo a campo. Antes las listas se
 * unian con un separador de dos barras verticales, que se rompia si algun
 * texto lo contenia.
 */
public class ProjectMapper {

    public static Project toDomain(ProjectEntity entity) {
        if (entity == null) return null;

        Project domain = new Project();
        domain.setId(entity.getId());
        domain.setName(entity.getName());
        domain.setSlug(entity.getSlug());
        domain.setType(entity.getType());
        domain.setShortDescription(entity.getShortDescription());
        domain.setFullDescription(entity.getFullDescription());
        domain.setRole(entity.getRole());
        domain.setYear(entity.getYear());
        domain.setStatus(entity.getStatus());
        domain.setTeamSize(entity.getTeamSize());
        domain.setDisplayOrder(entity.getDisplayOrder());
        domain.setImageUrl(entity.getImageUrl());

        domain.setKeywords(entity.getKeywords());
        domain.setTechnologies(entity.getTechnologies());
        domain.setFeatures(entity.getFeatures());
        domain.setHighlights(entity.getHighlights());

        domain.setLinks(entity.getLinks());
        domain.setTechStack(entity.getTechStack());
        domain.setStructuredStack(entity.getStructuredStack());
        domain.setStructuredFeatures(entity.getStructuredFeatures());
        domain.setRawMetrics(entity.getRawMetrics());
        domain.setReadmeMarkdown(entity.getReadmeMarkdown());
        domain.setChallenges(entity.getChallenges());

        domain.setCoreArchitecture(entity.getCoreArchitecture());
        domain.setDatabaseArchitecture(entity.getDatabaseArchitecture());
        domain.setAiArchitecture(entity.getAiArchitecture());

        domain.setArchitectureNodes(entity.getArchitectureNodes());
        domain.setArchitectureEdges(entity.getArchitectureEdges());
        domain.setArchitectureLayout(entity.getArchitectureLayout());

        domain.setGithubUrl(entity.getGithubUrl());
        domain.setLiveUrl(entity.getLiveUrl());

        return domain;
    }

    public static ProjectEntity toEntity(Project domain) {
        if (domain == null) return null;

        ProjectEntity entity = new ProjectEntity();
        entity.setId(domain.getId());
        entity.setName(domain.getName());
        entity.setSlug(domain.getSlug());
        entity.setType(domain.getType());
        entity.setShortDescription(domain.getShortDescription());
        entity.setFullDescription(domain.getFullDescription());
        entity.setRole(domain.getRole());
        entity.setYear(domain.getYear());
        entity.setStatus(domain.getStatus());
        entity.setTeamSize(domain.getTeamSize());
        entity.setDisplayOrder(domain.getDisplayOrder());
        entity.setImageUrl(domain.getImageUrl());

        entity.setKeywords(domain.getKeywords());
        entity.setTechnologies(domain.getTechnologies());
        entity.setFeatures(domain.getFeatures());
        entity.setHighlights(domain.getHighlights());

        entity.setLinks(domain.getLinks());
        entity.setTechStack(domain.getTechStack());
        entity.setStructuredStack(domain.getStructuredStack());
        entity.setStructuredFeatures(domain.getStructuredFeatures());
        entity.setRawMetrics(domain.getRawMetrics());
        entity.setReadmeMarkdown(domain.getReadmeMarkdown());
        entity.setChallenges(domain.getChallenges());

        entity.setCoreArchitecture(domain.getCoreArchitecture());
        entity.setDatabaseArchitecture(domain.getDatabaseArchitecture());
        entity.setAiArchitecture(domain.getAiArchitecture());

        entity.setArchitectureNodes(domain.getArchitectureNodes());
        entity.setArchitectureEdges(domain.getArchitectureEdges());
        entity.setArchitectureLayout(domain.getArchitectureLayout());

        entity.setGithubUrl(domain.getGithubUrl());
        entity.setLiveUrl(domain.getLiveUrl());

        return entity;
    }
}
