package com.juanbarrios.portfolio.domain.port.out;

import com.juanbarrios.portfolio.domain.model.Experience;
import java.util.List;
import java.util.Optional;

/**
 * Output port for Experience persistence.
 */
public interface ExperienceRepositoryPort {
    List<Experience> findAll();
    Optional<Experience> findById(Long id);
    Experience save(Experience experience);
    void deleteById(Long id);
}
