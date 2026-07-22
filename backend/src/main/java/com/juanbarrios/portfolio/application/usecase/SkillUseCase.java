package com.juanbarrios.portfolio.application.usecase;

import com.juanbarrios.portfolio.domain.model.Skill;
import com.juanbarrios.portfolio.domain.port.out.SkillRepositoryPort;
import java.util.List;
import java.util.Optional;

/**
 * Application service containing all use cases for Skill management.
 */
public class SkillUseCase {

    private final SkillRepositoryPort skillRepositoryPort;

    public SkillUseCase(SkillRepositoryPort skillRepositoryPort) {
        this.skillRepositoryPort = skillRepositoryPort;
    }

    public List<Skill> getAllSkills() {
        return skillRepositoryPort.findAll();
    }

    public Optional<Skill> getSkillById(Long id) {
        return skillRepositoryPort.findById(id);
    }

    public Skill createSkill(Skill skill) {
        return skillRepositoryPort.save(skill);
    }

    public Skill updateSkill(Long id, Skill skill) {
        skillRepositoryPort.findById(id)
                .orElseThrow(() -> new RuntimeException("Skill not found with id: " + id));
        skill.setId(id);
        return skillRepositoryPort.save(skill);
    }

    public void deleteSkill(Long id) {
        skillRepositoryPort.findById(id)
                .orElseThrow(() -> new RuntimeException("Skill not found with id: " + id));
        skillRepositoryPort.deleteById(id);
    }
}
