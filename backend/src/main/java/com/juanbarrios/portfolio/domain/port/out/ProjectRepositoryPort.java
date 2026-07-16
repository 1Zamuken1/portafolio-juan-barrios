package com.juanbarrios.portfolio.domain.port.out;

import com.juanbarrios.portfolio.domain.model.Project;
import java.util.List;
import java.util.Optional;

/**
 * Output port for Project persistence.
 * Defined in domain - implemented by infrastructure adapters.
 */
public interface ProjectRepositoryPort {
    List<Project> findAll();
    Optional<Project> findById(Long id);
    Project save(Project project);
    void deleteById(Long id);
}
