# Portafolio Juan Barrios - AI Agent Wiki & Guidelines

Esta es la wiki interna y conjunto de reglas del proyecto. **Para cualquier agente de IA que lea esto:** Analiza esta arquitectura antes de proponer cambios o crear nuevo código.

## 1. Project Overview
Este repositorio contiene el portafolio personal de Juan Barrios, un Backend Developer especializado en Java (Spring Boot) y Python (Django). El proyecto evolucionó de ser un portafolio estático a una aplicación Fullstack dinámica (Monorepo).

## 2. Frontend (Angular 18)
- **Ubicación**: Se encuentra en la raíz del repositorio (`/`).
- **Arquitectura**: Angular 18 con Standalone Components. 
- **Estilos**: Vanilla CSS puro con variables nativas (`var(--color)`). **NO usar TailwindCSS** a menos que se indique explícitamente. Se hace un uso intensivo de animaciones CSS (Starfield, Glassmorphism).
- **Animaciones Complejas**: Uso de GSAP (`gsap`, `ScrollTrigger`) para animaciones de scroll y revelado.
- **Scroll Suave**: Uso de la librería `Lenis` para smooth scrolling. (Nota: Si hay problemas de scroll en modales, usar el atributo `data-lenis-prevent`).
- **Estado de los Datos**: 
  - *Fase Estática (Legacy)*: El servicio `DataService` consumía archivos JSON estáticos en `/public/data/`.
  - *Fase Dinámica (Actual/Futura)*: El servicio `DataService` interactúa con la API REST del backend para obtener la información. El frontend cuenta con un `/admin` dashboard protegido.
- **Despliegue**: Vercel (Configurado para apuntar a la raíz del repositorio).

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
