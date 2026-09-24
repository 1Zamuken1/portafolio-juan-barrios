import { test, expect } from '@playwright/test';

/**
 * El redactor, con el backend simulado.
 *
 * El endpoint responde NDJSON: un objeto por línea, que el panel va leyendo
 * mientras llega. Aquí se sirve entero de golpe —Playwright no trocea la
 * respuesta— pero el cliente lo parte por líneas igual, así que lo que se
 * comprueba es lo que importa: que cada línea mueve su paso, que la vista
 * previa se llena con lo que va llegando, y sobre todo que el borrador NO entra
 * solo en el formulario.
 *
 * Esa última parte es la razón de ser del fichero. Antes se volcaba directo, y
 * al redactar sobre un proyecto que ya tenía contenido, lo que había se perdía
 * sin haberlo visto.
 */

const BORRADOR = {
  name: 'Tsuki Translator',
  shortDescription: 'Traductor de subtítulos con modelos locales.',
  fullDescription: 'Una aplicación de escritorio que traduce ficheros de subtítulos sin salir del equipo.',
  readmeMarkdown: {
    objective: 'Traducir subtítulos sin depender de un servicio de pago.',
    architecture: 'Capa de dominio aislada y adaptadores para cada motor.',
    mainFeatures: 'Carga de ficheros, traducción por lotes y exportación.',
    technologies: 'Python, PyQt y modelos locales.',
    learnings: 'Aislar el motor detrás de un puerto permitió cambiarlo sin tocar la interfaz.'
  },
  challenges: [
    { title: 'Sincronía de tiempos', description: 'Mantener las marcas al reescribir el texto.' },
    { title: 'Memoria', description: 'Cargar el modelo sin agotar la RAM del equipo.' }
  ]
};

/** Sirve un flujo de líneas como lo haría el backend. */
async function simularStream(page: import('@playwright/test').Page, lineas: object[]) {
  await page.route('**/projects/draft/stream', async (ruta) => {
    await ruta.fulfill({
      status: 200,
      contentType: 'application/x-ndjson',
      body: lineas.map((l) => JSON.stringify(l)).join('\n') + '\n'
    });
  });
}

const FLUJO_COMPLETO = [
  { etapa: 'entrada', detalle: 'Readme de 1200 caracteres, sin nombre: lo saca del texto' },
  { etapa: 'modelo', detalle: 'Consultando openai/gpt-oss-120b' },
  { etapa: 'texto', detalle: '{"name":' },
  { etapa: 'texto', detalle: '"Tsuki Translator"' },
  { etapa: 'respuesta', detalle: 'openai/gpt-oss-120b respondió 1840 caracteres en 7,4 s' },
  { etapa: 'parseo', detalle: 'El JSON tiene la forma esperada' },
  { etapa: 'validacion', detalle: 'Los 12 campos caben dentro de las cotas' },
  { etapa: 'fin', borrador: BORRADOR }
];

/** Deja el panel listo para redactar, con un readme que pase el mínimo. */
async function prepararRedaccion(page: import('@playwright/test').Page) {
  await page.addInitScript(() => localStorage.setItem('jwt_token', 'prueba-e2e'));
  await page.goto('/admin/dashboard/projects/new');
  await page.locator('#readmeFuente').fill('# Tsuki Translator\n\nUn traductor de subtítulos. '.repeat(12));
  await page.getByRole('button', { name: 'Redactar borrador' }).click();
}

const nodo = (page: import('@playwright/test').Page, titulo: string) =>
  page.locator(`.nodo[aria-label^="${titulo}:"]`);

test('las burbujas y la ficha están antes de redactar', async ({ page }) => {
  // Lo que se reportó del diseño anterior: cuadros que aparecían y
  // desaparecían. La pipeline y la vista previa tienen que estar desde el
  // principio, vacías, y llenarse; no aparecer.
  await page.addInitScript(() => localStorage.setItem('jwt_token', 'prueba-e2e'));
  await page.goto('/admin/dashboard/projects/new');

  await expect(page.locator('.nodo')).toHaveCount(12);
  await expect(page.locator('.nodo[data-estado="espera"]')).toHaveCount(12);
  await expect(page.locator('.ventana')).toBeVisible();
  await expect(page.locator('.banner__titulo .hueco')).toBeVisible();
});

test('el diagrama enciende todas las burbujas que el backend cuenta', async ({ page }) => {
  await simularStream(page, FLUJO_COMPLETO);
  await prepararRedaccion(page);

  await expect(page.locator('.nodo')).toHaveCount(12);
  await expect(page.locator('.nodo[data-estado="hecho"]')).toHaveCount(12);
});

test('cada paso cuenta lo que dijo el backend al pasar por él', async ({ page }) => {
  await simularStream(page, FLUJO_COMPLETO);
  await prepararRedaccion(page);

  // El dato que sólo se conoce en ese momento: qué modelo respondió y cuánto
  // tardó. Antes había que pulsar la burbuja para verlo; ahora va en su fila.
  await expect(nodo(page, 'Modelo')).toContainText('openai/gpt-oss-120b');
  await expect(nodo(page, 'Cotas')).toContainText('12 campos');
});

test('la ficha de la vista previa enseña lo que se redactó', async ({ page }) => {
  await simularStream(page, FLUJO_COMPLETO);
  await prepararRedaccion(page);

  await expect(page.locator('.banner__titulo')).toHaveText('Tsuki Translator');
  await expect(page.locator('.ventana')).toContainText('Aislar el motor');
  await expect(page.locator('.ventana')).toContainText('Sincronía de tiempos');
});

test('la ficha se llena con lo que ha llegado, aunque el JSON esté a medias', async ({ page }) => {
  // Es lo que llena los ocho segundos: el campo aparece según se escribe, no
  // al final. Aquí el flujo se corta a mitad de la descripción corta.
  await simularStream(page, [
    { etapa: 'entrada', detalle: 'Readme de 1200 caracteres' },
    { etapa: 'modelo', detalle: 'Consultando openai/gpt-oss-120b' },
    { etapa: 'texto', detalle: '{"name":"Tsuki Translator","shortDescription":"Traductor de sub' }
  ]);
  await prepararRedaccion(page);

  await expect(page.locator('.banner__titulo')).toHaveText('Tsuki Translator');
  await expect(page.locator('.banner__frase')).toHaveText('Traductor de sub');
});

test('un campo se da por escrito al cerrarse, no por el orden', async ({ page }) => {
  // Antes se suponía que el modelo escribe los campos en el orden pedido. Si
  // empezara por las descripciones, el nombre quedaba encendido sin haberse
  // escrito. Ahora cada burbuja mira la comilla de cierre de su campo.
  await simularStream(page, [
    { etapa: 'entrada', detalle: 'Readme de 1200 caracteres' },
    { etapa: 'modelo', detalle: 'Consultando openai/gpt-oss-120b' },
    { etapa: 'texto', detalle: '{"shortDescription":"A","fullDescription":"B","name":"Tsu' }
  ]);
  await prepararRedaccion(page);

  await expect(nodo(page, 'Descripciones')).toHaveAttribute('data-estado', 'hecho');
  await expect(nodo(page, 'Nombre')).not.toHaveAttribute('data-estado', 'hecho');
});

test('un flujo que se acaba sin terminar no se queda escribiendo', async ({ page }) => {
  // Sin 'fin' ni 'error', la vista se quedaba en "escribiendo" para siempre:
  // indistinguible de un cuelgue.
  await simularStream(page, [
    { etapa: 'entrada', detalle: 'Readme de 1200 caracteres' },
    { etapa: 'modelo', detalle: 'Consultando openai/gpt-oss-120b' },
    { etapa: 'texto', detalle: '{"name":"Tsu' }
  ]);
  await prepararRedaccion(page);

  await expect(page.locator('.acciones[data-modo="fallo"]')).toContainText('se cerró antes de terminar');
  await expect(page.locator('.nodo[data-estado="fallo"]')).toHaveCount(1);
});

test('la respuesta en crudo se acumula según llega', async ({ page }) => {
  await simularStream(page, FLUJO_COMPLETO);
  await prepararRedaccion(page);

  await page.getByRole('button', { name: /Respuesta en crudo/ }).click();
  await expect(page.locator('.salida__cuerpo')).toHaveText('{"name":"Tsuki Translator"');
});

test('el borrador no entra solo en el formulario', async ({ page }) => {
  await simularStream(page, FLUJO_COMPLETO);
  await prepararRedaccion(page);

  await expect(page.locator('.acciones[data-modo="lista"]')).toBeVisible();
  // Lo que de verdad se protege: el formulario sigue como estaba.
  await expect(page.locator('#name')).toHaveValue('');
  await expect(page.locator('#shortDescription')).toHaveValue('');
});

test('al terminar, el foco va a aceptar y no se queda en redactar', async ({ page }) => {
  // El botón de redactar se quedaba con el foco, y pulsar Enter o Espacio
  // después volvía a lanzar la redacción: otra llamada de pago.
  await simularStream(page, FLUJO_COMPLETO);
  await prepararRedaccion(page);

  await expect(page.getByRole('button', { name: 'Aceptar y completar la ficha' })).toBeFocused();
});

test('al aceptarla se rellenan los campos y se pasa a completar la ficha', async ({ page }) => {
  await simularStream(page, FLUJO_COMPLETO);
  await prepararRedaccion(page);

  await page.getByRole('button', { name: 'Aceptar y completar la ficha' }).click();

  await expect(page.getByRole('tab', { name: /Completar la ficha/ })).toHaveAttribute('aria-selected', 'true');
  // El nombre lo pone el borrador: ya no hay que escribirlo antes de empezar.
  await expect(page.locator('#name')).toHaveValue('Tsuki Translator');
  await expect(page.locator('#rmLearnings')).toHaveValue(/Aislar el motor/);
  await expect(page.locator('.challenge')).toHaveCount(2);
});

test('los campos que escribio la IA quedan marcados hasta que los tocas', async ({ page }) => {
  await simularStream(page, FLUJO_COMPLETO);
  await prepararRedaccion(page);
  await page.getByRole('button', { name: 'Aceptar y completar la ficha' }).click();

  // Una cuenta exacta y no un "más de cero": count() no reintenta, así que
  // preguntar a pelo justo después de aplicar llegaba a veces antes de que el
  // formulario se repintara. toHaveCount sí espera.
  // Ocho campos de prosa mas el titulo de cada uno de los dos desafios.
  const marcas = page.locator('#panel-completar label .marca-ia');
  await expect(marcas).toHaveCount(10);

  await page.locator('#name').fill('Otro nombre');
  await expect(marcas).toHaveCount(9);
});

test('descartar deja el formulario intacto y la vista como al principio', async ({ page }) => {
  await simularStream(page, FLUJO_COMPLETO);
  await prepararRedaccion(page);

  await page.getByRole('button', { name: 'Descartar' }).click();

  await expect(page.locator('.acciones[data-modo="vacia"]')).toBeVisible();
  await expect(page.locator('.nodo[data-estado="espera"]')).toHaveCount(12);
  await expect(page.locator('#name')).toHaveValue('');
});

test('si el borrador no pasa las cotas, se ve el segundo intento y sale el bueno', async ({ page }) => {
  // Lo que paso de verdad: el modelo devolvio los desafios vacios y todo el
  // borrador se tiraba. Ahora el backend lo pide otra vez diciendole por que,
  // y el panel lo cuenta en vez de mezclar los dos textos.
  await simularStream(page, [
    { etapa: 'entrada', detalle: 'Readme de 1200 caracteres' },
    { etapa: 'modelo', detalle: 'Consultando openai/gpt-oss-120b' },
    { etapa: 'texto', detalle: '{"name":"Primer intento","challenges":[]}' },
    { etapa: 'respuesta', detalle: 'respondio' },
    { etapa: 'parseo', detalle: 'El JSON tiene la forma esperada' },
    { etapa: 'reintento', detalle: 'Se esperaban entre 2 y 6 challenges y llegaron 0.' },
    { etapa: 'modelo', detalle: 'Consultando openai/gpt-oss-120b' },
    { etapa: 'texto', detalle: '{"name":"Tsuki Translator"' },
    { etapa: 'respuesta', detalle: 'respondio' },
    { etapa: 'parseo', detalle: 'El JSON tiene la forma esperada' },
    { etapa: 'validacion', detalle: 'Los 12 campos caben dentro de las cotas' },
    { etapa: 'fin', borrador: BORRADOR }
  ]);
  await prepararRedaccion(page);

  await expect(page.locator('.acciones[data-modo="lista"]')).toBeVisible();
  await expect(nodo(page, 'Modelo')).toContainText('Segundo intento');
  await expect(page.locator('.banner__titulo')).toHaveText('Tsuki Translator');
});

test('la espera del servidor tiene su estacion y no cae en la del readme', async ({ page }) => {
  // El readme marco 137 segundos: era Render despertando. El primer aviso del
  // backend cierra las dos a la vez, y el tiempo se lo queda el servidor.
  await simularStream(page, FLUJO_COMPLETO);
  await prepararRedaccion(page);

  await expect(nodo(page, 'Servidor')).toHaveAttribute('data-estado', 'hecho');
  await expect(nodo(page, 'Readme')).toHaveAttribute('data-estado', 'hecho');
  // Sin tiempo en su estado: leer el readme no tarda nada que medir.
  await expect(nodo(page, 'Readme').locator('.estado')).toHaveText('Listo');
});

test('solo una burbuja se lleva el fallo, aunque hubiera dos trabajando', async ({ page }) => {
  // Mientras el modelo escribe hay dos en curso a la vez: la del modelo y la
  // del campo que está saliendo. Marcando todas, un corte a media escritura
  // pintaba dos en rojo diciendo cada una "aquí es donde se cortó", que es la
  // contradicción que la declaración de estados existe para impedir.
  await simularStream(page, [
    { etapa: 'entrada', detalle: 'Readme de 1200 caracteres' },
    { etapa: 'modelo', detalle: 'Consultando openai/gpt-oss-120b' },
    { etapa: 'texto', detalle: '{"name":"A medias' },
    { etapa: 'error', tipo: 'nodisponible', detalle: 'Se corto la conexion' }
  ]);
  await prepararRedaccion(page);

  await expect(page.locator('.nodo[data-estado="fallo"]')).toHaveCount(1);
  // Y es la del modelo, que es donde se rompio: la del nombre solo reflejaba
  // lo que iba escribiendose.
  await expect(nodo(page, 'Modelo')).toHaveAttribute('data-estado', 'fallo');
  await expect(nodo(page, 'Nombre')).toHaveAttribute('data-estado', 'no-alcanzado');
});

test('un fallo a mitad se ve donde paro, aunque el estado HTTP sea 200', async ({ page }) => {
  // Para cuando algo falla ya se mandaron los 200 y las cabeceras, así que el
  // motivo viaja como una línea más. Si la interfaz mirase el estado, vería un
  // éxito donde no lo hubo.
  await simularStream(page, [
    { etapa: 'entrada', detalle: 'Readme de 1200 caracteres' },
    { etapa: 'modelo', detalle: 'Consultando openai/gpt-oss-120b' },
    { etapa: 'error', tipo: 'nodisponible', detalle: 'Groq no responde' }
  ]);
  await prepararRedaccion(page);

  await expect(page.locator('.nodo[data-estado="fallo"]')).toHaveCount(1);
  await expect(page.locator('.nodo[data-estado="fallo"]')).toContainText('Groq no responde');

  // Lo que venía detrás queda como "no se llegó", que no es lo mismo que "sin
  // empezar": uno todavía podía ocurrir y el otro ya no. Sin esa diferencia,
  // un diagrama parado se lee igual que uno que no ha arrancado.
  await expect(page.locator('.nodo[data-estado="no-alcanzado"]')).not.toHaveCount(0);
  await expect(page.locator('.nodo[data-estado="espera"]')).toHaveCount(0);
  await expect(page.locator('.acciones[data-modo="fallo"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Aceptar y completar la ficha' })).toHaveCount(0);
});

test('las listas y la arquitectura del readme entran en el formulario; las vacias no borran nada', async ({ page }) => {
  // Lo que se pidio: que el modelo llene tambien listas y arquitectura, pero
  // solo con lo que dice el readme. Este no nombra IA: aiArchitecture llega
  // vacio, y eso no puede pisar lo que ya hubiera en el campo.
  const conListas = {
    ...BORRADOR,
    features: ['Traduccion por lotes', 'Exportacion a SRT'],
    highlights: ['Motor aislado detras de un puerto'],
    keywords: ['subtitulos', 'Python', 'PyQt'],
    coreArchitecture: 'Hexagonal',
    databaseArchitecture: '',
    aiArchitecture: ''
  };
  await simularStream(page, [...FLUJO_COMPLETO.slice(0, -1), { etapa: 'fin', borrador: conListas }]);
  await prepararRedaccion(page);

  await expect(nodo(page, 'Listas')).toHaveAttribute('data-estado', 'hecho');
  await expect(nodo(page, 'Arquitectura')).toHaveAttribute('data-estado', 'hecho');
  await expect(page.locator('app-vista-ficha .etiqueta')).toHaveCount(3);

  await page.getByRole('button', { name: 'Aceptar y completar la ficha' }).click();

  await expect(page.locator('#featuresText')).toHaveValue('Traduccion por lotes\nExportacion a SRT');
  await expect(page.locator('#highlightsText')).toHaveValue('Motor aislado detras de un puerto');
  await expect(page.locator('#keywordsText')).toHaveValue('subtitulos\nPython\nPyQt');
  await expect(page.locator('#coreArchitecture')).toHaveValue('Hexagonal');
  await expect(page.locator('#aiArchitecture')).toHaveValue('');
  await expect(page.locator('label[for="coreArchitecture"] .marca-ia')).toHaveCount(1);
  await expect(page.locator('label[for="aiArchitecture"] .marca-ia')).toHaveCount(0);
});

test('el diagrama propuesto se ve en la vista previa y entra en la ficha, y se puede descartar', async ({ page }) => {
  // El modelo propone las piezas; las coordenadas las pone el backend. Aqui
  // llegan ya colocadas, como las manda la linea `fin`.
  const conDiagrama = {
    ...BORRADOR,
    links: { github: 'https://github.com/1Zamuken1/tsuki-translator' },
    architectureNodes: [
      { id: 'ui', label: 'PyQt UI', group: 'client', type: 'primary', icon: 'pi pi-desktop', x: 80, y: 80, width: 250, height: 96 },
      { id: 'core', label: 'Dominio', group: 'application', type: 'primary', icon: 'pi pi-cog', x: 460, y: 80, width: 250, height: 96 },
      { id: 'motor', label: 'Motor local', group: 'external', type: 'secondary', icon: 'pi pi-sparkles', x: 840, y: 80, width: 250, height: 96 }
    ],
    architectureEdges: [
      { from: 'ui', to: 'core', fromPort: 'right', toPort: 'left', routeType: 'orthogonal' },
      { from: 'core', to: 'motor', fromPort: 'right', toPort: 'left', routeType: 'orthogonal' }
    ],
    architectureLayout: { orientation: 'freeform', canvas: { width: 1200, height: 280, gridSize: 40, showGrid: true } }
  };
  await simularStream(page, [...FLUJO_COMPLETO.slice(0, -1), { etapa: 'fin', borrador: conDiagrama }]);
  await prepararRedaccion(page);

  await expect(nodo(page, 'Diagrama')).toHaveAttribute('data-estado', 'hecho');
  await expect(page.locator('app-vista-ficha app-blueprint-viewer')).toBeVisible();
  await expect(page.locator('app-vista-ficha .banner__repo')).toContainText('github.com/1Zamuken1/tsuki-translator');

  await page.getByRole('button', { name: 'Aceptar y completar la ficha' }).click();

  await expect(page.locator('#linkGithub')).toHaveValue('https://github.com/1Zamuken1/tsuki-translator');
  const bloque = page.locator('.diagrama-form');
  await expect(bloque.locator('app-blueprint-viewer')).toBeVisible();
  await expect(bloque.locator('.marca-ia')).toHaveCount(1);

  await bloque.getByRole('button', { name: 'Descartar el propuesto' }).click();
  await expect(bloque.locator('app-blueprint-viewer')).toHaveCount(0);
  await expect(bloque).toContainText('Sin diagrama');
});

test('mientras se escribe, las piezas del diagrama llegan como etiquetas', async ({ page }) => {
  await simularStream(page, [
    ...FLUJO_COMPLETO.slice(0, 2),
    { etapa: 'texto', detalle: '{"name":"Tsuki","architectureNodes":[{"id":"ui","label":"PyQt UI","group":"client"},' },
    { etapa: 'texto', detalle: '{"id":"core","label":"Dominio","group":"application"}' }
  ]);
  await prepararRedaccion(page);
  await expect(page.locator('app-vista-ficha .etiqueta--pieza')).toHaveText(['PyQt UI', 'Dominio']);
});
