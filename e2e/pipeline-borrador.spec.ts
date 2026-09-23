import { test, expect } from '@playwright/test';

/**
 * La pipeline del redactor, con el backend simulado.
 *
 * El endpoint responde NDJSON: un objeto por línea, que el panel va leyendo
 * mientras llega. Aquí se sirve entero de golpe —Playwright no trocea la
 * respuesta— pero el cliente lo parte por líneas igual, así que lo que se
 * comprueba es lo que importa: que cada línea mueve su paso, que el texto se
 * acumula, y sobre todo que el borrador NO entra solo en el formulario.
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

test('el diagrama enciende todas las burbujas que el backend cuenta', async ({ page }) => {
  await simularStream(page, FLUJO_COMPLETO);
  await prepararRedaccion(page);

  // Las ocho se dibujan desde el principio, también las que no han ocurrido:
  // un diagrama que crece no distingue "va por la tercera" de "se quedó en la
  // tercera".
  await expect(page.locator('.nodo')).toHaveCount(8);
  await expect(page.locator('.nodo[data-estado="hecho"]')).toHaveCount(8);
});

test('el panel lateral cuenta lo de la burbuja que se elige', async ({ page }) => {
  await simularStream(page, FLUJO_COMPLETO);
  await prepararRedaccion(page);

  // El dato que sólo se conoce en ese momento: qué modelo respondió y cuánto
  // tardó. Es la razón de que el panel exista.
  await page.locator('.nodo[aria-label^="Modelo"]').click();
  await expect(page.locator('.detalle')).toContainText('openai/gpt-oss-120b');

  // Y las burbujas de salida llevan el texto que de verdad se redactó.
  await page.locator('.nodo[aria-label^="Nombre"]').click();
  await expect(page.locator('.detalle__contenido')).toHaveText('Tsuki Translator');
});

test('el texto del modelo se acumula segun llega', async ({ page }) => {
  await simularStream(page, FLUJO_COMPLETO);
  await prepararRedaccion(page);

  await expect(page.locator('.salida__cuerpo')).toHaveText('{"name":"Tsuki Translator"');
});

test('el borrador no entra solo en el formulario', async ({ page }) => {
  await simularStream(page, FLUJO_COMPLETO);
  await prepararRedaccion(page);

  await expect(page.locator('.propuesta')).toBeVisible();
  // Lo que de verdad se protege: el formulario sigue como estaba.
  await expect(page.locator('#name')).toHaveValue('');
  await expect(page.locator('#shortDescription')).toHaveValue('');
});

test('al aceptarla se rellenan los campos, el nombre incluido', async ({ page }) => {
  await simularStream(page, FLUJO_COMPLETO);
  await prepararRedaccion(page);

  await page.getByRole('button', { name: 'Aplicar al formulario' }).click();

  // El nombre lo pone el borrador: ya no hay que escribirlo antes de empezar.
  await expect(page.locator('#name')).toHaveValue('Tsuki Translator');
  await expect(page.locator('#rmLearnings')).toHaveValue(/Aislar el motor/);
  await expect(page.locator('.challenge')).toHaveCount(2);
});

test('los campos que escribio la IA quedan marcados hasta que los tocas', async ({ page }) => {
  await simularStream(page, FLUJO_COMPLETO);
  await prepararRedaccion(page);
  await page.getByRole('button', { name: 'Aplicar al formulario' }).click();

  const marcas = page.locator('.marca-ia');
  const antes = await marcas.count();
  expect(antes).toBeGreaterThan(0);

  await page.locator('#name').fill('Otro nombre');
  await expect(marcas).toHaveCount(antes - 1);
});

test('descartar deja el formulario intacto', async ({ page }) => {
  await simularStream(page, FLUJO_COMPLETO);
  await prepararRedaccion(page);

  await page.getByRole('button', { name: 'Descartar' }).click();

  await expect(page.locator('.propuesta')).toHaveCount(0);
  await expect(page.locator('#name')).toHaveValue('');
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
  await expect(page.locator('.detalle')).toContainText('Groq no responde');

  // Lo que venía detrás queda como "no se llegó", que no es lo mismo que "sin
  // empezar": uno todavía podía ocurrir y el otro ya no. Sin esa diferencia,
  // un diagrama parado se lee igual que uno que no ha arrancado.
  await expect(page.locator('.nodo[data-estado="no-alcanzado"]')).not.toHaveCount(0);
  await expect(page.locator('.nodo[data-estado="espera"]')).toHaveCount(0);
  await expect(page.locator('.propuesta')).toHaveCount(0);
});
