package com.juanbarrios.portfolio.infrastructure.adapter.out.persistence.repository;

import com.juanbarrios.portfolio.infrastructure.adapter.out.persistence.entity.ExperienceEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExperienceJpaRepository extends JpaRepository<ExperienceEntity, Long> {
}
