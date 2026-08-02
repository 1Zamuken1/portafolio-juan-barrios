# Portafolio Juan Barrios - AI Agent Wiki & Guidelines

Esta es la wiki interna y conjunto de reglas del proyecto. **Para cualquier agente de IA que lea esto:** Analiza esta arquitectura antes de proponer cambios o crear nuevo código.

## 0. Agent Skills Installed
Skills en `.agents/skills/` que este agente debe cargar según la tarea:

### Frontend (Angular 22)
- `angular-developer` — Official Angular skill (Angular 22, Standalone, Signals, Zoneless)
- `primeng-developer` — PrimeNG component library (v21.x)
- `ui-craft` — Design discipline: jerarquía, spacing, color, profundidad

### Backend (Spring Boot 3 - Hexagonal)
- `spring-explore` — Explorar estructura del proyecto Spring Boot
- `spring-planning` — Planificar implementaciones
- `spring-data-jpa` — JPA entities, repositories, proyecciones
- `crud-rest-controller` — REST controllers con CRUD
- `dto-creator` — DTOs (Java records, clases)
- `mapper-creator` — Mappers con MapStruct
- `spring-security-configuration` — Configuración Spring Security
- `kafka-configuration` — Configuración Kafka

### Calidad y Debugging
- `codefmt` — Formateo de código
- `run-tests` — Ejecutar tests
- `coverage` — Medir cobertura
- `java-debug` — Debugging con IntelliJ Debug MCP

### Git
- `git-workflow` — Convenciones de ramas y commits (ver sección 6)

## 1. Project Overview
Este repositorio contiene el portafolio personal de Juan Barrios, un Backend Developer especializado en Java (Spring Boot) y Python (Django). El proyecto evolucionó de ser un portafolio estático a una aplicación Fullstack dinámica (Monorepo).

## 2. Frontend (Angular 22)
- **Ubicación**: Se encuentra en la raíz del repositorio (`/`).
- **Arquitectura**: Angular 22 con Standalone Components. 
- **Estilos**: Vanilla CSS puro con variables nativas (`var(--color)`). **NO usar TailwindCSS** a menos que se indique explícitamente. Se hace un uso intensivo de animaciones CSS (Starfield, Glassmorphism).
- **Animaciones Complejas**: Uso de GSAP (`gsap`, `ScrollTrigger`) para animaciones de scroll y revelado.
- **Scroll Suave**: Uso de la librería `Lenis` para smooth scrolling. (Nota: Si hay problemas de scroll en modales, usar el atributo `data-lenis-prevent`).
- **Change Detection**: Usa `provideZonelessChangeDetection()` (modo Zoneless). Todas las variables de estado reactivas en los componentes de admin y la vista pública usan **Angular Signals** (`signal()`, `.set()`, `.update()`). **NO** inyectar `ChangeDetectorRef` ni usar `cdr.detectChanges()`. Los Signals notifican automáticamente al framework cuándo repintar.
- **Estado de los Datos**: 
  - *Producción (Vercel)*: El frontend consume datos estáticos desde `src/assets/data/*.json` para evitar cold starts de Render. `environment.prod.ts` tiene `useStaticData: true`. Los componentes públicos (Projects, About) leen del JSON local; solo el panel admin llama al backend de Render.
  - *Fase Dinámica (Admin)*: El panel `/admin` hace requests reales a la API REST del backend en Render para CRUD completo.
- **Componente About (Skills Ring 3D)**: El componente `AboutComponent` renderiza un anillo 3D de planetas rotando con las tecnologías. Cada planeta es una `<div>` posicionada con `transform: rotateY(angle) translateZ(radius)`. Usa `requestAnimationFrame` (`startLoop()`) para rotación continua, drag handlers (`_onPointerDown/Move/Up`) para interacción manual, y `hoveredSkill()` signal para mostrar la tarjeta de descripción al hacer hover. Los skills vienen aplanados de `getStaticSkillsFlat()` como `AdminSkill[]`.
- **Iconos del Ring**: Usa la librería `devicon` (v2.17.0) para los iconos de tecnología. Los iconos son **monochrome** (sin clase `colored`) para garantizar visibilidad en ambos temas: `color: #ffffff` en modo oscuro, `color: #1a1a2e` en modo claro. Esto se define en `.planet-icon` dentro de `about.component.css`. El color del planeta (glow/borde) lo da `--brand-color` del skill.
- **skills.json**: Es un **array** de `SkillCategory[]` (no objeto con claves), con 18 skills en 4 categorías. Cada skill tiene: `id`, `name`, `icon` (clase devicon sin `colored`), `brandColor`, `brandColorLight`, `description`.
- **Despliegue**: Vercel (desde raíz del repo). URL producción: `https://portafolio-juan-barrios.vercel.app` (alias de `https://portafolio-juan-barrios-8en5oeoug-1zamuken1.vercel.app`).

## 3. Backend (Spring Boot 3 - Arquitectura Hexagonal)
- **Ubicación**: Carpeta `/backend` dentro de la raíz.
- **Stack**: Java 17+, Spring Boot 3.x, Spring Security (JJWT), Spring Data JPA.
- **Arquitectura**: Hexagonal (Puertos y Adaptadores). 
  - `domain`: Entidades puras y puertos (interfaces). Cero dependencias de framework.
  - `application`: Casos de uso.
  - `infrastructure`: Controladores web, Adaptadores de persistencia JPA, Configuración de Spring.
- **Base de Datos**: 
  - *Desarrollo*: SQLite.
  - *Producción*: PostgreSQL (ej. Supabase o Neon).
- **Contenedores**: El backend está dockerizado (`Dockerfile` y `docker-compose.yml`) para facilitar el despliegue y desarrollo local.

## 4. Estructura Monorepo
El repositorio funciona como un monorepo no estricto:
- `/` -> Proyecto Angular (Frontend). Vercel lee desde aquí.
- `/backend` -> Proyecto Maven/Gradle Spring Boot. 
- Al realizar commits, tener precaución de no romper el build de Vercel (Vercel ignora los cambios en la carpeta `/backend` si se configura correctamente o al detectar que el build script no depende de ella).

## 5. Reglas de Modificación para Agentes (Guidelines)
- **Aesthetic First**: Las interfaces deben mantenerse modernas, con paletas oscuras/espaciales, desenfoques de cristal (glassmorphism) y animaciones sutiles.
- **No uses placehoders**: Si se necesitan imágenes de prueba, genéralas.
- Al modificar CSS o componentes de UI, asegúrate de mantener el soporte para interacciones táctiles en móviles y no romper el layout responsivo.
- En el backend, **NUNCA** mezcles lógica de negocio (dominio) dentro de los controladores o entidades de JPA. Respeta la separación de capas (Hexagonal).

## 6. Despliegue del Backend en Render (Free Tier)

### Estructura de despliegue
- **Frontend** → Vercel (desde raíz del repo) — `https://portafolio-juan-barrios.vercel.app`
- **Backend** → Render (Free Tier, Docker-based) — `https://portafolio-juan-barrios.onrender.com`

### Archivos clave para Render
| Archivo | Ubicación | Propósito |
|---------|-----------|-----------|
| `backend/Dockerfile` | `backend/Dockerfile` | Define la imagen Docker del backend |
| `backend/application-render.properties` | backend/src/main/resources/ | Profile `render`: usa `PORT`, HikariCP separado |
| `render.yaml` | raíz del repo | Blueprint para deploy |
| `src/assets/data/*.json` | raíz del repo | Datos estáticos para el frontend en producción |

### Variables de entorno requeridas en Render (Web Service)
| Key | Value |
|-----|-------|
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://<host>:5432/<db>` |
| `SPRING_DATASOURCE_USERNAME` | `<user>` |
| `SPRING_DATASOURCE_PASSWORD` | `<password>` |
| `SPRING_DATASOURCE_DRIVER-CLASS-NAME` | `org.postgresql.Driver` |
| `SPRING_PROFILES_ACTIVE` | `render` |
| `JAVA_OPTS` | `-Xms256m -Xmx384m` |

> ⚠️ NO usar `spring.datasource.url=jdbc:${DATABASE_URL}` en `application-render.properties` — el driver PostgreSQL JDBC no parsea credenciales embebidas en la URL. Usar las 4 vars `SPRING_DATASOURCE_*` separadas.

### Root Directory
Al crear el servicio en Render, establecer **Root Directory** como `backend`. El **Dockerfile Path** apunta a `backend/Dockerfile` (relativo a repo root) o simplemente `Dockerfile` si el root es `backend`.

### Problemas encontrados y soluciones

| # | Problema | Causa | Solución |
|---|----------|-------|----------|
| 1 | `Driver org.postgresql.Driver claims to not accept jdbcUrl, postgresql://...` | `spring.datasource.url=${DATABASE_URL}` expandía `DATABASE_URL` (formato `postgresql://`) sin prefijo `jdbc:` | Cambiar a `jdbc:${DATABASE_URL}` en `application-prod.properties` o mejor, usar `SPRING_DATASOURCE_URL` sin credenciales embebidas |
| 2 | Mismo error con `jdbc:postgresql://user:password@host/db` | HikariCP/PG Driver no parsea bien credenciales embebidas en URL (`user:password@host`) | **No** embutir credenciales en la URL. Usar vars separadas `SPRING_DATASOURCE_USERNAME` y `SPRING_DATASOURCE_PASSWORD` |
| 3 | Perfil `prod` en vez de `render` | `SPRING_PROFILES_ACTIVE=render` no llegaba al contenedor Docker (build cache de Render) | Limpiar build cache en Render y redeploy; también verificar que la variable esté configurada antes de la build |
| 4 | Render detecta Node.js en vez de Docker | Railway detectó `package.json` en raíz como proyecto Node | Configurar Build Method como **Docker** y Dockerfile Path como `backend/Dockerfile` |
| 5 | `Root Directory` no encontrado en UI de Render | Render v2 lo llama "Build Source → Docker settings" | En Docker settings dentro del builder, sí está la opción de Root Directory bajo **Advanced** |
| 6 | `postgresql://...` URL invalida para JDBC | PostgreSQL JDBC requiere formato `jdbc:postgresql://host:port/db` | Armar la URL JDBC manualmente como env var `SPRING_DATASOURCE_URL` |

### Solución al cold start de Render (tier free)
El tier free de Render poné el backend en "sleep" tras 15 min de inactividad, generando un cold start de 30-60s. Para evitar que los visitantes del sitio público sufran esta latencia, se usa una **estrategia de espejo estático**:

- **Vercel (frontend público)** → Sirve los datos desde `src/assets/data/*.json` que se despliegan como assets estáticos. Nunca hace peticiones al backend en producción. Es instantáneo y no depende de Render.
- **Render (backend)** → Solo se accede desde el panel de admin (`/admin`) en rutas protegidas. El admin despierta a Render bajo demanda cuando necesita CRUD real.
- **Flujo**: Admin → accede a `/admin` → requests van directo a Render → actualiza datos → el JSON estático en Vercel se regenera desde la rama `develop` (al hacer push se regenera el build de Vercel). Visitantes → siempre ven Vercel (datos estáticos), nunca tocan Render.

Implementación técnica:
- `environment.prod.ts` tiene `useStaticData: true` y el `apiUrl` apunta a Render.
- `DataService.getStaticProjects()`, `getStaticExperiences()`, `getStaticSkills()` consumen de `src/assets/data/*.json` vía `HttpClient`.
- `DataService.getStaticSkillsFlat()` transforma `SkillCategory[]` → `AdminSkill[]` flat para el componente `AboutComponent`.
- Los componentes públicos (`ProjectsComponent`, `AboutComponent`) verifican `environment.production && environment.useStaticData` y usan los métodos `getStatic*()` en ese caso.

### Pasos de deploy (resumen ejecutivo)

#### Backend (Render)
1. Crear PostgreSQL en Render (Free tier) → copiar credenciales
2. Dashboard → New+ → Web Service → conectar repo
3. Build Method: Docker | Dockerfile Path: `backend/Dockerfile` | Root Directory: `backend`
4. Agregar 6 env vars (`SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`, `SPRING_DATASOURCE_DRIVER-CLASS-NAME`, `SPRING_PROFILES_ACTIVE=render`, `JAVA_OPTS`)
5. Manual Deploy → esperar ~3 min
6. Verificar `https://portafolio-juan-barrios.onrender.com/api/projects` → debe retornar 200

#### Frontend (Vercel)
1. Tener un Vercel token: `vercel login` o生成 en https://vercel.com/settings/tokens
2. `export VERCEL_TOKEN="vercel_xxx..."`
3. `npx vercel --prod --yes` desde la raíz del repo
4. Vercel detecta `vercel.json` → build con `ng build` → despliega en `dist/portafolio-juan-barrios/browser/`
5. Verificar `https://portafolio-juan-barrios.vercel.app` → debe mostrar el sitio con datos estáticos

### Despliegue desde Vercel MCP (alternativa)
Si no se tiene token CLI, se puede usar el MCP de Vercel directamente desde openCode listando el proyecto existente y haciendo deploy vía la interfaz de Vercel, o subiendo el build output como artifact.

### Pasos de deploy (resumen ejecutivo)
1. Crear PostgreSQL en Render (Free tier) → copiar credenciales
2. Dashboard → New+ → Web Service → conectar repo
3. Build Method: Docker | Dockerfile Path: `backend/Dockerfile` | Root Directory: `backend`
4. Agregar 6 env vars (`SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`, `SPRING_DATASOURCE_DRIVER-CLASS-NAME`, `SPRING_PROFILES_ACTIVE=render`, `JAVA_OPTS`)
5. Manual Deploy → esperar ~3 min
6. Verificar `https://portafolio-juan-barrios.onrender.com/api/projects` → debe retornar 200

## 7. Git Workflow y Commits
- **Ramas:** Todo el desarrollo activo se hace sobre la rama `develop`.
- **Commits:**
  - Deben ser atómicos (un solo propósito lógico por commit).
  - En español.
  - Usar convenciones convencionales (`feat:`, `fix:`, `chore:`, `refactor:`, etc.).
  - Longitud media-corta y descriptivos.

## 8. Package Manager
- **USAR EXCLUSIVAMENTE `pnpm`** para instalar, actualizar o eliminar dependencias del frontend. **NUNCA usar `npm`** para gestión de paquetes.
  - ✅ `pnpm install`, `pnpm add <paquete>`, `pnpm remove <paquete>`
  - ❌ `npm install`, `npm i <paquete>`, `npm uninstall <paquete>`
- Los scripts de ejecución sí se pueden correr con `npm run <script>` o `pnpm run <script>` indistintamente.
- Para el backend (Maven/Gradle), usar los wrappers incluidos (`./mvnw`, `./gradlew`).

## 10. Session Log — 2026-07-25: Static Skills Ring + Devicon Icons

### Objetivo
Restaurar el Stack Tecnológico 3D ring en `about` page y hacer que funcione sin backend (static JSON mirror + devicon icons).

### Cambios realizados

#### 1. About component restaurado
- Se restauró el ring 3D desde commit `7ca877a`: `flatSkills` signal, `startLoop()`, `applyTransforms()`, drag handlers, hover handler.
- `ngOnInit` usa `useStatic` flag: en producción llama a `getStaticExperiences()` y `getStaticSkillsFlat()` en vez de backend API.

#### 2. skills.json reestructurado
- Se cambió de formato objeto `{frontend: {...}, backend: {...}}` a **array** `[...]` para que `HttpClient.get<SkillCategory[]>()` funcione correctamente.
- Contiene 18 skills en 4 categorías: Frontend (3), Backend (6), Arquitectura (4), DevOps (5).
- Cada skill tiene campos: `id`, `name`, `icon` (clase devicon sin `colored`), `brandColor`, `brandColorLight`, `description`.

#### 3. Devicon icons instalados y configurados
- `pnpm add devicon@2.17.0` agregó la librería.
- `devicon.min.css` añadido a `styles` en `angular.json`.
- Todos los `icon` en skills.json usan clases devicon (ej: `devicon-angularjs-plain`, `devicon-spring-original-wordmark`).

#### 4. Fix: iconos monochrome visibles en ambos temas
- Se eliminó la clase `colored` de todos los iconos devicon para evitar que el color de marca anule el color del tema.
- `.planet-icon` usa `color: #ffffff` en tema oscuro y `color: #1a1a2e` en modo claro.
- `brandColorLight` añadido a cada skill para mejor soporte en tema claro.
- Vercel `brandColor` cambiado de `#000000` a `#FFFFFF`.

#### 5. Fix: Patrones Diseño icon
- Cambiado de `devicon-uml-plain` (no existe en devicon) a `devicon-unifiedmodelinglanguage-plain`.

### Archivos modificados
| Archivo | Cambio |
|---------|--------|
| `src/app/features/about/about.component.ts` | `flatSkills` signal, `ngOnInit` con `useStatic`, drag/hover/loop |
| `src/app/features/about/about.component.html` | ring 3D con `<i class="planet-icon" [ngClass]="skill.icon">` |
| `src/app/features/about/about.component.css` | `.planet-icon` monochrome, glows, hover card |
| `src/assets/data/skills.json` | 18 skills como array `SkillCategory[]`, devicon classes sin `colored`, `brandColorLight` |
| `src/app/core/services/data.service.ts` | `getStaticSkillsFlat()` transforma `SkillCategory[]` → `AdminSkill[]` |
| `angular.json` | `devicon.min.css` en styles |

### Comandos clave
```bash
pnpm add devicon@2.17.0
npx ng build --configuration production
$env:VERCEL_TOKEN="<tu-vercel-token>"; npx vercel --prod --force --yes
```

### Commits
| Hash | Mensaje | Rama |
|------|---------|------|
| `c96b77e` | `feat: about component static data mirror` | master, develop |
| `7e7db5c` | `fix: skills.json as array` | master, develop |
| `b4add7f` | `feat: devicon icons for skills ring` | master, develop |
| `faa9cfa` | `fix: icons monochrome visibles en ambos temas + Patrones Diseño icon` | master, develop |

## 12. Session Log — 2026-07-30: Admin Panel Integration + Contact Form

### Objetivo 1: Admin Panel Funcional con Integración Real
Integrar el panel admin (`/admin`) con el backend en Render para CRUD real de projects, experiences y skills.

### Cambios realizados

#### 1. Backend en Render — Verificado y funcionando
- `GET /api/projects` → 200 (retorna array de proyectos)
- `GET /api/skills` → 200 (retorna 18 skills)
- `GET /api/experiences` → 200 (retorna 1 experience)
- `POST /api/auth/login` → 200 con JWT token (`admin`/`password123`)
- JDBC URL funciona sin prefijo `jdbc:` — `DATABASE_URL` de Render es parseada correctamente por el driver PostgreSQL
- El profile `render` usa `application-render.properties` que hereda datasource de `application.properties` (SQLite en dev, PostgreSQL en prod vía `DATABASE_URL`)

#### 2. Base de datos sembrada (seed)
- Se creó `seed_render.py` (script temporal, ya eliminado) para poblar la BD de Render con los datos de los JSON estáticos
- Datos sembrados: 4 projects, 18 skills, 1 experience
- Todos los endpoints CRUD verificados funcionando

#### 3. Frontend admin — Integración verificada
- Login JWT funcional en producción (verificado con Playwright)
- Dashboard admin muestra los 4 proyectos del backend
- Navegación entre sections (Projects, Experience, Skills) funciona
- Los componentes admin ya usan `dataService.getProjects()`, `getExperiences()`, `getAdminSkills()` (API real, no estática)
- `JwtInterceptor` inyecta token en requests del admin automáticamente
- `authGuard` protege rutas admin correctamente

### Archivos modificados
| Archivo | Cambio |
|---------|--------|
| `backend/application-render.properties` | (sin cambios — funciona como está) |
| `backend/render.yaml` | (sin cambios — DATABASE_URL funciona) |

### Verificación con Playwright
- Login `admin`/`password123` → redirige a `/admin/dashboard/projects`
- Tabla de proyectos muestra 4 entries
- CRUD UI lista para operar (New, Edit, Delete buttons presentes)

---

### Objetivo 2: Contacto Funcional
Añadir formulario de contacto funcional en la sección About page usando EmailJS con configuración runtime.

### Cambios realizados

#### 1. Configuración runtime via `public/config.json`
- Se creó `public/config.json` con las claves de EmailJS (no se sube al repo, está en `.gitignore`)
- Se creó `ConfigService` (`src/app/core/services/config.service.ts`) que carga `config.json` en runtime y lo cachea en un signal
- Los `environment.ts` ahora tienen valores vacíos para EmailJS (placeholders)
- El `about.component.ts` usa `ConfigService` en lugar de `environment.emailjs` para obtener las claves

#### 2. Formulario de contacto implementado
- `about.component.ts`: Agregado `FormGroup` con ReactiveForms (name, email, subject, message), `sendContactForm()` method con EmailJS integration, `MessageService` para toast feedback
- `about.component.html`: Reemplazado contact-grid estático con formulario funcional + links alternativos debajo
- `about.component.css`: Estilos del formulario — glassmorphism inputs, responsive 2-column grid, button states, alternative links section

#### 3. EmailJS configurado
- `pnpm add @emailjs/browser@4.4.1` instalado
- Template de EmailJS actualizado: Subject usa `{{subject}}`, content usa `{{name}}`, `{{message}}`, `{{time}}`

### Archivos modificados
| Archivo | Cambio |
|---------|--------|
| `public/config.json` | Nuevo — config EmailJS runtime (NO se sube al repo) |
| `src/app/core/services/config.service.ts` | Nuevo — ConfigService para cargar config.json |
| `src/app/features/about/about.component.ts` | ConfigService, FormGroup, sendContactForm(), EmailJS |
| `src/app/features/about/about.component.html` | Contact form + preserved static links |
| `src/app/features/about/about.component.css` | Form styles, responsive grid |
| `src/environments/environment.ts` | emailjs placeholders vacíos |
| `src/environments/environment.prod.ts` | emailjs placeholders vacíos |
| `package.json` + `pnpm-lock.yaml` | `@emailjs/browser 4.4.1` added |
| `.gitignore` | `public/config.json` agregado |

### ⚠️ Configuración pendiente en servidor
Para que el formulario funcione en producción, subir `public/config.json` al servidor con las claves reales de EmailJS:
```json
{
  "emailjs": {
    "publicKey": "WVHsNt_gi_mvdR5G8",
    "serviceId": "service_nbv1s2f",
    "templateId": "template_r2ludor"
  }
}
```

---

### Estado del plan — Qué falta

| Prioridad | Tarea | Estado |
|-----------|-------|--------|
| 1 | Admin panel funcional con integración real | ✅ Completado |
| 2 | Contacto funcional (formulario + EmailJS) | ✅ Implementado, pendiente configurar EmailJS keys |
| 3 | VSCode Explorer para Projects | 🔲 Pendiente |
| 4 | Responsive/mobile polish | 🔲 Pendiente (como acordado, se ve después) |
| 5 | Performance / SEO (lazy loading, meta tags, sitemap, OG tags) | 🔲 Pendiente |

### Comandos clave
```bash
# Seed de datos en Render
python seed_render.py  # (script temporal, ya eliminado)

# Build verificado
npx ng build --configuration development

# Deploy frontend
$env:VERCEL_TOKEN="..."; npx vercel --prod --yes
```
