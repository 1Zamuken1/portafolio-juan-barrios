import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../core/services/data.service';
import { AdminSkill } from '../../shared/models/skill.model';
import { Experience } from '../../shared/models/experience.model';
import { Project } from '../../shared/models/project.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './about.component.html',
  styleUrl: './about.component.css'
})
export class AboutComponent implements OnInit {
  private dataService = inject(DataService);

  experience = signal<Experience[]>([]);
  skillsByCategory = signal<{ [category: string]: AdminSkill[] }>({});
  categories = signal<string[]>([]);
  projects = signal<Project[]>([]);

  ngOnInit(): void {
    // Load static immediately for instant rendering
    this.dataService.getStaticExperiences().subscribe(data => {
      this.experience.set(data.sort((a, b) => a.displayOrder - b.displayOrder));
    });

    this.dataService.getStaticProjects().subscribe(data => {
      // Sort to ensure Salsamentaría is first (as per the user's guide order), or just take first 4
      this.projects.set(data.slice(0, 4));
    });

    this.dataService.getStaticSkillsFlat().subscribe(data => {
      const allSkills = data.sort((a, b) => a.displayOrder - b.displayOrder);
      const grouped: { [category: string]: AdminSkill[] } = {};
      const catSet = new Set<string>();

      allSkills.forEach(skill => {
        const cat = skill.category || 'General';
        if (!grouped[cat]) {
          grouped[cat] = [];
        }
        grouped[cat].push(skill);
        catSet.add(cat);
      });

      this.skillsByCategory.set(grouped);
      this.categories.set(Array.from(catSet));
    });
  }
}
