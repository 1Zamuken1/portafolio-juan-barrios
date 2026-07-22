package com.juanbarrios.portfolio.infrastructure.adapter.out.persistence;

import com.juanbarrios.portfolio.domain.model.Skill;
import com.juanbarrios.portfolio.domain.port.out.SkillRepositoryPort;
import com.juanbarrios.portfolio.infrastructure.adapter.out.persistence.mapper.SkillMapper;
import com.juanbarrios.portfolio.infrastructure.adapter.out.persistence.repository.SkillJpaRepository;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Component
public class SkillJpaAdapter implements SkillRepositoryPort {

    private final SkillJpaRepository jpaRepository;

    public SkillJpaAdapter(SkillJpaRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public List<Skill> findAll() {
        return jpaRepository.findAll().stream()
                .map(SkillMapper::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public Optional<Skill> findById(Long id) {
        return jpaRepository.findById(id).map(SkillMapper::toDomain);
    }

    @Override
    public Skill save(Skill skill) {
        var entity = SkillMapper.toEntity(skill);
        var saved = jpaRepository.save(entity);
        return SkillMapper.toDomain(saved);
    }

    @Override
    public void deleteById(Long id) {
        jpaRepository.deleteById(id);
    }
}
