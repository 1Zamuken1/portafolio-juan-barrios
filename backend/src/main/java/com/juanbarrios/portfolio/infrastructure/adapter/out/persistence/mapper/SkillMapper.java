package com.juanbarrios.portfolio.infrastructure.adapter.out.persistence.mapper;

import com.juanbarrios.portfolio.domain.model.Skill;
import com.juanbarrios.portfolio.infrastructure.adapter.out.persistence.entity.SkillEntity;

/**
 * Maps between Skill (domain) and SkillEntity (JPA).
 */
public class SkillMapper {

    public static Skill toDomain(SkillEntity entity) {
        if (entity == null) return null;
        return new Skill(
                entity.getId(),
                entity.getName(),
                entity.getCategory(),
                entity.getIcon(),
                entity.getColor(),
                entity.getDisplayOrder()
        );
    }

    public static SkillEntity toEntity(Skill domain) {
        if (domain == null) return null;
        SkillEntity entity = new SkillEntity();
        entity.setId(domain.getId());
        entity.setName(domain.getName());
        entity.setCategory(domain.getCategory());
        entity.setIcon(domain.getIcon());
        entity.setColor(domain.getColor());
        entity.setDisplayOrder(domain.getDisplayOrder());
        return entity;
    }
}
