package com.juanbarrios.portfolio.infrastructure.adapter.in.web;

import com.juanbarrios.portfolio.application.usecase.ExperienceUseCase;
import com.juanbarrios.portfolio.domain.model.Experience;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/experiences")
public class ExperienceController {

    private final ExperienceUseCase experienceUseCase;

    public ExperienceController(ExperienceUseCase experienceUseCase) {
        this.experienceUseCase = experienceUseCase;
    }

    @GetMapping
    public ResponseEntity<List<Experience>> getAll() {
        return ResponseEntity.ok(experienceUseCase.getAllExperiences());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Experience> getById(@PathVariable Long id) {
        return experienceUseCase.getExperienceById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Experience> create(@RequestBody Experience experience) {
        Experience created = experienceUseCase.createExperience(experience);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Experience> update(@PathVariable Long id, @RequestBody Experience experience) {
        Experience updated = experienceUseCase.updateExperience(id, experience);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        experienceUseCase.deleteExperience(id);
        return ResponseEntity.noContent().build();
    }
}
