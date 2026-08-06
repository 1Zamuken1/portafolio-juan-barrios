import { Component, OnInit, OnDestroy, AfterViewInit, inject, signal, ElementRef, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { Project } from '../../shared/models/project.model';
import { environment } from '../../../environments/environment';
import { catchError, timeout } from 'rxjs/operators';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.css'
})
export class ProjectsComponent implements OnInit, OnDestroy, AfterViewInit {
  private dataService = inject(DataService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  project = signal<Project | null>(null);
  loading = signal(true);

  @ViewChild('projectScroller') projectScroller!: ElementRef<HTMLElement>;

  private ctx?: gsap.Context;
  private fragmentSub?: Subscription;
  private isProgrammaticScroll = false;
  private scrollTimeout: any;

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.loadProject(Number(id));
      } else {
        this.loading.set(false);
        this.project.set(null);
      }
    });
  }

  ngAfterViewInit(): void {
    // Watch for project changes to re-init animations
    // We use a small delay so the DOM is rendered
  }

  ngOnDestroy(): void {
    this.ctx?.revert();
    this.fragmentSub?.unsubscribe();
    clearTimeout(this.scrollTimeout);
  }

  private ignoreFragmentUpdate = false;

  private loadProject(id: number): void {
    this.loading.set(true);
    this.ctx?.revert(); // Clean up previous animations

    const request$ = this.dataService.getStaticProjects();

    request$.subscribe({
      next: (data) => {
        const found = data.find(p => p.id === id && p.status !== 'Draft');
        this.project.set(found || null);
        this.loading.set(false);

        // Prevent GSAP from overriding the fragment during initial load
        this.isProgrammaticScroll = true;
        clearTimeout(this.scrollTimeout);

        // Init animations after DOM update
        setTimeout(() => {
          this.initAnimations();
          this.setupFragmentListener();
          
          this.scrollTimeout = setTimeout(() => {
            this.isProgrammaticScroll = false;
          }, 1000);
        }, 50);
      },
      error: (err) => {
        console.error('Error loading project:', err);
        this.loading.set(false);
      }
    });
  }

  private setupFragmentListener(): void {
    if (this.fragmentSub) {
      this.fragmentSub.unsubscribe();
    }

    this.fragmentSub = this.route.fragment.subscribe(frag => {
      if (!frag || this.ignoreFragmentUpdate) return;
      
      const el = document.getElementById(frag);
      if (el && this.projectScroller?.nativeElement) {
        this.isProgrammaticScroll = true;
        clearTimeout(this.scrollTimeout);

        const scroller = this.projectScroller.nativeElement;
        scroller.scrollTo({
          top: el.offsetTop,
          behavior: 'smooth'
        });

        this.scrollTimeout = setTimeout(() => {
          this.isProgrammaticScroll = false;
        }, 1000);
      }
    });
  }

  private initAnimations(): void {
    const scroller = this.projectScroller?.nativeElement;
    if (!scroller) return;

    const sectionIds = ['readme', 'stack', 'features', 'metrics'];

    this.ctx = gsap.context(() => {
      // Parallax effect on the banner image
      gsap.to('.banner-img', {
        yPercent: 30,
        ease: 'none',
        scrollTrigger: {
          trigger: '.project-banner',
          scroller: scroller,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        }
      });

      // Fade-up + slide for each section + sidebar tracking
      gsap.utils.toArray<HTMLElement>('.project-section').forEach((section, i) => {
        const sectionId = section.getAttribute('id') || '';

        gsap.from(section, {
          y: 60,
          opacity: 0,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: section,
            scroller: scroller,
            start: 'top 60%',
            end: 'bottom 40%',
            toggleActions: 'play none none reverse',
            onEnter: () => this.updateFragment(sectionId),
            onEnterBack: () => this.updateFragment(sectionId),
          }
        });
      });

      // Stagger tags
      gsap.fromTo('.tech-card, .tech-tag', 
        { scale: 0.5, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.4,
          stagger: 0.05,
          ease: 'back.out(1.7)',
          scrollTrigger: {
            trigger: '#stack',
            scroller: scroller,
            start: 'top 95%',
            toggleActions: 'play none none reverse',
          }
        }
      );

      // Stagger feature items
      gsap.from('.feature-item', {
        x: -30,
        opacity: 0,
        duration: 0.5,
        stagger: 0.08,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: '#features',
          scroller: scroller,
          start: 'top 85%',
          toggleActions: 'play none none reverse',
        }
      });

      // Stagger highlight items
      gsap.from('.highlight-item', {
        x: 30,
        opacity: 0,
        duration: 0.5,
        stagger: 0.08,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: '#metrics',
          scroller: scroller,
          start: 'top 85%',
          toggleActions: 'play none none reverse',
        }
      });
    }, scroller);
  }

  getMetricKeys(): string[] {
    const metrics = this.project()?.metrics;
    return metrics ? Object.keys(metrics) : [];
  }

  formatMetricLabel(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^\w/, c => c.toUpperCase())
      .trim();
  }

  private updateFragment(fragment: string): void {
    if (!fragment || this.isProgrammaticScroll) return;
    const projectId = this.route.snapshot.paramMap.get('id');
    if (projectId) {
      this.ignoreFragmentUpdate = true;
      this.router.navigate(['/projects', projectId], {
        fragment,
        replaceUrl: true,
        onSameUrlNavigation: 'ignore'
      });
      // Reset after Angular finishes routing
      setTimeout(() => this.ignoreFragmentUpdate = false, 50);
    }
  }
}
