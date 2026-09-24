# Estado del proyecto y trabajo pendiente

> **Qué es este documento.** `AGENTS.md` describe *cómo funciona* el proyecto: arquitectura, convenciones, reglas. Este describe *dónde está* y *qué falta*: el estado de cada pieza, las decisiones tomadas y por qué, lo pendiente y las propuestas aún sin construir.
>
> Última actualización: 24 de septiembre de 2026.

---

## 1. Estado actual

### Qué está vivo

| Pieza | Estado | Dónde |
|---|---|---|
| Sitio público | Funcionando, prerenderizado | `portafolio-juan-barrios.vercel.app` |
| Backend | Funcionando | `portafolio-juan-barrios.onrender.com` |
| Base de datos | **Neon**, sembrada | externa a Render |
| CI | Verde en cada push y PR | GitHub Actions |
| Redactor con IA | Funcionando, en streaming | Groq, `openai/gpt-oss-120b` |

### Ramas

Todo lo publicado pasa por `master` mediante pull request. El 24 de septiembre se podaron todas las ramas fusionadas y `develop` se adelantó a `master`; quedan dos:

```
master   develop
```

Cada cambio va en una rama corta desde `master` (`feat/…`, `chore/…`, `contenido/…`) que se borra al fusionar.

### Contenido

Los datos viven en `src/assets/data/*.json`: 4 proyectos, 3 entradas de trayectoria, 22 skills en 5 categorías, más `perfil.json` con la cabecera (nombre, titular, especialidad, formación, ubicación, estado laboral y contacto). **Esa es la única copia completa del contenido** — la base de datos es un espejo, no la fuente de verdad. Si la base desaparece, se repuebla con `pnpm run mirror:push`; si el JSON se pierde, no hay de dónde recuperarlo salvo del historial de git.

`perfil.json` no pasa por el backend, a diferencia del resto: son unas pocas cadenas que cambian una vez al año, y montarles modelo, tabla y formulario costaría más que editarlas ahí. `e2e/perfil.spec.ts` comprueba que ninguna de ellas esté además copiada a mano en una plantilla, que es lo que hacía que cambiar el JSON dejara la interfaz diciendo dos cosas distintas.

### Tests

**Frontend**, 177 tests en 24 ficheros (`pnpm run e2e`):

| Suite | Qué protege |
|---|---|
| `blueprint.spec.ts` | encuadre, solapamientos, carriles y cruces del visor |
| `blueprint-router.spec.ts` | las reglas del trazado, no solo el resultado |
| `seo.spec.ts` | metadatos por ruta, sobre la aplicación viva |
| `prerender.spec.ts` | el HTML generado, que es lo que ven los rastreadores |
| `sitemap.spec.ts` | que el sitemap salga de los datos y no de una lista a mano |
| `iconos.spec.ts` | que ninguna clase devicon inventada llegue a producción, y que la fuente recortada cubra las que se usan |
| `enlaces.spec.ts` | que la ficha ofrezca despliegue o descarga, nunca las dos |
| `limpiar-vacios.spec.ts` | que el panel no envíe campos vacíos que borren contenido |
| `zoneless.spec.ts` | que Zone.js no vuelva a colarse en el bundle |
| `tema.spec.ts` | que el tema claro se recuerde, y que en claro nada baje de AA ni se salga de la banda cómoda |
| `explorador.spec.ts` | que los enlaces del explorador abran lo que dicen |
| `perfil.spec.ts` | que los datos de perfil no estén copiados a mano en ninguna plantilla |
| `coordinador-scroll.spec.ts` | la coordinación entre scroll y URL |
| `anillo-stack.spec.ts` | que la lista siga siendo lo principal y el anillo un extra que se pide |
| `repo-github.spec.ts` | a qué host se le pide un readme; la mitad son destinos que **no** deben pasar |
| `jwt-interceptor.spec.ts` | a qué peticiones se les pega el token; casi todas son destinos que **no** deben llevarlo |
| `panel-admin.spec.ts` | el armazón del panel: la barra que se quedaba atrás, la de guardado, los dos pasos, el interruptor de tema y el índice de la ficha |
| `pipeline-borrador.spec.ts` | la pipeline entera con el NDJSON simulado: que la ficha se llene con el JSON a medias, que un campo se dé por escrito al cerrarse y no por el orden, que un flujo sin final no se quede escribiendo, y que el borrador no entre solo en el formulario |
| `ui-admin.spec.ts` | los controles de PrimeNG tal como se usan en el panel: el teclado del desplegable, que el número no acepte letras ni se salga de sus límites, que un área crezca con su texto, y que el diálogo de borrar tenga el foco en Cancelar y no borre si se cancela |
| `reproductor.spec.ts` | el ritmo de la redacción con un reloj falso: que nunca enseñe lo que no ha llegado, que un paso espere a su texto, que un error no espere, y el tope de retraso |
| `json-parcial.spec.ts` | el lector del JSON a medias, cortando en cada posición posible: dentro de una clave, de un escape, tras los dos puntos |

**`ng test` no tiene target en `angular.json`**, así que `e2e/` es también donde viven los tests unitarios del frontend: las funciones puras se importan y se prueban sin navegador. Es el patrón a seguir mientras no se monte Karma. Las suites del panel entran poniendo un token en `localStorage` —el guard solo mira que exista— y `pipeline-borrador` simula el NDJSON con `page.route`, así que se prueban sin backend y sin gastar cuota de Groq.

**Backend**, 17 clases de test, 82 tests (`mvn test` en Docker, ver el aviso de abajo):

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
| `DraftProjectUseCaseTest` | que un borrador incompleto no llegue al formulario, que sin nombre se redacte igual, y que un borrador que no pasa las cotas se pida **una** vez más con el motivo y no más |
| `DraftControllerTest` | que no se pueda gastar cuota de Groq sin autenticar, por **ninguna** de las dos rutas |
| `GroqProjectDrafterTest` | que una clave sin definir se distinga de un fallo de red |
| `EnsamblarSseTest` | el lector del flujo: prefijos, líneas de mantenimiento, trozos sin contenido, centinela, errores dentro del flujo y el diagnóstico de un flujo que solo razonó |
| `RespuestaDeUnaPiezaTest` | que si Groq no manda un flujo, se lea igual y el error diga qué llegó |

Casi todos nacieron de un fallo real, no de una previsión. Están descritos en el apartado 3.

> **El backend se compila y se prueba en local con Docker, sin JDK.** En la máquina de desarrollo no hay JDK, y durante meses los cambios de Java salieron sin compilar y se verificaban en CI o, peor, en Render: eso ya costó un despliegue roto. Docker Desktop sí está instalado, así que la imagen de Maven hace de JDK. Desde la raíz del repo (el repo entero, no solo `backend/`: `MirrorRoundTripTest` y `HealthControllerTest` leen `src/assets/data/projects.json` y `render.yaml`):
>
> ```bash
> MSYS_NO_PATHCONV=1 docker run --rm -v "$(pwd -W):/repo" -v portafolio-m2:/root/.m2 -w /repo/backend maven:3.9-eclipse-temurin-17 mvn -q -B test
> ```
>
> El volumen `portafolio-m2` guarda las dependencias entre ejecuciones. Hay que arrancar Docker Desktop antes. **Un cambio de Java no se sube sin pasar por aquí.**

---

## 2. Decisiones tomadas y por qué

**El sitio público no habla con el backend.** Lee los JSON, que el prerender incrusta en el HTML. Por eso el portafolio siguió en pie las semanas que el backend estuvo caído y por eso ningún visitante espera a que Render despierte. Es la decisión de diseño más importante del proyecto.

**La base de datos es externa (Neon), no de Render.** Las gratuitas de Render se eliminan a los 30 días: la anterior desapareció con todo dentro. Neon suspende tras 5 minutos de inactividad pero despierta sola, sin intervención.

**Los campos documento se guardan en columnas JSON**, no en tablas hijas. `rawMetrics`, `structuredStack` y `structuredFeatures` tienen claves arbitrarias en lenguaje natural; en relacional serían tablas clave-valor.

**El espejo se ejecuta a mano y su resultado se commitea.** Nunca en el build: si el despliegue de Vercel dependiera de que Render está despierto, volvería el arranque en frío que todo esto evita.

**La actualización es parcial.** Lo que no llega en la petición se conserva. Protege frente a cualquier cliente incompleto en vez de depender de que cada formulario recuerde enviarlo todo.

**Los iconos se sirven recortados desde el propio sitio, no desde un CDN.** `scripts/subset-iconos.mjs` recorre los datos **y el código** —hay iconos escritos a mano en componentes— y genera una fuente con solo los que se usan. Las fuentes resultantes se commitean, así que ni CI ni Vercel necesitan Python: solo se regenera aquí. Depender de `devicon@latest` significaba que cualquier cambio que publicaran entraba en el sitio sin tocar nada, que es el mismo mecanismo que retiró el modelo de Groq de debajo del redactor.

**El redactor propone, no rellena.** Lo que sale del modelo queda como propuesta y hay que aceptarla campo por campo. Mientras se redactaba sobre formularios vacíos volcarlo directo estaba bien; al redactar sobre un proyecto que ya tiene contenido, lo que había se perdía sin haberlo visto.

**El nombre del proyecto lo redacta el modelo.** Exigirlo a la entrada era un paso manual puesto delante del automático para pedir un dato que casi siempre está en el readme. Si se escribe, manda el escrito.

**A Groq se le pide la respuesta en streaming.** No es adorno: redactar tarda unos ocho segundos y casi todos son la llamada al modelo. Con una sola respuesta al final no hay forma de distinguir «está pensando» de «se colgó», que es exactamente lo que se vio la primera vez que falló.

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
| Un `'
'` que perdio la barra invertida al generarse el fichero desde un script | el build de Java se paro entero: "illegal line end in character literal". Ninguna prueba del backend llego a correr, asi que no salio como un test rojo sino como el despliegue caido | los literales delicados no se escriben desde un heredoc; hay un verificador de literales sin cerrar en el scratchpad |
| `body` con `overflow-x: hidden`, que le fuerza un `overflow-y` computado | `position: sticky` deja de tener contra que pegarse: la barra lateral del panel se iba con la pagina, y la de guardado tampoco funcionaba | el panel es su propio contenedor de desplazamiento; `panel-admin.spec.ts` |
| El `<input>` de PrimeNG no lleva el atributo de encapsulacion del componente que lo usa | «Equipo» y «Orden» dibujaban un campo de 241px en un hueco de 110 y se montaban sobre el de al lado | la regla vive en `styles/global.css`, que si lo alcanza |
| El lector de SSE daba por hecho que la respuesta seria un flujo | una respuesta de una pieza se recorria entera sin reconocer una linea y salia como «respondio sin contenido generado» | se mira la primera linea y se decide; `RespuestaDeUnaPiezaTest` |
| `marcarFallo` pintaba en rojo todos los nodos en curso | al cortarse la redaccion salian dos burbujas diciendo cada una «aqui es donde se corto» | un solo nodo se lleva el fallo; el resto pasa a «no se llego» |
| Hijos de una columna flex con desplazamiento, que se encogen antes de que salga la barra | en una ventana baja, la caja de la respuesta en crudo medía 2px: se veía el borde y el botón quedaba debajo, sin poder pulsarse | `flex-shrink: 0` en los hijos; lo destapó un test que no podía hacer clic |
| Tope de retraso calculado sobre el total pendiente | «pendiente ÷ 5 s» recalculado en cada latido frena exponencialmente: la vista nunca se ponía al día con un bloque grande | el tope se mide por trozo, con la hora a la que llegó; lo cazó `reproductor.spec.ts` |
| El prompt pedía «no inventes» y a la vez de 3 a 4 desafíos | con un readme que no cuenta problemas, el modelo obedeció lo primero y devolvió la lista vacía; se tiraba el borrador entero | el prompt dice que la regla vale para los datos y no para la estructura, y cómo deducir los desafíos; si aun así no pasa las cotas, un reintento con el motivo |
| El lector del flujo se saltaba toda línea sin texto, también los errores | «Groq mando un flujo sin texto dentro», enseñando la primera línea: el saludo de rol, que es siempre igual y no explica nada | el lector apunta `finish_reason`, cuánto razonó el modelo y los `error` dentro del flujo, y el mensaje dice la causa; una respuesta ilegible (vacía, cortada razonando, no-JSON) se reintenta una vez; los `gpt-oss` van con `reasoning_effort: low` y `max_completion_tokens` |
| La espera de Render caía en la burbuja del readme | «Readme · 137,8 s» por leer un texto que tarda cero: era el backend despertando | estación «Servidor» propia, y un `GET /api/health` al abrir el redactor para que vaya despertando mientras se pega el readme |
| Sin plazo explícito para las respuestas en streaming | Spring usa el del contenedor (~30 s); al vencer intenta pintar una página de error sobre una respuesta ya enviada: «Cannot render error page... response has already been committed» | `spring.mvc.async.request-timeout=180s` |
| Un error vaciaba el reproductor de golpe | los pasos que sí habían ido bien salían terminados en milisegundos | el error respeta su turno y lo pendiente se acelera con un plazo fijo; el primer intento recalculaba «pendiente ÷ plazo» en cada latido y volvió a frenar exponencialmente, como el tope de retraso |
| `placeholder` dentro de `p-floatlabel` | PrimeNG sube la etiqueta si el campo tiene ejemplo: un slug vacío parecía escrito con «gastu-django» | sin `placeholder` en esos campos; el formato va en la ayuda |
| Tokens del panel declarados solo dentro de `.admin-app` | el preset de PrimeNG los referencia desde `:root`, donde no existían: sus componentes se habrían quedado sin color | los `--admin-*` se declaran en la raíz |
| `grid-template-columns: 1fr` en móvil | `1fr` no baja del ancho mínimo de su contenido, y la dirección de la vista previa no se parte: la columna se salía de la pantalla | `minmax(0, 1fr)` y `min-width: 0` en las columnas |

Y dos pérdidas de datos desde el panel de administración, ambas recuperadas con `mirror:push` desde el JSON del repositorio.

**Lecciones que conviene no olvidar:**

- **`ddl-auto=update` solo añade, nunca corrige.** Un cambio de tipo o una columna sin `identity` sobreviven al arreglo. Si el backend crece, migraciones con Flyway o Liquibase dejan de ser desproporcionadas.
- **Un test que no has visto fallar no protege nada.** Dos tests de esta sesión pasaban contra el código roto: uno usaba un selector inexistente, otro agrupaba por proximidad con una tolerancia insuficiente. Ambos se corrigieron solo después de comprobarlos contra el fallo.
- **Quitar una línea porque genera un aviso es cambiarla sin entenderla.** El dialecto de producción se rompió así.
- **Un aviso que nadie lee no protege.** `NG0914` avisaba en cada arranque de que Zone.js sobraba, y llevaba meses ahí entre el ruido del build: 36 kB por visita. Lo que no falla, no se arregla.
- **Ocultar el detalle de un error lo vuelve indistinguible.** El 404 de un modelo retirado salía como `NotFound` a secas porque el cuerpo se descartaba por precaución. Costó buscar la causa en la clave y en el despliegue antes que en el modelo — el mismo fallo que el 403 vacío de `/error`, repetido en el mismo repositorio que lo documenta.
- **Un test escrito mirando dónde apareció el fallo hereda ese punto ciego.** El de iconos solo recorría los JSON porque ahí estaban los rotos que se encontraron; el siguiente apareció escrito a mano en un componente.
- **Sin compilador, lo que se escribe es una hipótesis.** Los cambios de Java de la última sesión salieron sin compilar en local porque no hay JDK en la máquina, y uno tumbó el despliegue por una barra invertida perdida. El verificador de literales que se montó después ayuda, pero no sustituye a `javac`: cubre una clase de error, no todas.
- **Un arreglo que no se mira no está comprobado.** El primer intento de fijar la barra lateral fue `position: sticky`, y no funcionó. No se vio leyendo el CSS —ahí parecía correcto— sino midiendo la cadena de ancestros en el navegador: la causa estaba en `body`, tres niveles por encima y en otro fichero.
- **Angular no avisa cuando una regla CSS no alcanza a su objetivo.** La encapsulación añade un atributo a cada selector, y si el elemento lo dibuja una librería no lo lleva: la regla no falla, no se queja, simplemente no se aplica. Ya pasó con el tema claro del blueprint y volvió a pasar con los campos de PrimeNG.
- **Una prueba intermitente es una prueba mal escrita hasta que se demuestre lo contrario.** Una del panel falló dos veces y las dos se achacó a arrastre de la tanda; era un `count()` sin reintento preguntando antes de que el formulario se repintara.
- **Recalcular una velocidad como «lo que falta ÷ el plazo» en cada latido no llega nunca.** Pasó dos veces en el mismo fichero, con el tope de retraso y con la prisa de un error: cada latido reparte lo que queda en el plazo entero, así que se va frenando. Un plazo se fija una vez, como una hora, y se divide lo que falta entre lo que queda de él.
- **Dos instrucciones del prompt que se contradicen las resuelve el modelo, y no como querías.** «No inventes» y «siempre 3 o 4 desafíos» chocan con un readme que no cuenta problemas; ganó la primera y la lista salió vacía. Cuando una regla es de datos y otra de forma, hay que decirlo.
- **Una petición de estilo no es una petición de dependencias.** «Material design» se pidió como filosofía de diseño y se leyó como «quitar PrimeNG»: se rehizo el panel entero con componentes propios que hubo que deshacer. Ante un cambio que borra una dependencia o reescribe muchas vistas, se confirma el alcance antes de empezar, no después.
- **`ng serve` puede quedarse con una versión vieja de un componente.** Tras cambiar a la vez la plantilla de un padre y las entradas de un hijo, el servidor de desarrollo sirvió la plantilla nueva contra la clase antigua: `ASSERTION ERROR: ... does not have an input with a public name of "texto"` en la consola, la vista del hijo congelada y nada más. Los tests pasaban porque Playwright arranca su propio servidor. Si algo se ve roto en `ng serve` y los tests pasan, primero la consola, y después reiniciar el servidor.
- **Si dos cosas pueden estar trabajando a la vez, hay que decidir cuál falla.** Marcar todas las que estuvieran en curso hacía que el diagrama dijera dos veces «aquí se cortó», que es la contradicción que la declaración única de estados existe para impedir.

---

## 4. Trabajo pendiente

### Inmediato

- ~~Instalar un JDK~~ — resuelto con Docker (ver arriba). Instalar un JDK de verdad seguiría siendo más rápido, pero ya no es un bloqueo.
- **Tras fusionar el vocabulario, `pnpm run mirror:push`.** Los datos se migraron en el JSON; la base sigue con las claves viejas, y un `mirror:publish` antes del push las traería de vuelta. El push sustituye la base por el JSON, así que de paso se va GastuApp (id 39), que ya no está en el JSON. Lo que se haya editado en el panel sin publicar se pierde: si hay dudas, antes un `mirror:pull` y mirar el diff.
- **Borrar GastuApp (id 39) desde el panel.** Se retiró del JSON a mano; si sigue en la base, el próximo `mirror:publish` lo vuelve a traer.
- **Comprobar si el `.exe` de SGVA Assistant sigue apuntando a `/releases/latest`** después de la próxima publicación.

### Deuda conocida

- **Tests unitarios del router del visor.** La lógica creció mucho —esquiva obstáculos, reparte carriles, ordena puertos—. `blueprint-router.spec.ts` ya cubre parte de las reglas desde `e2e/`, sin navegador; queda el resto.
- **Coreografía scroll ↔ URL en `ProjectsComponent`.** Dos banderas y temporizadores de 1 s coordinando el scroll y el fragmento. Funciona, pero es el punto más frágil del frontend.
- **`knowledge-pillars` está huérfano.** Solo lo usaba `legacy-ring`, que se borró. Tiene contenido —«lo que aplico hoy» frente a «lo que estoy incorporando»— que no está en ningún otro sitio: o vuelve a `profile.md` o se borra, pero merece una decisión.
- **Contenido de las fichas hechas a mano con datos que el readme no sostiene.** Salió al compararlas con las del redactor: Gastu Django habla de un «Circuit Breaker» y de «Llama 3», y da el agente de IA por integrado cuando el readme lo lista como pendiente; Salsamentaría dice «E-commerce B2B», «rating A» y «quality gates en CI». Puede que sean ciertos y el readme se haya quedado corto, pero hoy la ficha y el readme dicen cosas distintas.
- **La barra de guardado sólo está en las fichas.** Las listas no la necesitan, pero conviene no olvidar que el patrón existe si se añade otra vista con formulario largo.

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
- **Pipeline de IA para redactar contenido** — construido y en uso. Descrito en `AGENTS.md`, apartado 3. Hoy además: el readme se trae de un enlace de GitHub o se sube como `.md`, el nombre lo redacta el modelo, la respuesta llega en streaming y el progreso se ve como una pipeline vertical con la ficha pública al lado, escribiéndose letra a letra mientras el modelo responde.
- **Interruptor de tema claro/oscuro** — vive en la barra de actividad del layout. El tema claro se rehízo entero: el problema no era el contraste mínimo sino la saturación, que pasaba la métrica y se leía peor.
- **El anillo 3D del stack** — estuvo meses huérfano y ahora vive en `/about/stack` como conmutador junto a la lista.
- **Sitemap generado desde los datos** — `pnpm run sitemap`, con `sitemap.spec.ts` comprobando que no se quede atrás.

Lo que se dejó fuera a propósito y sigue pendiente de decidir:

~~Normalizar el vocabulario de `structuredStack`, `structuredFeatures` y `rawMetrics`~~ — hecho el 24 de septiembre. Hay un vocabulario cerrado en `src/assets/data/vocabulario.json`, los cuatro proyectos migrados y el redactor genera el stack y los grupos. Las claves de las métricas se tradujeron al español, pero el redactor no las genera: son cifras. **Las fichas hechas a mano no se tocan más allá de renombrar claves**: se restauraron las métricas Estado y Equipo y Hibernate volvió a la base de datos, que la migración había cambiado por su cuenta.

## 6. Limitaciones conocidas

- **La actualización parcial no permite vaciar un campo** enviando null, porque null significa «no lo toques». Para vaciarlo hay que editar el JSON y subirlo con el espejo.
- **Los campos primitivos quedan fuera de la fusión** (`int year`, `int displayOrder`): no pueden ser null, así que no se distingue «no enviado» de «enviado con su valor por defecto». En la práctica no importa: ambos clientes los envían siempre.
- **Los ids de la base y los del JSON divergen.** La base asigna los suyos en cada siembra; el volcado conserva los del fichero emparejando por `slug`, para que las URLs `/projects/<id>` no se renumeren.
- **Los despliegues de Render son manuales.** No hay auto-deploy desde Git configurado.
- **`render.yaml` puede no estar en uso.** El servicio se creó a mano desde el dashboard, así que la configuración real vive allí y ese fichero es documentación. Las variables de entorno se definen en el dashboard.
