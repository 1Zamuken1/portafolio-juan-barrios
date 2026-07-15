import { Component, OnInit, signal, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [CommonModule, ButtonModule, RippleModule, TooltipModule],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.css'
})
export class HeroComponent implements OnInit {
  private platformId = inject(PLATFORM_ID);

  displayedSubtitle = signal('');
  private fullSubtitle = 'Backend Developer | Java & Spring Boot';
  private typewriterIndex = 0;

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.startTypewriter();
    }
  }

  private startTypewriter(): void {
    const interval = setInterval(() => {
      if (this.typewriterIndex < this.fullSubtitle.length) {
        this.displayedSubtitle.set(this.fullSubtitle.slice(0, this.typewriterIndex + 1));
        this.typewriterIndex++;
      } else {
        clearInterval(interval);
      }
    }, 50);
  }

  scrollTo(sectionId: string): void {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
