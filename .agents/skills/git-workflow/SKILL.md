---
name: git-workflow
description: Reglas y convenciones para el manejo de ramas y commits en este proyecto.
---

# Git Workflow & Branching Guidelines

Esta habilidad define el flujo de trabajo con Git para proteger el entorno de producción (rama `master` desplegada en Vercel).

## Estructura de Ramas
- **`master`**: Rama de producción. Vercel despliega automáticamente desde aquí. **NUNCA** hacer commits directos a `master` si se trata de nuevas características (Features) o cambios arquitectónicos profundos.
- **`develop`**: Rama de integración principal. Todo el desarrollo activo del backend y nuevas características del frontend deben ocurrir aquí o en ramas derivadas de esta.

## Flujo de Trabajo
1. Antes de iniciar una nueva característica (Ej: Crear el backend), asegúrate de estar en `develop` o crear una rama desde `develop` (Ej: `feature/spring-boot-backend`).
2. Una vez que la característica esté terminada y probada localmente (compila y los tests pasan), se fusiona (merge) de vuelta a `develop`.
3. Cuando `develop` alcanza un estado estable y maduro, se hace un Pull Request / Merge hacia `master` para desplegar a producción.

## Convenciones de Commits (Conventional Commits)
Los mensajes de commit deben ser claros y descriptivos, siguiendo este formato:
- `feat: [descripción]` (Nuevas características)
- `fix: [descripción]` (Solución de errores)
- `docs: [descripción]` (Cambios en documentación, AGENTS.md, SKILL.md)
- `refactor: [descripción]` (Cambios de código que no añaden características ni arreglan errores, ej: pasar de JSON a API)
- `chore: [descripción]` (Cambios de configuración, dependencias, Docker)
