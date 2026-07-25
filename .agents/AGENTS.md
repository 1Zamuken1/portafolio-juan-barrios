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

## 9. Roadmap / Ideas Futuras
- **Rediseño de sección de Proyectos ("VSCode Explorer")**: Se planea reemplazar la grid actual de project cards por una interfaz visual inspirada en VSCode, donde cada "carpeta" represente un proyecto y al expandirla muestre detalles, tecnologías, etc. Esto será una evolución futura de la UI pública, no una prioridad inmediata. Cuando se implemente, mantener la estética espacial/glassmorphism existente.
