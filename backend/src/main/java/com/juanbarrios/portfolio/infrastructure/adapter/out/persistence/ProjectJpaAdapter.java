package com.juanbarrios.portfolio.infrastructure.adapter.out.persistence;

import com.juanbarrios.portfolio.domain.model.Project;
import com.juanbarrios.portfolio.domain.port.out.ProjectRepositoryPort;
import com.juanbarrios.portfolio.infrastructure.adapter.out.persistence.mapper.ProjectMapper;
import com.juanbarrios.portfolio.infrastructure.adapter.out.persistence.repository.ProjectJpaRepository;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Output adapter that implements the domain port using Spring Data JPA.
 */
@Component
public class ProjectJpaAdapter implements ProjectRepositoryPort {

    private final ProjectJpaRepository jpaRepository;

    public ProjectJpaAdapter(ProjectJpaRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public List<Project> findAll() {
        return jpaRepository.findAll().stream()
                .map(ProjectMapper::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public Optional<Project> findById(Long id) {
        return jpaRepository.findById(id).map(ProjectMapper::toDomain);
    }

    @Override
    public Project save(Project project) {
        var entity = ProjectMapper.toEntity(project);
        var saved = jpaRepository.save(entity);
        return ProjectMapper.toDomain(saved);
    }

    @Override
    public void deleteById(Long id) {
        jpaRepository.deleteById(id);
    }
}
