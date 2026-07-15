---
name: hexagonal-architecture
description: Reglas estrictas para el diseño y desarrollo del backend usando Arquitectura Hexagonal en Spring Boot.
---

# Hexagonal Architecture Guidelines (Spring Boot)

Esta habilidad define cómo cualquier agente de IA debe estructurar, modificar o generar código para el backend de este portafolio.

## Regla de Oro
**NUNCA mezclar responsabilidades.** El Dominio no debe saber nada sobre la web (Controladores) ni sobre la base de datos (JPA). Las dependencias SIEMPRE apuntan hacia el interior (hacia el Dominio).

## Estructura de Capas
1. **Domain (Núcleo Hexagonal)**
   - **Contiene**: Entidades de negocio puras, Value Objects, y Puertos (Interfaces).
   - **Regla**: Cero anotaciones de Spring (`@Entity`, `@Service`, `@Component`). Cero dependencias de frameworks externos.

2. **Application (Casos de Uso)**
   - **Contiene**: La lógica que orquesta el dominio (Casos de uso / Servicios de aplicación).
   - **Regla**: Implementan las interfaces (Puertos de entrada) y llaman a los Puertos de salida. Aquí sí se pueden usar anotaciones de Spring como `@Service` si se desea, o configurarlos mediante Beans.

3. **Infrastructure (Adaptadores)**
   - **Contiene**: Todo el código acoplado a tecnologías externas.
   - **Input Adapters (Driver)**: Controladores REST (`@RestController`), Event Listeners.
   - **Output Adapters (Driven)**: Repositorios JPA (`@Repository`), Entidades JPA (usar mapeadores para convertirlas a entidades de Dominio), Clientes HTTP externos.
   - **Config**: Clases de configuración de Spring (`@Configuration`), Seguridad (JWT, Spring Security).

## Nombramiento y Convenciones
- Los puertos de entrada suelen llamarse Casos de Uso (Ej: `CreateProjectUseCase`).
- Los puertos de salida suelen llamarse Ports (Ej: `ProjectRepositoryPort`).
- Los adaptadores de base de datos terminan en Adapter (Ej: `ProjectJpaAdapter`).
- Las entidades JPA deben separarse de las entidades de dominio (Ej: `ProjectEntity` para JPA, y `Project` para el Dominio). Usar un `Mapper` para transferir datos entre ellas.
