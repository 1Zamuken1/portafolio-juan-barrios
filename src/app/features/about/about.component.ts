import { Component, OnInit, OnDestroy, inject, signal, NgZone, ViewChild, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DataService } from '../../core/services/data.service';
import { AdminSkill } from '../../shared/models/skill.model';
import { Experience } from '../../shared/models/experience.model';
import { TabsModule } from 'primeng/tabs';
import { TooltipModule } from 'primeng/tooltip';
import { TimelineModule } from 'primeng/timeline';
import { RippleModule } from 'primeng/ripple';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { KnowledgePillarsComponent } from './knowledge-pillars/knowledge-pillars.component';
import { ConfigService } from '../../core/services/config.service';
import { environment } from '../../../environments/environment';
import emailjs from '@emailjs/browser';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, TabsModule, TooltipModule, TimelineModule, RippleModule, KnowledgePillarsComponent, ReactiveFormsModule, InputTextModule, TextareaModule, ButtonModule, MessageModule, ToastModule],
  templateUrl: './about.component.html',
  styleUrl: './about.component.css',
  providers: [MessageService]
})
export class AboutComponent implements OnInit, OnDestroy {
  private dataService = inject(DataService);
  private zone = inject(NgZone);
  private messageService = inject(MessageService);
  private configService = inject(ConfigService);
  private fb = inject(FormBuilder);

  @ViewChild('skillsRing') ringEl!: ElementRef<HTMLElement>;
  @ViewChildren('skillPlanet') planetsEl!: QueryList<ElementRef<HTMLElement>>;

  flatSkills = signal<(AdminSkill & { angle: number })[]>([]);
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

  experience = signal<Experience[]>([]);
  contactForm!: FormGroup;
  submitting = signal(false);
  submitted = signal(false);
  submitError = signal<string | undefined>(undefined);

  ngOnInit(): void {
    this.initContactForm();
    this.configService.loadConfig();
    const useStatic = environment.production && environment.useStaticData;
    const exp$ = useStatic
      ? this.dataService.getStaticExperiences()
      : this.dataService.getExperiences();
    const skills$ = useStatic
      ? this.dataService.getStaticSkillsFlat()
      : this.dataService.getAdminSkills();

    exp$.subscribe(data => {
      this.experience.set(data.sort((a, b) => a.displayOrder - b.displayOrder));
    });

    skills$.subscribe(data => {
      const allSkills = data.sort((a, b) => a.displayOrder - b.displayOrder);

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
                this.velocity = 12;
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

  private initContactForm(): void {
    this.contactForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      subject: ['', Validators.required],
      message: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  sendContactForm(): void {
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
        this.submitError.set(undefined);

    const { name, email, subject, message } = this.contactForm.value;

    const templateParams = {
      name: name,
      from_email: email,
      subject: subject,
      message: message,
      to_email: 'juanbarrios072@gmail.com',
      time: new Date().toLocaleString('es-CO')
    };

    const cfg = this.configService.getConfig();
    if (!cfg?.emailjs?.publicKey || !cfg?.emailjs?.serviceId || !cfg?.emailjs?.templateId) {
      this.submitting.set(false);
      this.submitError.set('EmailJS no está configurado. Contacta al administrador.');
      return;
    }

    emailjs.send(cfg.emailjs.serviceId, cfg.emailjs.templateId, templateParams, cfg.emailjs.publicKey)
      .then(() => {
        this.submitting.set(false);
        this.submitted.set(true);
        this.contactForm.reset();
        this.messageService.add({ severity: 'success', summary: 'Enviado', detail: '¡Gracias! Tu mensaje ha sido enviado.' });
      })
      .catch((err: unknown) => {
        this.submitting.set(false);
        this.submitError.set('No se pudo enviar el mensaje. Intenta de nuevo más tarde.');
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Error al enviar el mensaje.' });
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
  onPlanetHover(hovered: boolean, skill?: AdminSkill) {
    this.planetHovered = hovered;
    if (hovered) {
      this.velocity = 0;
    }
    // Update the center label (run inside zone so signal triggers change detection)
    this.zone.run(() => {
      if (hovered && skill) {
        this.hoveredSkill.set({ name: skill.name, category: skill.category, brandColor: skill.color, brandColorLight: skill.brandColorLight, brandColorDark: skill.brandColorDark, description: skill.description });
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
