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

Todo lo publicado pasa por `master` mediante pull request. **Estas ramas ya están fusionadas y se pueden borrar:**

```
feat/ai-drafter        feat/enlace-descarga     fix/formulario-grupos-vacios
fix/iconos-en-codigo   perf/iconos-subconjunto  perf/sin-zonejs
```

`develop` se queda; conviene adelantarla a `master` cuando se descuelgue.

### Contenido

Los datos viven en `src/assets/data/*.json`: 4 proyectos, 1 experiencia, 18 skills. **Esa es la única copia completa del contenido** — la base de datos es un espejo, no la fuente de verdad. Si la base desaparece, se repuebla con `pnpm run mirror:push`; si el JSON se pierde, no hay de dónde recuperarlo salvo del historial de git.

### Tests

**Frontend**, 44 tests en siete suites (`pnpm run e2e`):

| Suite | Qué protege |
|---|---|
| `blueprint.spec.ts` | encuadre, solapamientos, carriles y cruces del visor |
| `seo.spec.ts` | metadatos por ruta, sobre la aplicación viva |
| `prerender.spec.ts` | el HTML generado, que es lo que ven los rastreadores |
| `iconos.spec.ts` | que ninguna clase devicon inventada llegue a producción, y que la fuente recortada cubra las que se usan |
| `enlaces.spec.ts` | que la ficha ofrezca despliegue o descarga, nunca las dos |
| `limpiar-vacios.spec.ts` | que el panel no envíe campos vacíos que borren contenido |
| `zoneless.spec.ts` | que Zone.js no vuelva a colarse en el bundle |

Las cuatro últimas no necesitan navegador: son funciones puras y comprobaciones sobre ficheros. **`ng test` no tiene target en `angular.json`**, así que `e2e/` es también donde viven los tests unitarios del frontend. Funciona bien y es el patrón a seguir mientras no se monte Karma.

**Backend**, 11 clases de test (`./mvnw test`):

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
| `DraftProjectUseCaseTest` | que un borrador incompleto no llegue al formulario |
| `DraftControllerTest` | que no se pueda gastar cuota de Groq sin autenticar |
| `GroqProjectDrafterTest` | que una clave sin definir se distinga de un fallo de red |

Casi todos nacieron de un fallo real, no de una previsión. Están descritos en el apartado 3.

---

## 2. Decisiones tomadas y por qué

**El sitio público no habla con el backend.** Lee los JSON, que el prerender incrusta en el HTML. Por eso el portafolio siguió en pie las semanas que el backend estuvo caído y por eso ningún visitante espera a que Render despierte. Es la decisión de diseño más importante del proyecto.

**La base de datos es externa (Neon), no de Render.** Las gratuitas de Render se eliminan a los 30 días: la anterior desapareció con todo dentro. Neon suspende tras 5 minutos de inactividad pero despierta sola, sin intervención.

**Los campos documento se guardan en columnas JSON**, no en tablas hijas. `rawMetrics`, `structuredStack` y `structuredFeatures` tienen claves arbitrarias en lenguaje natural; en relacional serían tablas clave-valor.

**El espejo se ejecuta a mano y su resultado se commitea.** Nunca en el build: si el despliegue de Vercel dependiera de que Render está despierto, volvería el arranque en frío que todo esto evita.

**La actualización es parcial.** Lo que no llega en la petición se conserva. Protege frente a cualquier cliente incompleto en vez de depender de que cada formulario recuerde enviarlo todo.

**Los iconos se sirven recortados desde el propio sitio, no desde un CDN.** `scripts/subset-iconos.mjs` recorre los datos **y el código** —hay iconos escritos a mano en componentes— y genera una fuente con solo los que se usan. Las fuentes resultantes se commitean, así que ni CI ni Vercel necesitan Python: solo se regenera aquí. Depender de `devicon@latest` significaba que cualquier cambio que publicaran entraba en el sitio sin tocar nada, que es el mismo mecanismo que retiró el modelo de Groq de debajo del redactor.

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
| Modelo de Groq retirado sin aviso | el redactor devolvía 404 y el motivo quedaba oculto | lista de modelos de reserva; el error trae los vivos |
| La limpieza del formulario solo miraba el primer nivel | se guardó `"live": ""` donde no existía ese campo | `limpiarVacios()` es recursiva |
| Clases devicon inventadas | huecos en la ficha, sin error en consola | `iconos.spec.ts`, sobre datos **y** código |

Y dos pérdidas de datos desde el panel de administración, ambas recuperadas con `mirror:push` desde el JSON del repositorio.

**Lecciones que conviene no olvidar:**

- **`ddl-auto=update` solo añade, nunca corrige.** Un cambio de tipo o una columna sin `identity` sobreviven al arreglo. Si el backend crece, migraciones con Flyway o Liquibase dejan de ser desproporcionadas.
- **Un test que no has visto fallar no protege nada.** Dos tests de esta sesión pasaban contra el código roto: uno usaba un selector inexistente, otro agrupaba por proximidad con una tolerancia insuficiente. Ambos se corrigieron solo después de comprobarlos contra el fallo.
- **Quitar una línea porque genera un aviso es cambiarla sin entenderla.** El dialecto de producción se rompió así.
- **Un aviso que nadie lee no protege.** `NG0914` avisaba en cada arranque de que Zone.js sobraba, y llevaba meses ahí entre el ruido del build: 36 kB por visita. Lo que no falla, no se arregla.
- **Ocultar el detalle de un error lo vuelve indistinguible.** El 404 de un modelo retirado salía como `NotFound` a secas porque el cuerpo se descartaba por precaución. Costó buscar la causa en la clave y en el despliegue antes que en el modelo — el mismo fallo que el 403 vacío de `/error`, repetido en el mismo repositorio que lo documenta.
- **Un test escrito mirando dónde apareció el fallo hereda ese punto ciego.** El de iconos solo recorría los JSON porque ahí estaban los rotos que se encontraron; el siguiente apareció escrito a mano en un componente.

---

## 4. Trabajo pendiente

### Inmediato

- **Borrar las seis ramas ya fusionadas** (listadas en el apartado 1).

### Deuda conocida

- **Tests unitarios del router del visor.** La lógica creció mucho —esquiva obstáculos, reparte carriles, ordena puertos— y solo la cubren tests e2e, que prueban el resultado y no las reglas. `blueprint-path-calculator.spec.ts` lleva meses muerto porque `ng test` no tiene target. **Ya no está bloqueado**: las funciones puras se prueban desde `e2e/` sin navegador, como hacen cuatro suites. Es la deuda más valiosa que queda.
- **Coreografía scroll ↔ URL en `ProjectsComponent`.** Dos banderas y temporizadores de 1 s coordinando el scroll y el fragmento. Funciona, pero es el punto más frágil del frontend.
- **El tema claro solo afecta al visor.** El layout tipo VSCode no tiene variante clara, y `ThemeService.toggleTheme()` no tiene quien lo llame desde que se borró el navbar.
- **El sitemap se genera a mano.** Al añadir un proyecto hay que acordarse; podría salir de `projects.json`.
- **El ring 3D sigue inactivo**, conservado por decisión explícita y documentado en `AGENTS.md`. Sus iconos entran en la fuente recortada igual que los demás, para que reactivarlo no exija acordarse de nada.

### Rendimiento

Medido por primera vez el 22 de septiembre de 2026 con `pnpm run medir`. Portada, CPU frenada ×4, mediana de siete pasadas:

| | Antes | Después |
|---|---|---|
| Descargado | 1104 kB en 19 peticiones | **292 kB en 17** |
| Largest Contentful Paint | 1292 ms | 952 ms |
| Cumulative Layout Shift | 0,021 | 0,001 |

La diferencia es casi toda la fuente de iconos: devicon entero eran 777 kB —el 70 % de la página— para dibujar unas decenas de glifos.

Lo que queda por mirar, en orden de peso:

- `chunk-PFHGLGNV.js`, **70 kB**. Sin identificar; probablemente GSAP o el visor.
- **Inter, 47 kB** desde Google Fonts. Autohospedarla quita dos `preconnect` y una dependencia externa.
- **PrimeIcons, 34 kB**. Mismo caso que devicon: se puede recortar con `scripts/subset-iconos.mjs` extendiéndolo.

## 5. Propuestas ya construidas

Lo que en su día se discutió aquí y hoy funciona:

- **Publicar desde el panel con menos pasos** — `node scripts/mirror.mjs publish` encadena volcado, commit y push, y muestra el diff pidiendo confirmación antes de commitear. El pull request se mantiene manual a propósito: es el diff que ha salvado el contenido dos veces.
- **Pipeline de IA para redactar contenido** — construido y en uso. Descrito en `AGENTS.md`, apartado 3.

Lo que se dejó fuera a propósito y sigue pendiente de decidir:

**Normalizar el vocabulario de `structuredFeatures` y `rawMetrics`.** Sus claves ya son inconsistentes entre proyectos: conviven `Arquitectura` y `Architecture`, `IA` y `Artificial Intelligence`, y tres variantes de «Formatos de exportación» que solo se diferencian en idioma y mayúsculas. Por eso el redactor no las genera: heredaría el desorden y lo ensancharía. Arreglarlo exige decidir un vocabulario único y reescribir los cuatro proyectos, y es más trabajo que el propio pipeline. Mientras tanto, esos campos se editan a mano en el JSON.

## 6. Limitaciones conocidas

- **La actualización parcial no permite vaciar un campo** enviando null, porque null significa «no lo toques». Para vaciarlo hay que editar el JSON y subirlo con el espejo.
- **Los campos primitivos quedan fuera de la fusión** (`int year`, `int displayOrder`): no pueden ser null, así que no se distingue «no enviado» de «enviado con su valor por defecto». En la práctica no importa: ambos clientes los envían siempre.
- **Los ids de la base y los del JSON divergen.** La base asigna los suyos en cada siembra; el volcado conserva los del fichero emparejando por `slug`, para que las URLs `/projects/<id>` no se renumeren.
- **Los despliegues de Render son manuales.** No hay auto-deploy desde Git configurado.
- **`render.yaml` puede no estar en uso.** El servicio se creó a mano desde el dashboard, así que la configuración real vive allí y ese fichero es documentación. Las variables de entorno se definen en el dashboard.
