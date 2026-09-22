import { Component, OnInit, OnDestroy, AfterViewInit, inject, signal, ElementRef, ViewChild, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { Subscription, filter, startWith } from 'rxjs';
import { DataService } from '../../core/services/data.service';
import { AdminSkill } from '../../shared/models/skill.model';
import { Experience } from '../../shared/models/experience.model';
import { Project } from '../../shared/models/project.model';
import { SeoService } from '../../core/services/seo.service';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './about.component.html',
  styleUrl: './about.component.css'
})
export class AboutComponent implements OnInit, AfterViewInit, OnDestroy {
  private dataService = inject(DataService);
  private seo = inject(SeoService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  @ViewChild('cuerpo') cuerpo?: ElementRef<HTMLElement>;
  private fragmentoSub?: Subscription;

  experience = signal<Experience[]>([]);
  skillsByCategory = signal<{ [category: string]: AdminSkill[] }>({});
  categories = signal<string[]>([]);
  projects = signal<Project[]>([]);

  ngOnInit(): void {
    this.seo.update({
      title: 'Sobre mí',
      description: 'Perfil profesional de Juan Esteban Barrios: experiencia, stack tecnológico y trayectoria como desarrollador backend en Java, Spring Boot, Python y Django.',
      path: '/about',
      type: 'profile'
    });

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

  /**
   * Lleva la vista a la seccion que pide el fragmento de la URL.
   *
   * El explorador enlaza a /about#experience y /about#stack, pero el salto
   * nativo del navegador no sirve aqui: quien tiene el scroll es `.doc-body`,
   * no la ventana. Sin esto los dos enlaces cambiaban la URL y la pestana y
   * dejaban al visitante arriba del todo, como si no hubieran hecho nada.
   */
  ngAfterViewInit(): void {
    if (!this.isBrowser) return;

    // Se escuchan los eventos del router y no `route.fragment`. Medido: al
    // pulsar un fichero del explorador estando ya en /about, la URL cambia a
    // /about#stack, el componente NO se recrea y `route.fragment` no llega a
    // emitir, asi que el salto no ocurria. Entrando directamente por URL si
    // funcionaba, que es lo que hacia el fallo tan confuso. NavigationEnd si
    // dispara en los dos casos.
    this.fragmentoSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd), startWith(null))
      .subscribe(() => {
        const fragmento = this.route.snapshot.fragment;
        if (fragmento) this.esperarYSaltar(fragmento);
      });
  }

  /**
   * Espera a que la seccion exista y a que el documento deje de crecer.
   *
   * Un retardo fijo no vale. Al navegar con fragmento el componente se recrea,
   * y sus secciones se dibujan con datos que llegan por suscripcion: a los 60
   * milisegundos a veces estaban y a veces no, asi que el salto funcionaba o
   * no segun la maquina. Aqui se reintenta hasta que la altura del documento
   * se repite, que es la senal de que ya esta todo pintado.
   */
  private esperarYSaltar(fragmento: string, intento = 0, alturaPrevia = -1): void {
    const cuerpo = this.cuerpo?.nativeElement;
    const destino = document.getElementById(fragmento);
    const altura = cuerpo?.scrollHeight ?? 0;

    const listo = !!cuerpo && !!destino && altura === alturaPrevia;
    if (listo) {
      this.irA(fragmento);
      return;
    }
    // Un segundo de margen: si a estas alturas no ha aparecido, no va a
    // aparecer, y seguir reintentando solo gastaria ciclos.
    if (intento >= 20) return;

    setTimeout(() => this.esperarYSaltar(fragmento, intento + 1, altura), 50);
  }

  private irA(fragmento: string): void {
    const destino = document.getElementById(fragmento);
    const cuerpo = this.cuerpo?.nativeElement;
    if (!destino || !cuerpo) return;

    // La posicion se calcula contra el contenedor que se desplaza, no con
    // offsetTop: el offsetParent de las secciones es .editor-content, un
    // ancestro distinto, y por ahi se colaban unos 30px de desfase.
    const posicion = destino.getBoundingClientRect().top
      - cuerpo.getBoundingClientRect().top
      + cuerpo.scrollTop;

    cuerpo.scrollTo({ top: Math.max(0, posicion - 16), behavior: 'smooth' });
  }

  ngOnDestroy(): void {
    this.fragmentoSub?.unsubscribe();
  }
}
