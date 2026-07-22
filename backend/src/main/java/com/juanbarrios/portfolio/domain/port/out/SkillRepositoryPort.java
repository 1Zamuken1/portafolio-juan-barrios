package com.juanbarrios.portfolio.domain.port.out;

import com.juanbarrios.portfolio.domain.model.Skill;
import java.util.List;
import java.util.Optional;

/**
 * Output port for Skill persistence.
 */
public interface SkillRepositoryPort {
    List<Skill> findAll();
    Optional<Skill> findById(Long id);
    Skill save(Skill skill);
    void deleteById(Long id);
}
