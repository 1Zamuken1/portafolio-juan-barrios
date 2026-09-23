import { test, expect } from '@playwright/test';

/**
 * El armazón del panel.
 *
 * La barra lateral llegó a verse distinta en cada vista: era un hijo de un flex
 * que se estiraba con el alto del documento, y la ficha de un proyecto mide
 * varios miles de píxeles, así que el aviso de publicar y el botón de salir se
 * iban al fondo de ese documento.
 *
 * El primer intento de arreglarlo —`position: sticky`— no funcionó, y no por un
 * descuido: `body` lleva `overflow-x: hidden`, eso le fuerza un `overflow-y`
 * computado y lo convierte en contenedor de desplazamiento, con lo que sticky
 * se queda sin nada contra qué pegarse. Estas pruebas sujetan el arreglo real
 * —el panel es su propio contenedor de scroll— porque la causa no se ve
 * mirando el CSS del panel.
 *
 * El guard sólo mira que haya token, así que estas vistas se pueden abrir sin
 * backend. Ninguna de ellas pide datos al arrancar.
 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('jwt_token', 'prueba-e2e'));
});

test('la barra lateral no se mueve al recorrer una ficha larga', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/admin/dashboard/projects/new');

  const pie = page.locator('.sidebar-footer');
  const antes = await pie.boundingBox();

  await page.locator('.dashboard-content').evaluate((e) => { e.scrollTop = 3000; });
  const despues = await pie.boundingBox();

  expect(despues!.y).toBeCloseTo(antes!.y, 0);
});

test('el pie de la barra cabe en la pantalla, no al final del documento', async ({ page }) => {
  // Es el sintoma concreto que se reportó: en la lista se veía y en la ficha
  // no, porque el documento medía tres mil píxeles.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/admin/dashboard/projects/new');

  const pie = await page.locator('.sidebar-footer').boundingBox();
  expect(pie!.y + pie!.height).toBeLessThanOrEqual(900);
});

test('la barra de guardado se queda a la vista', async ({ page }) => {
  // Vive de lo mismo: es sticky dentro del area de contenido, y sólo funciona
  // porque ese area es ahora un contenedor de desplazamiento real.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/admin/dashboard/projects/new');
  // La barra vive en el segundo paso: en el primero no hay nada que guardar.
  await page.getByRole('tab', { name: /Completar la ficha/ }).click();

  await page.locator('.dashboard-content').evaluate((e) => { e.scrollTop = 1200; });
  const barra = await page.locator('.barra-guardado').boundingBox();

  expect(barra!.y).toBeLessThan(900);
  expect(barra!.y + barra!.height).toBeGreaterThan(0);
});

test('en un proyecto nuevo se entra por el redactor', async ({ page }) => {
  // El formulario son treinta campos en blanco y casi todos los de prosa salen
  // del borrador: empezar por ahí es empezar por donde hay trabajo hecho.
  await page.goto('/admin/dashboard/projects/new');
  await expect(page.getByRole('tab', { name: /Redactar con IA/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#readmeFuente')).toBeVisible();
  await expect(page.locator('#name')).toBeHidden();
});

test('se puede ir al formulario sin redactar, y volver', async ({ page }) => {
  // La IA es la entrada, no un peaje: un proyecto sin readme tiene que poder
  // escribirse a mano.
  await page.goto('/admin/dashboard/projects/new');
  await page.getByRole('button', { name: 'Seguir sin IA' }).click();
  await expect(page.locator('#name')).toBeVisible();

  await page.locator('#name').fill('Escrito a mano');
  await page.getByRole('tab', { name: /Redactar con IA/ }).click();
  await page.getByRole('tab', { name: /Completar la ficha/ }).click();
  // Ocultar un paso no lo reinicia.
  await expect(page.locator('#name')).toHaveValue('Escrito a mano');
});

test('redactar ya no exige escribir antes el nombre', async ({ page }) => {
  // Era un paso manual puesto delante del automático para pedir un dato que
  // casi siempre está en el readme. Con el nombre vacío y un readme corto, la
  // queja que sale tiene que ser la del readme.
  await page.goto('/admin/dashboard/projects/new');
  await expect(page.locator('#name')).toHaveValue('');

  await page.locator('#readmeFuente').fill('# Corto');
  await page.getByRole('button', { name: 'Redactar borrador' }).click();

  const aviso = page.locator('.p-toast-detail');
  await expect(aviso).toContainText('readme');
  await expect(aviso).not.toContainText('nombre');
});

test('el panel tiene su propio interruptor de tema, y se recuerda', async ({ page }) => {
  // El del sitio vive en la barra de actividad del layout tipo editor, que el
  // panel no tiene: sin este, en el panel no habia forma de cambiarlo.
  await page.goto('/admin/dashboard/projects/new');
  // Es un p-selectbutton: cada opcion es un boton que dice si esta pulsado.
  const claro = page.locator('.tema').getByRole('button', { name: /Claro/ });
  await claro.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(claro).toHaveAttribute('aria-pressed', 'true');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('el indice de la ficha cuenta lo que se va rellenando', async ({ page }) => {
  await page.goto('/admin/dashboard/projects/new');
  await page.getByRole('button', { name: 'Seguir sin IA' }).click();

  const cuenta = page.locator('#seccion-descripciones .seccion__cuenta');
  await expect(cuenta).toHaveText('0/2');

  await page.locator('#shortDescription').fill('Una frase para la tarjeta.');
  await expect(cuenta).toHaveText('1/2');
  // Y la tarjeta la ensenia tal como saldra en la lista.
  await expect(page.locator('.tarjeta__frase')).toHaveText('Una frase para la tarjeta.');
});
