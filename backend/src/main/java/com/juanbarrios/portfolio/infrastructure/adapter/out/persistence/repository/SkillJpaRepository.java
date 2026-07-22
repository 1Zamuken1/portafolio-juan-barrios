package com.juanbarrios.portfolio.infrastructure.adapter.out.persistence.repository;

import com.juanbarrios.portfolio.infrastructure.adapter.out.persistence.entity.SkillEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SkillJpaRepository extends JpaRepository<SkillEntity, Long> {
}
