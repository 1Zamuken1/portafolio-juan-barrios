package com.juanbarrios.portfolio.application.usecase;

import com.juanbarrios.portfolio.domain.model.Experience;
import com.juanbarrios.portfolio.domain.port.out.ExperienceRepositoryPort;
import java.util.List;
import java.util.Optional;

/**
 * Application service containing all use cases for Experience management.
 */
public class ExperienceUseCase {

    private final ExperienceRepositoryPort experienceRepositoryPort;

    public ExperienceUseCase(ExperienceRepositoryPort experienceRepositoryPort) {
        this.experienceRepositoryPort = experienceRepositoryPort;
    }

    public List<Experience> getAllExperiences() {
        return experienceRepositoryPort.findAll();
    }

    public Optional<Experience> getExperienceById(Long id) {
        return experienceRepositoryPort.findById(id);
    }

    public Experience createExperience(Experience experience) {
        return experienceRepositoryPort.save(experience);
    }

    public Experience updateExperience(Long id, Experience experience) {
        experienceRepositoryPort.findById(id)
                .orElseThrow(() -> new RuntimeException("Experience not found with id: " + id));
        experience.setId(id);
        return experienceRepositoryPort.save(experience);
    }

    public void deleteExperience(Long id) {
        experienceRepositoryPort.findById(id)
                .orElseThrow(() -> new RuntimeException("Experience not found with id: " + id));
        experienceRepositoryPort.deleteById(id);
    }
}
