package com.juanbarrios.portfolio.infrastructure.adapter.out.persistence.repository;

import com.juanbarrios.portfolio.infrastructure.adapter.out.persistence.entity.ProjectEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectJpaRepository extends JpaRepository<ProjectEntity, Long> {
}
