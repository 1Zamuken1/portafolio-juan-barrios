import { Component, OnInit, OnDestroy, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavbarComponent } from './layout/navbar/navbar.component';
import { FooterComponent } from './layout/footer/footer.component';
import { HeroComponent } from './features/hero/hero.component';
import { ProjectsComponent } from './features/projects/projects.component';
import { AboutComponent } from './features/about/about.component';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollTopModule } from 'primeng/scrolltop';
import Lenis from 'lenis';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    NavbarComponent,
    FooterComponent,
    HeroComponent,
    ProjectsComponent,
    AboutComponent,
    ScrollTopModule
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class App implements OnInit, OnDestroy {
  private lenis: Lenis | undefined;
  private platformId = inject(PLATFORM_ID);
  private animationFrameId: number | undefined;

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      gsap.registerPlugin(ScrollTrigger);
      
      this.lenis = new Lenis({
        autoRaf: false, // Let GSAP drive the requestAnimationFrame
        lerp: 0.1,
        smoothWheel: true
      });
      
      // Sync Lenis scroll with GSAP ScrollTrigger
      this.lenis.on('scroll', ScrollTrigger.update);

      gsap.ticker.add((time) => {
        this.lenis?.raf(time * 1000);
      });
      gsap.ticker.lagSmoothing(0);
    }
  }

  ngOnDestroy(): void {
    if (this.lenis) {
      this.lenis.destroy();
    }
  }
}
