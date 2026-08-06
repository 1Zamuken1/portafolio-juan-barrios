# SEO Reader Desktop

Aplicacion de escritorio para analisis SEO on-page de proyectos web. Compatible con Django, Angular, Thymeleaf y HTML estatico.

## Caracteristicas

- Analisis automatico de 5 dimensiones SEO por cada URL
- Deteccion inteligente del framework del proyecto
- Soporte para Django (parseo de urls.py), Angular (Playwright headless), Thymeleaf (templates) y HTML estatico (escaneo de archivos)
- Deteccion de contexto de pagina (tradicional, modal, SPA, error) para ajustar penalizaciones
- Exportacion de reportes a JSON y Markdown
- Interfaz oscura con dashboard, historial y detalle por URL
- Analisis de CSS frameworks (Tailwind, Bootstrap)

## Dimensiones de analisis

- **Meta Tags**: title, description, Open Graph, Twitter Cards, JSON-LD, canonical, robots
- **Tecnico**: lang attribute, charset, estructura semantica, enlaces, favicon, viewport, accesibilidad, hreflang, HTTPS
- **Contenido**: conteo de palabras, ratio texto/HTML, jerarquia de headings, alt de imagenes, keyword stuffing, densidad de palabras clave
- **CSS Framework**: Tailwind/Bootstrap (texto oculto, faux headings, clases deprecated)
- **Performance/UX**: scripts inline, CSS bloqueante, resource hints, CLS, lazy loading, fuentes externas

## Frameworks soportados

| Framework | Modo de descubrimiento |
|-----------|------------------------|
| Django | Parseo de urls.py + fetch a localhost |
| Angular | Playwright headless + URLs personalizadas |
| Thymeleaf | Escaneo de templates HTML |
| HTML Estatico | Escaneo de archivos .html |

## Requisitos

- Node.js 18 o superior
- npm 9 o superior

## Instalacion

```bash
npm install
```

## Uso

### Desarrollo

```bash
npm run dev
```

### Build de produccion

```bash
npm run build
```

### Type checking

```bash
npm run typecheck
```

### Tests

```bash
npm run test:run
```

## Arquitectura

```
seo-reader-desktop/
  electron/          # Main process (Node.js)
    main.ts          # Ciclo de vida BrowserWindow + handlers IPC
    preload.ts       # contextBridge -> window.electronAPI
    services/        # Orquestador, exportacion, sistema de archivos
  lib/               # Logica compartida
    analyzers/       # 6 analizadores SEO + detector de contexto de pagina
    engines/         # Motores de descubrimiento (file-scanner, django-url-parser, http-fetcher)
    types/           # Interfaces TypeScript principales
  src/               # Renderer process (React)
    components/      # Componentes UI (layout, ui, views)
    hooks/           # Custom hooks (useAnalysisHistory)
    types/           # Tipos del renderizador
  test-project/      # Fixtures HTML de prueba
```

## Tecnologias

- Electron 32
- React 18
- TypeScript 5
- Vite 5
- Tailwind CSS 3
- Cheerio (parseo HTML)
- Playwright (navegador headless)
- Zustand (estado global)
- Recharts (graficos)
- Radix UI (componentes headless)
- Lucide React (iconos)
- Vitest (tests)

## Contribuir

1. Haz un fork del repositorio
2. Crea una rama para tu caracteristica (`git checkout -b feature/nueva-caracteristica`)
3. Haz commit de tus cambios (`git commit -m 'Agrega nueva caracteristica'`)
4. Haz push a la rama (`git push origin feature/nueva-caracteristica`)
5. Abre un Pull Request

## Licencia

MIT
