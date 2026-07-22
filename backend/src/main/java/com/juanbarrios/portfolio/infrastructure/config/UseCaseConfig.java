package com.juanbarrios.portfolio.infrastructure.config;

import com.juanbarrios.portfolio.application.usecase.ExperienceUseCase;
import com.juanbarrios.portfolio.application.usecase.ProjectUseCase;
import com.juanbarrios.portfolio.application.usecase.SkillUseCase;
import com.juanbarrios.portfolio.domain.port.out.ExperienceRepositoryPort;
import com.juanbarrios.portfolio.domain.port.out.ProjectRepositoryPort;
import com.juanbarrios.portfolio.domain.port.out.SkillRepositoryPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Spring configuration that wires Use Cases as beans.
 * This is the ONLY place where we connect domain ports to infrastructure adapters.
 */
@Configuration
public class UseCaseConfig {

    @Bean
    public ProjectUseCase projectUseCase(ProjectRepositoryPort projectRepositoryPort) {
        return new ProjectUseCase(projectRepositoryPort);
    }

    @Bean
    public SkillUseCase skillUseCase(SkillRepositoryPort skillRepositoryPort) {
        return new SkillUseCase(skillRepositoryPort);
    }

    @Bean
    public ExperienceUseCase experienceUseCase(ExperienceRepositoryPort experienceRepositoryPort) {
        return new ExperienceUseCase(experienceRepositoryPort);
    }

    @Bean
    public com.juanbarrios.portfolio.application.usecase.AuthUseCase authUseCase(
            com.juanbarrios.portfolio.domain.port.out.JwtPort jwtPort,
            @org.springframework.beans.factory.annotation.Value("${admin.username}") String adminUsername,
            @org.springframework.beans.factory.annotation.Value("${admin.password}") String adminPassword) {
        return new com.juanbarrios.portfolio.application.usecase.AuthUseCase(jwtPort, adminUsername, adminPassword);
    }
}
