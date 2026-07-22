import { Component, OnInit, OnDestroy, inject, signal, NgZone, ViewChild, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../core/services/data.service';
import { SkillCategory, Skill } from '../../shared/models/skill.model';
import { TabsModule } from 'primeng/tabs';
import { TooltipModule } from 'primeng/tooltip';
import { TimelineModule } from 'primeng/timeline';
import { RippleModule } from 'primeng/ripple';
import { KnowledgePillarsComponent } from './knowledge-pillars/knowledge-pillars.component';
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

  @ViewChild('skillsRing') ringEl!: ElementRef<HTMLElement>;
  @ViewChildren('skillPlanet') planetsEl!: QueryList<ElementRef<HTMLElement>>;

  flatSkills = signal<(Skill & { angle: number; category: string })[]>([]);
  activeTab = signal(0);

  // Hovered skill info (shown in center)
  hoveredSkill = signal<{ name: string; category: string; brandColor: string; brandColorLight?: string; brandColorDark?: string; description?: string } | null>(null);

  // 3D Ring State
  private animationFrameId?: number;
  private isDragging = false;
  private currentRotation = 0;
  private autoRotationSpeed = 0.08; // slower degrees per frame
  private velocity = 0;
  private friction = 0.96;
  private planetHovered = false;

  // Drag tracking (frame-to-frame)
  private prevClientX = 0;
  private frameDelta = 0;

  /** Experience timeline data */
  experience = [
    {
      company: 'Fundación Universitaria Konrad Lorenz',
      role: 'Asistente Webmaster',
      period: 'Oct 2022 — Abr 2023',
      icon: 'fas fa-globe',
      description: 'Gestión del sitio web institucional, optimización SEO, mejoras de accesibilidad, desarrollo en WordPress y refactorización de código legacy.',
      achievements: [
        'Primer resultado en motores de búsqueda para palabras clave principales',
        'Implementación de estándares WCAG',
        'Refactorización completa del sitio Konrad Editores'
      ],
      technologies: ['WordPress', 'PHP', 'JavaScript', 'SEO', 'HTML5', 'CSS3']
    }
  ];

  ngOnInit(): void {
    this.dataService.getSkills().subscribe(data => {
      const allSkills: (Skill & { category: string })[] = [];
      Object.values(data).forEach((cat: any) => {
        cat.skills.forEach((s: Skill) => allSkills.push({ ...s, category: cat.category }));
      });

      const total = allSkills.length;
      const skillsWithAngles = allSkills.map((skill, index) => ({
        ...skill,
        angle: (360 / total) * index
      }));

      this.flatSkills.set(skillsWithAngles);

      this.zone.runOutsideAngular(() => {
        this.startLoop();
      });

      setTimeout(() => {
        gsap.registerPlugin(ScrollTrigger);

        gsap.utils.toArray('.section-title, .subsection-title').forEach((title: any) => {
          gsap.fromTo(title,
            { x: -50, opacity: 0 },
            { x: 0, opacity: 1, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: title, start: 'top 85%' } }
          );
        });

        gsap.fromTo('.skills-3d-scene',
          { y: 80, opacity: 0, scale: 0.9 },
          { 
            y: 0, opacity: 1, scale: 1, duration: 1.5, ease: 'power3.out',
            scrollTrigger: { 
              trigger: '.skills-section', 
              start: 'top 80%',
              onEnter: () => {
                this.velocity = 12; // Initial fast spin that decelerates
              }
            } 
          }
        );

        gsap.fromTo('.experience-card',
          { y: 50, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8, stagger: 0.2, ease: 'power3.out', scrollTrigger: { trigger: '.experience-section', start: 'top 80%' } }
        );

        gsap.fromTo('.contact-card',
          { scale: 0.9, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.6, stagger: 0.1, ease: 'back.out(1.5)', scrollTrigger: { trigger: '.contact-grid', start: 'top 85%' } }
        );
      }, 100);
    });
  }

  ngOnDestroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  // --- Single unified animation loop ---
  private startLoop() {
    const loop = () => {
      if (this.isDragging) {
        // During drag: apply frame delta directly
        this.currentRotation += this.frameDelta;
        this.velocity = this.frameDelta; // Track last frame's delta as velocity
        this.frameDelta = 0; // Consume the delta
      } else if (Math.abs(this.velocity) > 0.02) {
        // Momentum phase: coast and decelerate
        this.currentRotation += this.velocity;
        this.velocity *= this.friction;
      } else if (!this.planetHovered) {
        // Idle: smooth auto-rotation
        this.velocity = 0;
        this.currentRotation += this.autoRotationSpeed;
      }

      // Normalize rotation
      this.currentRotation = this.currentRotation % 360;

      this.applyTransforms();
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  private applyTransforms() {
    if (!this.ringEl) return;

    const rot = this.currentRotation;
    this.ringEl.nativeElement.style.transform = `rotateX(72deg) rotateZ(${rot}deg)`;

    if (!this.planetsEl || this.flatSkills().length === 0) return;

    const skills = this.flatSkills();
    this.planetsEl.forEach((planet, index) => {
      if (index >= skills.length) return;
      const angle = skills[index].angle;
      // Simple counter-rotation: undo local angle + ring rotation, then stand up
      planet.nativeElement.style.transform = `rotateZ(${-angle - rot}deg) rotateX(-72deg)`;
    });
  }

  // --- Hover ---
  onPlanetHover(hovered: boolean, skill?: Skill & { category: string }) {
    this.planetHovered = hovered;
    if (hovered) {
      this.velocity = 0;
    }
    // Update the center label (run inside zone so signal triggers change detection)
    this.zone.run(() => {
      if (hovered && skill) {
        this.hoveredSkill.set({ name: skill.name, category: skill.category, brandColor: skill.brandColor, brandColorLight: skill.brandColorLight, brandColorDark: skill.brandColorDark, description: skill.description });
      } else {
        this.hoveredSkill.set(null);
      }
    });
  }

  // --- Drag ---
  onDragStart(event: MouseEvent | TouchEvent) {
    this.isDragging = true;
    this.velocity = 0;
    this.frameDelta = 0;
    this.prevClientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
  }

  onDragMove(event: MouseEvent | TouchEvent) {
    if (!this.isDragging) return;
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const delta = clientX - this.prevClientX;
    this.prevClientX = clientX;

    // Accumulate frame delta (negated so drag-right = rotate-right visually)
    this.frameDelta -= delta * 0.5;
  }

  onDragEnd() {
    if (!this.isDragging) return;
    this.isDragging = false;
    // velocity is already set from the last frame's delta in the loop
  }
}
