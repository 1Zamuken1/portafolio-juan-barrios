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

  await page.locator('.dashboard-content').evaluate((e) => { e.scrollTop = 1200; });
  const barra = await page.locator('.barra-guardado').boundingBox();

  expect(barra!.y).toBeLessThan(900);
  expect(barra!.y + barra!.height).toBeGreaterThan(0);
});

test('en un proyecto nuevo se entra por el redactor', async ({ page }) => {
  // El formulario son treinta campos en blanco y casi todos los de prosa salen
  // del borrador: empezar por ahí es empezar por donde hay trabajo hecho.
  await page.goto('/admin/dashboard/projects/new');
  await expect(page.locator('#readmeFuente')).toBeVisible();
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
