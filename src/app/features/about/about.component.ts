import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../core/services/data.service';
import { AdminSkill } from '../../shared/models/skill.model';
import { Experience } from '../../shared/models/experience.model';
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

  ngOnInit(): void {
    // Load static immediately for instant rendering
    this.dataService.getStaticExperiences().subscribe(data => {
      this.experience.set(data.sort((a, b) => a.displayOrder - b.displayOrder));
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
