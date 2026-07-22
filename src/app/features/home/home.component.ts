import { Component, OnInit, OnDestroy, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavbarComponent } from '../../layout/navbar/navbar.component';
import { HeroComponent } from '../hero/hero.component';
import { ProjectsComponent } from '../projects/projects.component';
import { AboutComponent } from '../about/about.component';
import { FooterComponent } from '../../layout/footer/footer.component';
import { ScrollTopModule } from 'primeng/scrolltop';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [NavbarComponent, HeroComponent, ProjectsComponent, AboutComponent, FooterComponent, ScrollTopModule],
  templateUrl: './home.component.html'
})
export class HomeComponent implements OnInit, OnDestroy {
  private lenis: Lenis | undefined;
  private platformId = inject(PLATFORM_ID);

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
