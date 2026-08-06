import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './welcome.component.html',
  styleUrl: './welcome.component.css'
})
export class WelcomeComponent implements OnInit, OnDestroy {
  lineNumbers = Array.from({ length: 30 }, (_, i) => i + 1);
  displayedLines: string[] = [];
  private terminalLines = [
    '$ whoami',
    '> Juan Esteban Barrios',
    '$ cat skills.txt',
    '> Java · Spring Boot · Python · Django · Angular',
    '$ git log --oneline -3',
    '> a4f2c91 feat: arquitectura hexagonal implementada',
    '> 7b3d0e8 feat: CI/CD pipeline con Docker + Render',
    '> c96b77e feat: portafolio VSCode-style redesign',
    '$ echo "Available for hire"',
    '> ✅ Open to Backend / Fullstack roles'
  ];
  private typeTimeout?: ReturnType<typeof setTimeout>;
  private lineIndex = 0;
  typingDone = false;

  ngOnInit() {
    this.typeLine();
  }

  ngOnDestroy() {
    if (this.typeTimeout) clearTimeout(this.typeTimeout);
  }

  private typeLine() {
    if (this.lineIndex >= this.terminalLines.length) {
      this.typingDone = true;
      return;
    }
    this.displayedLines.push(this.terminalLines[this.lineIndex]);
    this.lineIndex++;
    const delay = this.terminalLines[this.lineIndex - 1].startsWith('$') ? 300 : 180;
    this.typeTimeout = setTimeout(() => this.typeLine(), delay);
  }
}
