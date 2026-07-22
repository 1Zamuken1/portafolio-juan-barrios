package com.juanbarrios.portfolio.application.usecase;

import com.juanbarrios.portfolio.domain.model.Project;
import com.juanbarrios.portfolio.domain.port.out.ProjectRepositoryPort;
import java.util.List;
import java.util.Optional;

/**
 * Application service containing all use cases for Project management.
 */
public class ProjectUseCase {

    private final ProjectRepositoryPort projectRepositoryPort;

    public ProjectUseCase(ProjectRepositoryPort projectRepositoryPort) {
        this.projectRepositoryPort = projectRepositoryPort;
    }

    public List<Project> getAllProjects() {
        return projectRepositoryPort.findAll();
    }

    public Optional<Project> getProjectById(Long id) {
        return projectRepositoryPort.findById(id);
    }

    public Project createProject(Project project) {
        return projectRepositoryPort.save(project);
    }

    public Project updateProject(Long id, Project project) {
        projectRepositoryPort.findById(id)
                .orElseThrow(() -> new RuntimeException("Project not found with id: " + id));
        project.setId(id);
        return projectRepositoryPort.save(project);
    }

    public void deleteProject(Long id) {
        projectRepositoryPort.findById(id)
                .orElseThrow(() -> new RuntimeException("Project not found with id: " + id));
        projectRepositoryPort.deleteById(id);
    }
}
