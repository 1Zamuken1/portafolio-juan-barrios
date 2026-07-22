package com.juanbarrios.portfolio.infrastructure.adapter.out.persistence;

import com.juanbarrios.portfolio.domain.model.Experience;
import com.juanbarrios.portfolio.domain.port.out.ExperienceRepositoryPort;
import com.juanbarrios.portfolio.infrastructure.adapter.out.persistence.mapper.ExperienceMapper;
import com.juanbarrios.portfolio.infrastructure.adapter.out.persistence.repository.ExperienceJpaRepository;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Component
public class ExperienceJpaAdapter implements ExperienceRepositoryPort {

    private final ExperienceJpaRepository jpaRepository;

    public ExperienceJpaAdapter(ExperienceJpaRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public List<Experience> findAll() {
        return jpaRepository.findAll().stream()
                .map(ExperienceMapper::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public Optional<Experience> findById(Long id) {
        return jpaRepository.findById(id).map(ExperienceMapper::toDomain);
    }

    @Override
    public Experience save(Experience experience) {
        var entity = ExperienceMapper.toEntity(experience);
        var saved = jpaRepository.save(entity);
        return ExperienceMapper.toDomain(saved);
    }

    @Override
    public void deleteById(Long id) {
        jpaRepository.deleteById(id);
    }
}
