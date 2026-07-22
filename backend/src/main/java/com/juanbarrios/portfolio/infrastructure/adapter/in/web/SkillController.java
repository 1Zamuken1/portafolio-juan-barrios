package com.juanbarrios.portfolio.infrastructure.adapter.in.web;

import com.juanbarrios.portfolio.application.usecase.SkillUseCase;
import com.juanbarrios.portfolio.domain.model.Skill;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/skills")
public class SkillController {

    private final SkillUseCase skillUseCase;

    public SkillController(SkillUseCase skillUseCase) {
        this.skillUseCase = skillUseCase;
    }

    @GetMapping
    public ResponseEntity<List<Skill>> getAll() {
        return ResponseEntity.ok(skillUseCase.getAllSkills());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Skill> getById(@PathVariable Long id) {
        return skillUseCase.getSkillById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Skill> create(@RequestBody Skill skill) {
        Skill created = skillUseCase.createSkill(skill);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Skill> update(@PathVariable Long id, @RequestBody Skill skill) {
        Skill updated = skillUseCase.updateSkill(id, skill);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        skillUseCase.deleteSkill(id);
        return ResponseEntity.noContent().build();
    }
}
