import { Component, OnInit, OnDestroy, inject, signal, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../core/services/data.service';
import { Experience } from '../../shared/models/experience.model';
import { TabsModule } from 'primeng/tabs';
import { TooltipModule } from 'primeng/tooltip';
import { TimelineModule } from 'primeng/timeline';
import { RippleModule } from 'primeng/ripple';
import { KnowledgePillarsComponent } from './knowledge-pillars/knowledge-pillars.component';
import { environment } from '../../../environments/environment';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, TabsModule, TooltipModule, TimelineModule, RippleModule, KnowledgePillarsComponent],
  templateUrl: './about.component.html',
  styleUrl: './about.component.css'
})
export class AboutComponent implements OnInit, OnDestroy {
  private dataService = inject(DataService);
  private zone = inject(NgZone);

  experience = signal<Experience[]>([]);
  activeTab = signal(0);

  ngOnInit(): void {
    const useStatic = environment.production && environment.useStaticData;
    const exp$ = useStatic
      ? this.dataService.getStaticExperiences()
      : this.dataService.getExperiences();

    exp$.subscribe(data => {
      this.experience.set(data.sort((a, b) => a.displayOrder - b.displayOrder));
    });

    setTimeout(() => {
      gsap.registerPlugin(ScrollTrigger);

      gsap.utils.toArray('.section-title, .subsection-title').forEach((title: any) => {
        gsap.fromTo(title,
          { x: -50, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: title, start: 'top 85%' } }
        );
      });

      gsap.fromTo('.experience-card',
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.2, ease: 'power3.out', scrollTrigger: { trigger: '.experience-section', start: 'top 80%' } }
      );

      gsap.fromTo('.contact-card',
        { scale: 0.9, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.6, stagger: 0.1, ease: 'back.out(1.5)', scrollTrigger: { trigger: '.contact-grid', start: 'top 85%' } }
      );
    }, 100);
  }

  ngOnDestroy(): void {
  }
}