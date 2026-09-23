# Portafolio Juan Barrios - AI Agent Wiki & Guidelines

Esta es la wiki interna y conjunto de reglas del proyecto. **Para cualquier agente de IA que lea esto:** Analiza esta arquitectura antes de proponer cambios o crear nuevo código.

> **Dos documentos, dos propósitos.** Este describe **cómo funciona** el proyecto: arquitectura, convenciones y reglas. [`ESTADO.md`](./ESTADO.md) describe **dónde está**: qué hay desplegado, qué falta, qué incidentes ocurrieron y qué propuestas quedaron acordadas sin construir. Si vas a retomar el trabajo, empieza por ahí.

## 0. Agent Skills Installed
Skills en `.agents/skills/` que este agente debe cargar según la tarea:

### Frontend (Angular 22)
- `angular-developer` — Official Angular skill (Angular 22, Standalone, Signals, Zoneless)
- `primeng-developer` — PrimeNG component library (v21.x). El tema del panel está en `core/tema/preset-panel.ts`.
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
- **Layout principal (VSCode)**: La UI pública emula un editor tipo VSCode. `VscodeLayoutComponent` (`src/app/layout/vscode-layout/`) es el shell: activity bar, explorer de archivos y **pestañas de editor sintetizadas desde la ruta**. `getTabDetails(path, fragment)` traduce ruta + fragment a un "archivo" (`/` → `README.md`, `/about#experience` → `timeline.json`, `/projects/:id#architecture` → `architecture.drawio`). `syncExplorerFolders()` abre la carpeta del proyecto navegado y colapsa las hermanas. Las rutas públicas son solo tres: `''` (welcome), `projects/:id` y `about`.
- **Componente About**: Es un documento markdown estático (`about.component.html`) con perfil, stack agrupado por categoría y proyectos destacados. Lee de `getStaticExperiences()`, `getStaticProjects()` y `getStaticSkillsFlat()`.
- **Anillo 3D del stack**: `AnilloStackComponent` (`src/app/features/about/stack/anillo-stack/`) dibuja las tecnologias girando en orbita. Vive en `/about/stack` como conmutador junto a la lista, y **la lista es lo principal**: es la que se prerenderiza, la que lee un buscador y la unica de las dos que se puede recorrer con teclado o lector de pantalla. La eleccion no se recuerda a proposito; si se guardara, la pagina apareceria a veces en la forma que no se puede leer sin que quedara claro por que. `e2e/anillo-stack.spec.ts` sujeta eso.

  Salio de `legacy-ring`, que se borro. Recibe las skills ya cargadas del documento en vez de buscarlas: si cada vista fuera a por ellas por su cuenta podrian acabar ensenando cosas distintas. Toda la geometria cuelga de un solo numero, el radio, que sale del ancho del contenedor con una container query —el documento vive en una columna mas estrecha que la ventana, y con un radio fijo las tecnologias de los extremos quedaban cortadas—. Respeta `prefers-reduced-motion`: no gira solo, pero se sigue pudiendo arrastrar.
- **skills.json**: Es un **array** de `SkillCategory[]` (no objeto con claves), con 18 skills en 4 categorías. Cada skill tiene: `id`, `name`, `icon` (clase devicon sin `colored`), `brandColor`, `brandColorLight`, `description`.
- **BlueprintViewer**: `src/app/shared/components/blueprint-viewer/` renderiza los diagramas de arquitectura SVG de cada caso de estudio a partir de `architectureNodes`, `architectureEdges` y `architectureLayout` de `projects.json`. Es el componente más complejo del frontend y está descompuesto en cuatro servicios:
  - `blueprint-layout.service` — valida y normaliza dimensiones de cada nodo.
  - `blueprint-positioning.service` — calcula los puertos por lado y autodetecta cuál usar según la posición relativa de los nodos.
  - `blueprint-path-calculator` — traza las rutas (ortogonal, curva o recta) con offsets para aristas paralelas.
  - `blueprint-color.service` + `utils/blueprint-constants.ts` — paleta por `group` con variantes light/dark.

  Soporta zoom, pan, pinch en móvil, `autoFit()` y resaltado de vecinos con atenuación del resto. El tema lo toma de `ThemeService`, no de `prefers-color-scheme`. La clase CSS de cada nodo es `.svg-node` y la de cada conector `.connector-line` (relevante para los tests e2e).

  **Estética de plano técnico.** La sección se llama "blueprint" y se ve como tal: papel cian con rejilla menor (40u) y mayor (200u), marco de lámina con coordenadas numéricas y alfabéticas, trazo monocromo y cajetín con los datos del diagrama. En tema claro se invierte a *whiteprint*: papel claro con tinta cian. Toda la paleta vive en `utils/blueprint-constants.ts` y en las variables `--bp-*` de `blueprint-viewer.component.css`; ambos archivos deben moverse juntos.

  El único color es el `accent` por grupo, en la banda lateral de 3px y en el icono de cada tarjeta. La sigla del grupo aparece en la esquina superior derecha del nodo. Los grupos válidos están en `BLUEPRINT_COLOR_PALETTE.accents`; uno no declarado cae en `default` (tinta blanca).

  **Anclaje y trazado de conectores.** Los extremos se anclan siempre al borde del nodo, nunca al centro: `computedConnectors` resuelve primero el lado de cada arista, cuenta cuántas comparten ese lado y reparte los anclajes con `BlueprintPositioningService.portPosition()`. El trazado recibe los nodos intermedios como obstáculos y elige la primera ruta candidata sin cruces. Si hace falta forzar un recorrido concreto, `bendPoints` en la arista del JSON tiene prioridad sobre el cálculo automático.
- **Tema**: `ThemeService` (`core/services/theme.service.ts`) es la **única fuente de verdad**. Su constructor aplica el atributo `data-theme` en `<html>` y lo persiste en `localStorage` bajo la clave `jeb-theme`. `AppComponent` solo lo inyecta para instanciarlo. Ningún componente debe fijar `data-theme` por su cuenta ni leer `prefers-color-scheme`. Hay dos interruptores, los dos sobre el mismo servicio: el del sitio, en la barra de actividad del layout tipo VSCode, y el del panel, un selector *Oscuro / Claro* en el pie de la barra lateral —el panel no tiene barra de actividad—. `e2e/tema.spec.ts` comprueba que cambia y que se recuerda, y ademas que en claro ningun texto de la interfaz baja de AA y que los acentos se quedan dentro de una banda comoda: en el tema claro el problema no fue el contraste minimo sino la saturacion, que pasaba la metrica y se leia peor.
- **Panel de administración**: `features/admin/`. `admin.css` es el fichero compartido —cabecera de página, estados de carga y vacío, secciones de formulario, barra de guardado— y cada vista lo carga **antes** que el suyo: `styleUrls: ['../../admin.css', './x.component.css']`. Antes ese bloque estaba copiado en las tres fichas y ya había empezado a separarse entre copias.

  **El armazón es su propio contenedor de desplazamiento** (`height: 100dvh; overflow: hidden` en `.dashboard-layout`, y el scroll en `.dashboard-content`). No es una preferencia: `body` lleva `overflow-x: hidden`, eso le fuerza un `overflow-y` computado y lo convierte en contenedor de desplazamiento, con lo que `position: sticky` deja de tener contra qué pegarse. Con el scroll dentro del panel, la barra lateral se queda quieta y la barra de guardado de los formularios —también sticky— pasa a tener un contenedor real. `e2e/panel-admin.spec.ts` sujeta las dos cosas, porque la causa no se ve leyendo el CSS del panel.

  **El tema del panel es PrimeNG llevado a Material sobre vidrio, en tres ficheros:**

  - `core/tema/preset-panel.ts` — el preset de PrimeNG (parte de Aura). Dice qué pieza toma qué papel: campos, superficies, capas flotantes, pestañas con barra de tinta, botones en pastilla, radios más redondos. **Los colores no están ahí**: cada token apunta a una variable `--admin-*`. La única excepción son las escalas `surface`, que PrimeNG necesita como colores concretos para derivar otros.
  - `styles/admin-tema.css` — los valores, por tema. En oscuro es Shades of Purple, la misma paleta que el editor del sitio. **Los `--admin-*`, `--vidrio*`, `--liquido-*` y `--elev-*` se declaran en la raíz (`[data-theme]`) y no dentro de `.admin-app`**, y no es por gusto: PrimeNG declara sus `--p-*` en `:root`, y una variable que referencia a otra se resuelve donde se declara. Si estos tokens vivieran solo dentro del panel, en `:root` no existirían y PrimeNG se quedaría sin color. Tienen nombres que el sitio no usa, así que no le afectan. Lo que sí se acota a `.admin-app` son los tokens compartidos (`--bg-*`, `--text-*`, `--border-*`, `--estado-*`).
  - `styles/admin-primeng.css` — lo que un token no alcanza: el desenfoque del vidrio, los campos que crecen, el botón de la IA (`styleClass="boton-ia"`), la marca de lo que escribió la IA. Es global por la trampa de siempre: el HTML de dentro de un componente de PrimeNG no lleva el atributo de encapsulación de la vista, y una regla escrita en el CSS de esa vista no lo alcanza. Lo que es de una sola vista va con `:host ::ng-deep`.

  **En el panel no queda HTML interactivo nativo**: botones, campos, desplegables, números, pestañas, el selector de tema y la subida del `.md` son de PrimeNG. Los campos van en `p-floatlabel variant="in"` (el «relleno» de Material, con la etiqueta dentro). Dos cosas que conviene saber:

  - **Un campo dentro de `p-floatlabel` no lleva `placeholder`.** PrimeNG sube la etiqueta en cuanto hay uno, y el ejemplo se leía como un valor escrito («gastu-django» en un slug vacío). Los formatos que importan van en la ayuda de debajo.
  - **Las áreas crecen con su texto** con `field-sizing: content` y, donde no existe, con la directiva `appCrecerConTexto` (`features/admin/crecer-con-texto.directive.ts`). No se usa el `autoResize` de PrimeNG: mide al montar, y la ficha se rellena con el paso 2 oculto; un textarea oculto mide cero y se quedaba plano al aparecer.

  Los avisos y la confirmación son uno para todo el panel: `MessageService` y `ConfirmationService` se proveen en el armazón, con su `<p-toast>` y su `<p-confirmdialog>`, y las vistas los heredan porque se crean dentro de su `router-outlet`. La confirmación de borrar pone el foco en Cancelar (`defaultFocus: 'reject'`).

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

### Redactor de borradores (Groq)

Dos endpoints, el mismo caso de uso detrás:

| Ruta | Qué devuelve | Quién la usa |
|---|---|---|
| `POST /api/projects/draft` | el borrador entero, de una vez | el contrato simple; `scripts/draft.mjs` y los tests |
| `POST /api/projects/draft/stream` | NDJSON: una línea por paso mientras ocurre | el panel |

Ambos reciben `{ name, readme }` y devuelven `name`, `shortDescription`, `fullDescription`, las cinco secciones de `readmeMarkdown` y los `challenges`.

**`name` lo redacta el modelo.** Antes había que escribirlo a mano *antes* de poder pedir el borrador, que es un paso manual puesto delante del automático para pedir un dato que casi siempre está en el readme. Ahora, si viene escrito manda el escrito —alguien decidió cómo se llama el proyecto— y si no, sale del texto. El prompt sabe además convertir un identificador de repositorio en un nombre legible: `tsuki-translator` → `Tsuki Translator`.

Cuatro decisiones que conviene no deshacer sin entenderlas:

- **Nunca persiste.** Devuelve un borrador; guardar sigue siendo el `POST` o el `PUT` de siempre. Así una respuesta de un modelo no puede entrar sola en la base de datos.
- **Requiere autenticación**, y no por privacidad del contenido sino porque cada llamada gasta cuota de pago. Dejarlo abierto no sería una fuga, sería una factura. Las dos rutas, no solo la primera: tener dos puertas y proteger una es la forma habitual de que la nueva se quede abierta.
- **Solo genera prosa.** No toca `techStack`, `structuredStack`, `structuredFeatures` ni `rawMetrics`. Las claves de esos campos ya son inconsistentes entre los cuatro proyectos —conviven `Arquitectura` y `Architecture`, `IA` y `Artificial Intelligence`, y tres variantes de «Formatos de exportación»— y un modelo generándolas libremente añadiría una cuarta cada vez. Los iconos son peor: son clases devicon concretas, que no se adivinan, solo se aciertan por casualidad. Tampoco toca los diagramas: colocar nodos sin solapamientos es un problema de layout, no de redacción.
- **La salida se valida en el caso de uso, no en el adaptador.** Que una descripción corta de 900 caracteres no sirve es una regla del portafolio, no del proveedor. Las cotas salen de medir los cuatro proyectos reales.

Hace falta validar porque el modo objeto JSON garantiza JSON bien formado, no que venga completo. El modo de esquema estricto sí lo garantizaría y los `gpt-oss` lo soportan, pero no se usa: `GROQ_MODEL` es configurable y atar el adaptador a una capacidad que el modelo configurado puede no tener cambiaría un fallo claro por uno raro.

#### De dónde sale el readme

Tres vías, y las tres acaban en la misma caja de texto para que haya un único sitio donde mirar lo que se le va a mandar al modelo:

1. Pegado a mano.
2. **Desde un enlace de GitHub.** La petición sale **del navegador**, no del backend: el readme no es secreto, la API de GitHub manda CORS abierto, y el límite de 60 peticiones por hora es por IP —desde Render lo compartiríamos con lo que haya al lado—. Solo repositorios públicos, sin token; uno privado responde 404 igual que uno inexistente, y el mensaje lo dice junto con la salida.
3. **Subiendo un `.md`.** Se lee con `FileReader`; el fichero no viaja a ningún sitio.

El parser del enlace vive aparte, en `shared/utils/repo-github.ts`, y **no es una comodidad: es lo que decide a qué host se le pide el readme.** Acepta `github.com` y nada más, compara el origen ya parseado y no la cadena, y devuelve `owner` y `repo` por separado para que la URL de la API se construya en el servicio y no con lo que se haya pegado. Ocho pruebas, la mitad de destinos que no deben pasar.

#### El streaming y la pipeline

`draft/stream` responde **NDJSON**, un objeto JSON por línea, y no SSE: `EventSource` solo hace `GET` y el readme va en el cuerpo, así que meterlo en la URL sería mandar miles de caracteres por el query. El cliente lo lee con `fetch` y un `ReadableStream`.

Las claves de `etapa` son estables porque la interfaz decide por ellas: `entrada`, `modelo`, `texto`, `respuesta`, `parseo`, `validacion`, `fin`, `error`.

**A Groq se le pide la respuesta en streaming** y cada trozo sale como una línea `texto` en cuanto llega. Redactar tarda unos ocho segundos y casi todos son la llamada al modelo: con una sola respuesta al final no hay forma de distinguir «está pensando» de «se colgó». El JSON se sigue parseando **al final y entero** —un objeto a medias no se valida— así que lo que se enseña mientras llega es texto para mirar, no datos para usar.

**El fallo viaja dentro del cuerpo, no en el código de estado.** Para cuando algo falla ya se mandaron los 200 y las cabeceras. La línea de `error` lleva `tipo`, que mantiene la distinción que el 422 y el 503 hacen en el otro endpoint: `invalido` se reintenta revisando la entrada, `nodisponible` solo se espera.

**Si Groq no manda un flujo, se lee de una pieza.** Pedir `stream: true` no obliga a nadie a mandarlo, y el lector de SSE recorrería una respuesta normal entera sin reconocer una línea, acabando en «respondió sin contenido generado» —el mismo tipo de mensaje que ya costó una hora el día que retiraron un modelo—. Se mira la primera línea: si empieza por `data:` es un flujo, y si no, se lee como la respuesta de siempre. Queda un `WARN` en el log, porque que funcione no quita que el streaming esté roto.

#### Lo que ve quien usa el panel

La ficha de un proyecto son **dos pasos**, en pestañas: *Redactar con IA* y *Completar la ficha*. Un proyecto nuevo entra por el primero —son treinta campos en blanco y casi todos los de prosa salen del borrador—; uno que ya existe, por el segundo. Los dos se ocultan con `[hidden]` en vez de desmontarse, así que ir y volver no pierde nada. «Seguir sin IA» lleva al formulario sin redactar.

El primer paso vive en `redactor-borrador/` y es de arriba abajo:

1. **La fuente**: el enlace de GitHub, subir un `.md` —o soltarlo encima del editor— y el editor `README.md`, que es lo único que se manda. Se pliega al redactar.
2. **El escenario**, que está desde el principio y no cambia de forma, solo se llena: a la izquierda la pipeline en vertical (`pipeline-borrador/`), a la derecha la ficha pública en pequeño (`vista-ficha/`), y debajo una barra de acciones que dice en cada momento qué se puede hacer. El diseño anterior montaba y desmontaba cajas según avanzaba, y eso era lo que se veía saltar.

La pipeline es un **circuito de líquido**: cuatro estaciones —readme, modelo, JSON, cotas— que son vasos de vidrio casi transparente unidos por tubos. El líquido sale del readme, baja por el tubo que se está recorriendo y va llenando cada estación mientras trabaja; **una estación llena es una estación terminada** (`nivel()` en el componente: el modelo se llena al ritmo de lo que llevan escrito sus salidas, el resto sube a la mitad y se llena al acabar). Si una falla, tiembla, se agrieta y se vacía, con gotas saliendo por abajo. El líquido va detrás del texto y es translúcido, para que se lea igual lleno que vacío. El modelo lleva además un filo de luz que gira mientras trabaja, el espectro de las últimas letras escritas, y sus cuatro salidas como viales redondos que se llenan —sin caja: los «rectángulos dentro de rectángulos» fueron lo primero que hubo que quitar—. Pulsar un vial lleva la vista previa hasta su parte. Cada estación y cada vial siguen siendo un `.nodo` con `data-estado` y un `aria-label` que empieza por su nombre, que es el contrato de los tests.

**La vista previa se escribe letra a letra.** `shared/utils/json-parcial.ts` lee el JSON a medias —devuelve lo leído, qué cadenas ya vieron su comilla de cierre y cuál se estaba escribiendo— y la ficha pone cada campo en su sitio con un cursor en el que está saliendo. Lo que se enseña así **es para mirar, no para guardar**: lo que se acepta sigue siendo el borrador que el backend manda entero y validado en la línea `fin`.

Tres cosas que sostienen que esto no sea una animación decorativa:

- **El ritmo es de la vista, no de los datos.** Lo que llega pasa por `redactor-borrador/reproductor.ts`, que lo suelta a velocidad de lectura —unas 90 letras por segundo, con una pausa breve al abrir cada campo— y hace esperar a cada paso de la pipeline hasta que se ha visto el texto que llegó antes que él, con un mínimo entre pasos para que cada uno se vea ocurrir. Es lento a propósito, como un asistente escribiendo, pero tiene tres límites: **nunca se enseña algo que el modelo no haya escrito** (solo se enseña más tarde), **ningún trozo se ve más de 5 s después de haber llegado** (si se acumula, acelera) y **un error no espera** (se enseña todo lo recibido y el fallo al instante). Con `prefers-reduced-motion` no hay ritmo: se enseña al llegar. Ningún estado lo inventa un temporizador: cada cambio sigue viniendo de una línea del backend o de ver cerrarse un campo en el texto.
- **Una burbuja de salida se da por terminada cuando se cierra su campo, no por el orden.** Antes se suponía que el modelo escribe los campos en el orden pedido —ver la clave siguiente quería decir que la anterior acabó— y era la única suposición del diagrama. Leyendo el JSON a medias ya no hace falta. Los desafíos son la excepción: son una lista de largo desconocido y se cierran cuando el modelo deja de escribir.
- **Un solo nodo se lleva el fallo.** Puede haber dos trabajando a la vez —el del modelo y el del campo que está saliendo— y marcar los dos pintaba dos burbujas diciendo cada una «aquí es donde se cortó».

`estado-nodo.ts` declara **una sola vez** qué significa cada estado: nombre, glifo, color, glosa y si sigue corriendo. El mapa es exhaustivo para que un estado nuevo no se pueda añadir sin decidir cómo se lee. De ahí sale también la diferencia entre `espera` y `no-alcanzado`: uno todavía puede ocurrir y el otro ya no, y sin esa distinción un diagrama parado se lee igual que uno que no ha arrancado. Un flujo que se acaba sin `fin` ni `error` también cuenta como fallo: si no, la vista se quedaría «escribiendo» para siempre.

**El paso 2** (*Completar la ficha*) es un índice fijo a la izquierda —la tarjeta del proyecto tal como sale en la lista, en vivo, y las siete secciones con un anillo que se cierra según se llenan— y las secciones como tarjetas con su contador. Los campos que escribió la IA llevan además un borde del color de la IA hasta que se tocan. Las cuentas salen de `SECCIONES_FICHA` en el componente, y el índice y las cabeceras las leen de ahí para no contar cosas distintas.

**El color de la IA es `--estado-curso`** (violeta, en los dos temas): el botón que la lanza, lo que está trabajando, el cursor. Solo eso. No se usa `--text-accent` porque en oscuro es blanco y no distingue «trabajando» de «texto normal».

**El borrador no entra solo en el formulario**: queda como propuesta en la vista previa y hay que aceptarlo. Al aceptarlo se pasa al segundo paso, y cada campo que escribió la IA queda marcado hasta que lo tocas. Al terminar de redactar el foco va al botón de aceptar: si se quedaba en el de redactar, pulsar Enter volvía a lanzar una llamada de pago.

#### Cuando Groq retira un modelo

**Pasa cada pocos meses y el síntoma es un 404 seco.** Ya pasó: el primer defecto fue `llama-3.3-70b-versatile`, retirado el 16 de agosto de 2026 para los planes gratuito y developer. Nadie sigue las notas de versión de Groq, así que esto se descubre cuando se rompe. Tres medidas, en orden de cuánto ahorran:

1. **`GROQ_MODEL` admite una lista separada por comas**, en orden de preferencia. Si el primero está retirado se pasa al siguiente y el botón sigue funcionando; queda un `WARN` en los logs diciendo cuál cayó.
2. **Si caen todos, el error trae la lista viva.** El adaptador consulta `GET /models` y la incluye en el mensaje, así que no hay que buscar el nombre correcto en ninguna parte.
3. **El cuerpo del error de Groq siempre viaja en el mensaje.** Ocultarlo —que es lo que hacía al principio— dejaba el 404 indistinguible de una URL mal puesta, y se buscó la causa en la clave y en el despliegue antes que en el modelo. Mismo fallo que el 403 vacío de `/error`. La lista vigente está en https://console.groq.com/docs/deprecations.

## 4. Estructura Monorepo
El repositorio funciona como un monorepo no estricto:
- `/` -> Proyecto Angular (Frontend). Vercel lee desde aquí.
- `/backend` -> Proyecto Maven/Gradle Spring Boot. 
- Al realizar commits, tener precaución de no romper el build de Vercel (Vercel ignora los cambios en la carpeta `/backend` si se configura correctamente o al detectar que el build script no depende de ella).

## 5. Reglas de Modificación para Agentes (Guidelines)
- **Aesthetic First**: interfaces modernas, con desenfoques de cristal (glassmorphism) y animaciones sutiles. **Los colores salen siempre de las variables de `styles/theme.css`, nunca escritos a mano**: hay dos temas y un hex suelto solo funciona en uno de los dos. Si hace falta un color que no existe —«salió bien», «salió mal»— se añade el token a los dos bloques del tema antes de usarlo.
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
| `JWT_SECRET` | BASE64 de 256 bits o más: `openssl rand -base64 32` |
| `ADMIN_USERNAME` | usuario del panel |
| `ADMIN_PASSWORD` | contraseña del panel |
| `GROQ_API_KEY` | **opcional** — sin ella el backend arranca igual y solo deja de funcionar el redactor de borradores |

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
- **Ramas:** Todo el desarrollo activo se hace sobre la rama `develop`. Las correcciones aisladas van en su propia rama (`fix/...`, `feat/...`) partiendo de `develop`.
- **`master` solo se actualiza por pull request.** Nunca se hace push directo, ni merge local seguido de push, ni fast-forward desde `develop`. El PR es el único camino.
  - Un agente **no abre ni fusiona el PR por su cuenta**: prepara la rama, la empuja y entrega el enlace de comparación para que el PR lo cree y lo revise una persona.
  - Si se recibe una instrucción ambigua del tipo "haz el merge a master", hay que confirmar que se refiere a abrir un PR antes de tocar `master`.
  - **Vercel despliega producción automáticamente en cada push a `master`** (y previsualizaciones en `develop`). Un push indebido a `master` no es solo un desliz de proceso: publica el sitio. Revertirlo vuelve a desplegar, esta vez la versión antigua.
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

> **Los "Session Log" que siguen son registro histórico**, no descripción del estado actual. Describen decisiones tomadas en su momento y algunas ya no aplican (el formulario de contacto y el ring 3D en `about`, por ejemplo). Para el estado verificado del proyecto, ver la sección 13 al final.

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
- `POST /api/auth/login` → 200 con JWT token (`admin`/`<ADMIN_PASSWORD>`)
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
- Login `admin`/`<ADMIN_PASSWORD>` → redirige a `/admin/dashboard/projects`
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
    "publicKey": "<EMAILJS_PUBLIC_KEY>",
    "serviceId": "<EMAILJS_SERVICE_ID>",
    "templateId": "<EMAILJS_TEMPLATE_ID>"
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

---

## 13. Estado actual verificado (2026-09-21)

Esta sección describe el estado real del repositorio, verificado con build y tests. Tiene precedencia sobre los session logs anteriores.

### Configuración del backend — PENDIENTE en rama aparte

> **El backend de esta rama sigue con las credenciales hardcodeadas.** La corrección existe pero vive en la rama **`fix/backend-secrets`**, sin fusionar, porque requiere un JDK para verificarse y definir variables en Render antes de desplegarse. `develop` contiene únicamente cambios de frontend y es desplegable a Vercel tal cual.

Lo que hace esa rama: `application.properties` pasa a leer las credenciales del entorno **sin valores por defecto**, de modo que la aplicación no arranca si faltan.

| Variable | Uso | Notas |
|---|---|---|
| `JWT_SECRET` | Firma de los tokens | BASE64 de 256 bits o más: `openssl rand -base64 32` |
| `ADMIN_USERNAME` | Usuario del panel admin | |
| `ADMIN_PASSWORD` | Contraseña del panel admin | |
| `JWT_EXPIRATION` | Vigencia del token en ms | Opcional, por defecto `86400000` |

Para fusionarla hacen falta tres cosas, en este orden:

1. Un JDK instalado y `./mvnw test` en verde desde `backend/`.
2. Las tres variables definidas en el dashboard de Render (`render.yaml` las declara con `sync: false`). **Si se despliega sin ellas, el backend no arranca.**
3. Rotar las credenciales anteriores: siguen en el historial de git y deben darse por comprometidas. Quitarlas del HEAD no basta.

En local, copiar `backend/src/main/resources/application-local.properties.example` o exportar las variables antes de `./mvnw spring-boot:run`. Los tests traen sus propios valores dummy en `backend/src/test/resources/application.properties`, así que `./mvnw test` no necesita entorno.

> Las credenciales que estuvieron commiteadas (contraseña admin y claves de EmailJS) se redactaron de este documento, pero **permanecen en el historial de git**.

### SEO

`SeoService` (`core/services/seo.service.ts`) es el unico sitio donde se tocan los metadatos. Cada componente de ruta llama a `update()` en su `ngOnInit` con titulo, descripcion, path y, si aplica, imagen; el servicio deriva el canonical, Open Graph y Twitter Card a partir de `environment.siteUrl`. `setStructuredData()` inserta el bloque JSON-LD, reemplazando el anterior.

| Ruta | Titulo | JSON-LD |
|---|---|---|
| `/` | el completo, sin sufijo | `Person` |
| `/about` | `Sobre mí \| Juan Esteban Barrios` | — |
| `/projects/:id` | `<Proyecto> — Caso de estudio \| …` | `SoftwareSourceCode` |

`public/robots.txt` y `public/sitemap.xml` se sirven como estaticos. **El sitemap se genera a mano**: al agregar o quitar un proyecto hay que actualizarlo.

Los encabezados no llevan las almohadillas en el texto; son un `::before` en CSS. Si se escribe `<h2 class="md-h2">## Algo</h2>` se rompe la indexacion.

### Prerender (SSG)

El sitio publico se compila a **HTML estatico**: `pnpm run build` genera un `index.html` por ruta con los metadatos y el contenido ya escritos, incluido el diagrama SVG. Asi los rastreadores que no ejecutan JavaScript (LinkedIn, WhatsApp, Slack) ven la ficha correcta de cada pagina.

| Archivo | Proposito |
|---|---|
| `src/main.server.ts` | Arranque de servidor. **Debe recibir el `BootstrapContext`**; sin el, la extraccion de rutas falla con NG0401 |
| `src/app/app.config.server.ts` | `provideServerRendering(withRoutes(serverRoutes))` sobre `appConfig` |
| `src/app/app.routes.server.ts` | Que se prerenderiza. `/projects/:id` deriva sus parametros de `projects.json` |
| `angular.json` | `server`, `outputMode: "static"` y `prerender: true` |
| `vercel.json` | Reescritura a `/index.html` para lo que no esta prerenderizado, como `/admin` |

Reglas al tocar codigo que se prerenderiza:

- **Nada de `window`, `localStorage` ni `document` global sin `isPlatformBrowser`.** Se corrigieron `AuthService`, `VscodeLayoutComponent` y `ProjectsComponent` por esto. `DOCUMENT` inyectado si funciona en servidor.
- **Los datos publicos se importan, no se piden por HTTP.** `DataService.getStatic*()` importa los JSON directamente: en el prerender no hay servidor que sirva `/assets/data/*.json`. Ademas ahorra tres peticiones en el navegador.
- `/admin` se queda en `RenderMode.Client`: depende de sesion y del backend.
- La hidratacion esta activa (`provideClientHydration(withEventReplay())`), asi que el HTML prerenderizado se reaprovecha en vez de repintarse.

### Espejo entre el backend y los JSON

El sitio publico **nunca habla con el backend**: lee `src/assets/data/*.json`, que se compilan dentro del bundle. Eso es lo que mantuvo el portafolio en pie cuando la base gratuita de Render se elimino con todo su contenido dentro.

```bash
pnpm run mirror:push   # JSON -> API   (siembra o recupera la base)
pnpm run mirror:pull   # API -> JSON   (refresca el espejo)
```

Requiere las credenciales de admin, definidas **solo en la terminal**, nunca en el repositorio:

```powershell
$env:MIRROR_USER="..."; $env:MIRROR_PASSWORD="..."
```

Reglas que el script respeta y que conviene no romper:

- **Se ejecuta a mano y su resultado se commitea. Nunca en el build.** Si el despliegue de Vercel dependiera de que Render esta despierto, volveria el problema de arranque en frio que todo este diseno evita, y un backend dormido podria tumbar un despliegue.
- **`pull` conserva el id previo emparejando por `slug`.** La base asigna ids nuevos en cada siembra y las URLs publicas son `/projects/<id>`: sin esto, un ciclo push/pull renumeraria los casos de estudio y romperia enlaces, sitemap y canonical.
- **`pull` respeta el orden de claves** del fichero anterior, para que el diff sea revisable.
- **`pull` aborta si la API devuelve cero proyectos**, en vez de vaciar el sitio.

El backend modela los 28 campos, no solo los 11 de antes. Los que tienen forma de documento (diagramas, readme, stack estructurado, metricas) viven en **columnas JSON** con `@JdbcTypeCode(SqlTypes.JSON)`: son claves arbitrarias y colecciones que siempre se leen enteras, y en relacional serian ocho tablas, varias clave-valor. Las coordenadas son enteros y no decimales, para que la exportacion no devuelva `505.0` donde el JSON tiene `505`.

`MirrorRoundTripTest` recorre el circuito completo sin HTTP con el `projects.json` real: lo deserializa, lo guarda, lo relee y lo vuelve a serializar, comparando campo a campo. Como Jackson falla ante campos desconocidos, que el test pase demuestra ademas que el dominio cubre todo lo que hay en el fichero. **Es lo que impide que una sincronizacion borre en silencio los diagramas**, y hoy ese JSON es la unica copia completa que queda del contenido.

> **La base de datos es externa.** Las gratuitas de Render se eliminan a los 30 dias. Se usa Neon con las tres variables `SPRING_DATASOURCE_*` definidas en el dashboard, y **conexion directa, no el pooler**: Hibernate ejecuta DDL al arrancar con `ddl-auto=update`, y el pooler en modo transaccion lo rompe.

### Tests e2e

```bash
pnpm run e2e
```

`playwright.config.ts` levanta `ng serve` en el puerto 4212 automáticamente (`reuseExistingServer: true`). **`ng test` no tiene target en `angular.json`**, así que `e2e/` es también donde viven los tests unitarios del frontend: las funciones puras se importan y se prueban sin navegador, y ese es el patrón a seguir mientras no se monte Karma.

Los casos del visor se derivan de `src/assets/data/projects.json`: cualquier proyecto que no sea `Draft` y tenga `architectureNodes` genera un test que comprueba que se renderiza un `.svg-node` por nodo del JSON. No hay ids hardcodeados.

Las suites del panel (`panel-admin`, `pipeline-borrador`) entran poniendo un token en `localStorage`: el guard solo mira que exista, y esas vistas no piden datos al arrancar, así que se prueban sin backend. `pipeline-borrador` además **simula el NDJSON** del endpoint de redacción con `page.route`, lo que permite comprobar la pipeline entera —incluido el camino de fallo— sin gastar cuota de Groq.

La primera vez hace falta descargar el navegador: `npx playwright install chromium`.

### Componentes sin referencias

Se eliminaron `contact`, `navbar`, `footer`, `home`, `hero`, `project-card` y `project-modal`, huérfanos desde el rediseño del layout. Con `contact` se fueron `ConfigService`, la dependencia `@emailjs/browser` y el bloque `emailjs` de los environments — **el formulario de contacto ya no existe**; el contacto son enlaces directos en `about`. `public/config.json` quedó inerte (sigue en `.gitignore`).

**`legacy-ring` se borró.** Era la página de «about» entera antes de partirla en tres documentos, y llevaba meses sin ruta. De ella solo se salvó el anillo 3D, que vive ahora en `features/about/stack/anillo-stack/` y se ofrece como conmutador junto a la lista en `/about/stack`. Lo demás eran textos escritos a mano que ya están en `profile.md` y `trayectoria.md`, contadores fijos que llevaban meses sin cuadrar con los datos («20+ Tecnologías», «5 Proyectos») e iconos de Font Awesome, que este sitio ya no carga.

**`knowledge-pillars` sigue huérfano y a propósito.** Solo lo usaba `legacy-ring`. Tiene contenido —«lo que aplico hoy» frente a «lo que estoy incorporando»— que no está en ningún otro sitio, así que merece una decisión y no un borrado de paso. Angular no lo incluye en el bundle al no estar referenciado.

### Iconos

**Ya no se cargan por CDN** (lo que dice el session log de la sección 10 no aplica). `scripts/subset-iconos.mjs` recorre los datos **y el código** —hay clases escritas a mano en componentes— y genera una fuente recortada con solo los glifos que se usan; se sirve desde `fonts/iconos.css`, referenciado en `src/index.html`. Las fuentes resultantes se commitean, así que ni CI ni Vercel necesitan Python.

Devicon entero pesaba 777 kB, el 70 % de la portada, para dibujar unas decenas de glifos. `iconos.spec.ts` comprueba que ninguna clase inventada llegue a producción y que la fuente recortada cubra las que se usan.

**Font Awesome no se carga.** Las clases `fa-` que queden en el código son restos; la trayectoria traduce `briefcase`, `code` y `graduation-cap` a PrimeIcons y cualquier otro valor cae al icono por defecto.

### Deuda técnica conocida

- **`ProjectsComponent`, coreografía scroll ↔ URL**: `isProgrammaticScroll` e `ignoreFragmentUpdate` coordinan con timeouts de 1s el scroll disparado por el fragment y el fragment disparado por ScrollTrigger. Funciona, pero es frágil y depende de temporizadores. Candidato a refactor.
- **`environment.useStaticData` no se consulta en ningún sitio.** Los componentes públicos llaman a `getStatic*()` incondicionalmente. El único que lo leía era `legacy-ring`, que ya no existe: hoy es configuración muerta y conviene borrarla o darle uso.
- **`knowledge-pillars` huérfano**, pendiente de decidir (ver arriba).
