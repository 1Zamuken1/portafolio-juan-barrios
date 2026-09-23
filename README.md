# Juan Esteban Barrios - Backend Developer Portfolio

![Angular](https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![PrimeNG](https://img.shields.io/badge/PrimeNG-FF6C37?style=for-the-badge&logo=primeng&logoColor=white)
![GSAP](https://img.shields.io/badge/GSAP-88CE02?style=for-the-badge&logo=greensock&logoColor=white)

Este es el repositorio del portafolio personal de **Juan Esteban Barrios Portela**, Tecnólogo en Análisis y Desarrollo de Software especializado en Backend (Java, Spring Boot, Python, Django).

El portafolio esta construido con **Angular 22** en modo zoneless y componentes standalone, y se presenta como un editor de codigo: la navegacion son archivos y pestañas, y cada proyecto trae su diagrama de arquitectura dibujado como un plano tecnico.

Detras hay un backend propio en Spring Boot con arquitectura hexagonal, que da servicio al panel de administracion. El sitio publico no lo consulta: lee los datos que el prerender incrusta en el HTML, asi que sigue en pie aunque el backend no lo este.

## Caracteristicas

- **Interfaz tipo editor de codigo**: la navegacion publica emula un VSCode, con explorador de archivos y pestañas sintetizadas desde la ruta.
- **Visor de arquitectura**: cada caso de estudio dibuja su diagrama como un plano tecnico, con zoom, desplazamiento y trazado de conectores calculado para esquivar nodos.
- **Anillo 3D del stack**: las tecnologias en orbita, en `/about/stack`, como alternativa a la lista. La lista es lo principal; el anillo se pide.
- **Tema claro y oscuro**: toda la paleta sale de variables CSS, y los tests comprueban que en claro ningun texto baje de AA.
- **Panel de administracion con redactor por IA**: se le da el readme de un repositorio —pegado, por enlace de GitHub o subiendo un `.md`— y redacta la ficha del proyecto. El progreso se ve como una pipeline vertical y, al lado, la ficha pública escribiéndose mientras el modelo responde; lo que sale queda como propuesta hasta que se acepta.
- **Sitio publico sin backend**: los datos se incrustan en el HTML durante el prerender, asi que ninguna visita espera a que despierte el servidor.
- **Optimizado para SEO**: metadatos por ruta, datos estructurados, sitemap generado desde los datos y HTML prerenderizado.

## Stack Tecnologico del Portafolio

- **Framework**: Angular 22
- **Lenguaje**: TypeScript
- **Estilos**: CSS3 Puro (Variables, Flexbox, Grid, Animaciones 3D)
- **Componentes UI**: PrimeNG 21 con un preset propio (Material sobre vidrio, Shades of Purple en oscuro)
- **Motor de Animaciones**: GSAP
- **Iconos**: Devicon y PrimeIcons, servidos como fuente recortada desde el propio sitio
- **Backend**: Spring Boot 3 con arquitectura hexagonal, en `/backend`
- **Redaccion asistida**: Groq (`openai/gpt-oss-120b`), en streaming

## Instalacion y Ejecucion Local

Para correr este proyecto en tu entorno local, asegurate de tener instalado [Node.js](https://nodejs.org/) y [pnpm](https://pnpm.io/).

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/tu-usuario/portafolio-juan-barrios.git
   cd portafolio-juan-barrios
   ```

2. **Instalar dependencias** (el gestor del proyecto es pnpm):
   ```bash
   pnpm install
   ```

3. **Ejecutar servidor de desarrollo**:
   ```bash
   pnpm start
   ```
   Abre tu navegador en `http://localhost:4200/`.

4. **Ejecutar los tests**:
   ```bash
   npx playwright install chromium
   pnpm run e2e
   ```
   Playwright levanta el servidor de desarrollo por su cuenta. `e2e/` contiene tanto las pruebas de navegador como las unitarias del frontend: `ng test` no tiene target en `angular.json`, asi que las funciones puras se prueban desde ahi, sin navegador.

   Los tests del backend van aparte:
   ```bash
   cd backend && ./mvnw test
   ```

## Licencia

Este proyecto esta bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para mas detalles.
