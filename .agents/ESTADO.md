# Estado del proyecto y trabajo pendiente

> **Qué es este documento.** `AGENTS.md` describe *cómo funciona* el proyecto: arquitectura, convenciones, reglas. Este describe *dónde está* y *qué falta*: el estado de cada pieza, las decisiones tomadas y por qué, lo pendiente y las propuestas aún sin construir.
>
> Última actualización: 22 de septiembre de 2026.

---

## 1. Estado actual

### Qué está vivo

| Pieza | Estado | Dónde |
|---|---|---|
| Sitio público | Funcionando, prerenderizado | `portafolio-juan-barrios.vercel.app` |
| Backend | Funcionando | `portafolio-juan-barrios.onrender.com` |
| Base de datos | **Neon**, sembrada | externa a Render |
| CI | Verde en cada push y PR | GitHub Actions |

### Ramas

`master` y `develop` están sincronizadas salvo un commit de documentación. **Todas las ramas de trabajo están fusionadas** y se pueden borrar:

```
feat/backend-mirror   fix/backend-secrets   fix/errores-visibles
fix/health-check      feat/actualizacion-parcial
```

### Contenido

Los datos viven en `src/assets/data/*.json`: 4 proyectos, 1 experiencia, 18 skills. **Esa es la única copia completa del contenido** — la base de datos es un espejo, no la fuente de verdad. Si la base desaparece, se repuebla con `pnpm run mirror:push`; si el JSON se pierde, no hay de dónde recuperarlo salvo del historial de git.

### Tests

**Frontend**, 21 tests end-to-end en tres suites (`pnpm run e2e`):

- `blueprint.spec.ts` — encuadre, solapamientos, carriles y cruces del visor.
- `seo.spec.ts` — metadatos por ruta sobre la aplicación viva.
- `prerender.spec.ts` — el HTML generado por el build, que es lo que ven los rastreadores.

**Backend**, 8 clases de test (`./mvnw test`):

| Test | Qué protege |
|---|---|
| `MirrorRoundTripTest` | que una sincronización no borre los diagramas |
| `ProjectMapperTest` | que no se olvide ningún campo al mapear (por reflexión) |
| `ProjectPersistenceTest` | que las columnas JSON se guardan y releen |
| `ActualizacionParcialTest` | que un cliente incompleto no borre campos |
| `SecretsNotHardcodedTest` | que no vuelva a escribirse un secreto en la configuración |
| `DialectoNoFijadoTest` | que cada perfil declare su dialecto |
| `ErroresVisiblesTest` | que un fallo no salga como 403 |
| `HealthControllerTest` | que la comprobación de salud no dependa de la base |

Casi todos nacieron de un fallo real, no de una previsión. Están descritos en el apartado 3.

---

## 2. Decisiones tomadas y por qué

**El sitio público no habla con el backend.** Lee los JSON, que el prerender incrusta en el HTML. Por eso el portafolio siguió en pie las semanas que el backend estuvo caído y por eso ningún visitante espera a que Render despierte. Es la decisión de diseño más importante del proyecto.

**La base de datos es externa (Neon), no de Render.** Las gratuitas de Render se eliminan a los 30 días: la anterior desapareció con todo dentro. Neon suspende tras 5 minutos de inactividad pero despierta sola, sin intervención.

**Los campos documento se guardan en columnas JSON**, no en tablas hijas. `rawMetrics`, `structuredStack` y `structuredFeatures` tienen claves arbitrarias en lenguaje natural; en relacional serían tablas clave-valor.

**El espejo se ejecuta a mano y su resultado se commitea.** Nunca en el build: si el despliegue de Vercel dependiera de que Render está despierto, volvería el arranque en frío que todo esto evita.

**La actualización es parcial.** Lo que no llega en la petición se conserva. Protege frente a cualquier cliente incompleto en vez de depender de que cada formulario recuerde enviarlo todo.

**`master` solo se actualiza por pull request**, y el PR lo crea y revisa una persona. Cada publicación pasa por un diff revisable, y eso es lo que permitió recuperar el contenido las dos veces que el panel lo borró.

---

## 3. Incidentes y lo que dejaron

Cinco causas encadenadas costaron una sesión entera. Cada una tapaba a la siguiente.

| Causa | Síntoma | Qué la impide ahora |
|---|---|---|
| Base gratuita de Render eliminada a los 30 días | backend caído semanas sin que nadie lo notara | base externa en Neon |
| Dialecto de SQLite heredado en el perfil de producción | `create table projects (... clob ...)` falla; la tabla queda sin crear | `DialectoNoFijadoTest` |
| `/error` exigía autenticación | todo fallo salía como 403 vacío, indistinguible | `ErroresVisiblesTest` |
| Tablas creadas sin `identity` por el dialecto equivocado | los POST devuelven 500 | se recrearon; `ddl-auto=update` no corrige lo existente |
| La guarda del volcado solo cubría `projects` | el volcado vació `experiences.json` y `skills.json` | ninguna colección puede encoger |

Y dos pérdidas de datos desde el panel de administración, ambas recuperadas con `mirror:push` desde el JSON del repositorio.

**Lecciones que conviene no olvidar:**

- **`ddl-auto=update` solo añade, nunca corrige.** Un cambio de tipo o una columna sin `identity` sobreviven al arreglo. Si el backend crece, migraciones con Flyway o Liquibase dejan de ser desproporcionadas.
- **Un test que no has visto fallar no protege nada.** Dos tests de esta sesión pasaban contra el código roto: uno usaba un selector inexistente, otro agrupaba por proximidad con una tolerancia insuficiente. Ambos se corrigieron solo después de comprobarlos contra el fallo.
- **Quitar una línea porque genera un aviso es cambiarla sin entenderla.** El dialecto de producción se rompió así.

---

## 4. Trabajo pendiente

### Inmediato

- **Borrar las cinco ramas ya fusionadas** (listadas en el apartado 1).
- **Fusionar el commit de documentación** que queda en `develop`.

### El formulario del panel está desfasado

Pide `technologies`, `githubUrl` y `liveUrl`, campos que el JSON ya no usa — migraron a `techStack` y `links.github` / `links.live`. Y no muestra ninguno de los 17 campos nuevos, así que al abrir un proyecto casi todo aparece vacío.

Con la actualización parcial ya no es peligroso, pero al guardar escribe esos tres campos heredados como vacíos, y aparecen como ruido en el siguiente volcado. Habría que quitarlos del formulario y decidir cuáles de los nuevos merece la pena editar ahí.

### Deuda conocida

- **Tests unitarios del router del visor.** La lógica creció mucho —esquiva obstáculos, reparte carriles, ordena puertos— y solo la cubren tests e2e, que son lentos y prueban el resultado, no las reglas. Además `ng test` no tiene target en `angular.json`, así que `blueprint-path-calculator.spec.ts` es un archivo muerto.
- **Coreografía scroll ↔ URL en `ProjectsComponent`.** Dos banderas y temporizadores de 1s coordinando el scroll y el fragmento. Funciona, pero es el punto más frágil del frontend.
- **El tema claro solo afecta al visor.** El layout tipo VSCode no tiene variante clara, y `ThemeService.toggleTheme()` no tiene quien lo llame desde que se borró el navbar.
- **El sitemap se genera a mano.** Al añadir un proyecto hay que acordarse.
- **El ring 3D sigue inactivo**, conservado por decisión explícita y documentado en `AGENTS.md`.
- **Nunca se ha medido el rendimiento.** Con el prerender recién puesto es buen momento para un Lighthouse.

---

## 5. Propuestas discutidas, aún sin construir

### Publicar desde el panel con menos pasos

Hoy llevar un cambio del panel al sitio son tres pasos:

```bash
node scripts/mirror.mjs pull
git add src/assets/data/ && git commit
# push a develop -> PR a master -> Vercel despliega
```

**Se descartó** hacerlo con un botón que exporte el JSON desde el navegador: el `pull` reagrupa los skills por categoría, conserva los ids por `slug` y respeta el orden de claves. Angular tendría que repetir esas tres transformaciones, quedando **dos implementaciones del mismo contrato** que se desincronizan.

**Se descartó** también el workflow con token de GitHub: más maquinaria para el mismo resultado.

**Lo acordado**: un script `pnpm run publish` que encadene `pull`, `add`, `commit` y `push` a `develop`. Una línea en `package.json`. El PR se mantiene manual a propósito: es el diff que ha salvado el contenido dos veces.

### Pipeline de IA para redactar contenido

La idea es reducir lo tedioso de añadir un proyecto: rellenar 28 campos a mano.

**Entrada**: un README o la URL de un repositorio.
**Salida**: un borrador con `shortDescription`, `fullDescription`, `readmeMarkdown` (sus cinco secciones), `challenges`, `structuredStack`, `structuredFeatures`, `keywords`, `techStack` y `type`.
**No toca**: `architectureNodes`, `architectureEdges`, `architectureLayout`, `id`, `slug`, `imageUrl`, `displayOrder`.

Restricciones que condicionan el diseño:

- **La clave no puede vivir en el frontend.** El panel es Angular compilado: todo lo que lleve dentro es público. La llamada pasa por el backend, con `GROQ_API_KEY` en las variables de Render.
- **La salida se valida contra el dominio antes de mostrarse.** Un modelo generando 28 campos inventa estructuras; una respuesta que no encaje debe rechazarse, no llegar al formulario.
- **Nunca persiste.** Devuelve un borrador que rellena el formulario; la persona revisa y guarda.
- **Los diagramas quedan fuera.** Colocar nodos sin solapamientos es un problema de layout, no de redacción, y ya costó bastante resolverlo a mano.

Sobre la API (verificado en la documentación de Groq, septiembre de 2026):

- Endpoint compatible con OpenAI: `POST https://api.groq.com/openai/v1/chat/completions`.
- **El modo de esquema estricto solo está en `openai/gpt-oss-20b`, `gpt-oss-120b`, `gpt-oss-safeguard-20b` y `qwen/qwen3.8-27b`.** `llama-3.3-70b-versatile` **no** lo soporta; para él hay *JSON Object Mode*, que garantiza JSON válido pero no conformidad con el esquema.
- Conclusión: usar JSON Object Mode y validar en el backend, con el modelo configurable. Así no se ata a una lista que cambia cada pocos meses.

Diseño acordado, siguiendo la arquitectura hexagonal:

| Capa | Pieza |
|---|---|
| `domain/port/out` | `ProjectDrafterPort` — el dominio no sabe que existe Groq |
| `infrastructure/adapter/out/ai` | `GroqProjectDrafter` — la llamada HTTP |
| `application/usecase` | `DraftProjectUseCase` — prompt, parseo y validación |
| `infrastructure/adapter/in/web` | `POST /api/projects/draft`, autenticado |

El puerto permite probarlo sin clave: CI no puede llamar a Groq, así que el caso de uso se prueba con un doble que devuelva respuestas buenas, mal formadas y con campos inventados.

**Pendiente antes de empezar**: conseguir una clave de Groq y definirla como `GROQ_API_KEY` en Render.

---

## 6. Limitaciones conocidas

- **La actualización parcial no permite vaciar un campo** enviando null, porque null significa «no lo toques». Para vaciarlo hay que editar el JSON y subirlo con el espejo.
- **Los campos primitivos quedan fuera de la fusión** (`int year`, `int displayOrder`): no pueden ser null, así que no se distingue «no enviado» de «enviado con su valor por defecto». En la práctica no importa: ambos clientes los envían siempre.
- **Los ids de la base y los del JSON divergen.** La base asigna los suyos en cada siembra; el volcado conserva los del fichero emparejando por `slug`, para que las URLs `/projects/<id>` no se renumeren.
- **Los despliegues de Render son manuales.** No hay auto-deploy desde Git configurado.
- **`render.yaml` puede no estar en uso.** El servicio se creó a mano desde el dashboard, así que la configuración real vive allí y ese fichero es documentación. Las variables de entorno se definen en el dashboard.
