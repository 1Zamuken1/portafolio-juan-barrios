# SGVA Assistant

SGVA Assistant es una aplicación de escritorio moderna construida con Node.js y Electron. Su objetivo principal es automatizar la búsqueda, extracción y estructuración de ofertas de prácticas patrocinadas del portal web del SENA (SGVA) en Colombia, utilizando Inteligencia Artificial (Groq API).

## Características Principales

- **Automatización (Playwright):** Inicia sesión automáticamente, navega por el portal, maneja alertas modales y extrae las ofertas de empleo, simulando la interacción humana.
- **Análisis con Inteligencia Artificial (Groq):** Procesa el texto crudo y sin estructura del portal web y organiza automáticamente los datos en campos específicos: Empresa, Contacto, Funciones y Fecha Límite.
- **Almacenamiento Persistente (Base de Datos Local JSON):** Guarda en caché cada oferta procesada localmente para ahorrar tiempo y tokens de API en búsquedas futuras.
- **Optimización de Rendimiento:** Incluye un modo de "Bajo Rendimiento" que desactiva animaciones CSS pesadas y efectos de transparencia para funcionar fluidamente en hardware antiguo.
- **Exportación de Datos:** Permite a los usuarios exportar los resultados estructurados a formatos Microsoft Excel (.xlsx) y Markdown (.md) con un solo clic.
- **Interfaz de Usuario Moderna:** Construida con HTML/CSS/JS nativo utilizando un sistema de diseño basado en Glassmorphism, modo oscuro, un indicador de progreso animado y un registro de consola en vivo.

---

## Requisitos Previos

- **Sistema Operativo:** Windows 10/11
- **Credenciales:** Cuenta activa de aprendiz del SENA con acceso al portal SGVA.
- **Groq API Key:** Una clave de API gratuita de [console.groq.com](https://console.groq.com/).

---

## Guía de Uso

1. **Configuración:** Navega a la pestaña **Configuración**. Ingresa tu usuario, contraseña, API Key de Groq y selecciona tu departamento y ciudad objetivo.
2. **Parámetros:** Elige el límite de extracción (por ejemplo, "Primeras 10") o elige extraer todas las ofertas disponibles.
3. **Ejecución:** Navega a la pestaña **Extractor** y haz clic en *Iniciar*. Un indicador visual mostrará el progreso actual del robot.
4. **Revisión y Exportación:** Navega a la pestaña **Ofertas**. Usa la barra de búsqueda para filtrar por palabras clave, revisa las tarjetas y usa el botón de exportar para generar un archivo Excel con todos los datos recuperados.

---

## Configuración para Desarrollo

### Instalación Local
Clona este repositorio e instala las dependencias requeridas (Playwright, Groq SDK, ExcelJS, Electron):
```bash
git clone https://github.com/1Zamuken1/SGVA-Assistant.git
cd sgva-assistant
npm install
```

### Modo de Desarrollo
Para ejecutar la aplicación en modo de desarrollo con las herramientas de desarrollador habilitadas:
```bash
npm start
```

### Compilar para Producción (.exe)
Para generar un instalador de Windows de 1 clic:
```bash
npm run build
```
Este comando creará un instalador `.exe` en el directorio `dist/` usando `electron-builder`.

---

## Arquitectura Técnica

- **Frontend:** HTML5 Semántico, CSS3 Puro (Variables CSS, Flexbox, Grid, sin frameworks externos), JavaScript Vanilla (`app.js`).
- **Backend / Orquestador:** Node.js con `Electron` (Proceso principal) y canales IPC bidireccionales.
- **Web Scraping:** Motor Chromium de `Playwright-core`.
- **Procesamiento de Lenguaje Natural:** Modelo `llama-3.1-8b-instant` a través del SDK de `groq`.
- **Sistema de Archivos Local:** Lectura y escritura asíncrona de archivos JSON a través del módulo nativo `fs` de Node.js.

---

## Licencia

Este proyecto está licenciado bajo la Licencia MIT - consulta el archivo [LICENSE](LICENSE) para más detalles.
