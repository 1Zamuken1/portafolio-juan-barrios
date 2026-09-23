import { test, expect } from '@playwright/test';

/**
 * Los controles de PrimeNG del panel, tal como estan configurados aqui.
 *
 * No se prueba PrimeNG, que ya tiene sus pruebas, sino lo que depende de como
 * se usa en este panel: que el desplegable se maneje con el teclado, que el
 * numero no acepte letras ni se salga de sus limites, que un area crezca con
 * su texto en vez de cortarlo --eso es CSS y una directiva propia, no
 * PrimeNG-- y que el dialogo de borrar tenga el foco en Cancelar.
 */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('jwt_token', 'prueba-e2e'));
});

async function abrirFicha(page: import('@playwright/test').Page) {
  await page.goto('/admin/dashboard/projects/new');
  await page.getByRole('button', { name: 'Seguir sin IA' }).click();
  // El paso 2 estaba oculto: hasta que no se ve, un focus() no llega a
  // ningun sitio y las teclas se pierden. Era lo que hacia intermitente la
  // prueba del desplegable.
  await expect(page.locator('#panel-completar')).toBeVisible();
}

test('el desplegable se maneja entero con el teclado', async ({ page }) => {
  await abrirFicha(page);
  const estado = page.locator('#status');

  await estado.focus();
  await expect(estado).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(estado).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('option')).toHaveCount(5);

  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(estado).toHaveAttribute('aria-expanded', 'false');
  await expect(estado).toContainText('Active Development');
  // Y el foco vuelve al desplegable, no se pierde por la pagina.
  await expect(estado).toBeFocused();

  await page.keyboard.press('Enter');
  // A la lista visible, no solo a aria-expanded: PrimeNG lo pone al empezar a
  // abrir, y un Escape a mitad de la animacion se pierde.
  await expect(page.getByRole('listbox')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(estado).toHaveAttribute('aria-expanded', 'false');
  await expect(estado).toContainText('Active Development');
});

test('el numero no acepta letras y se ajusta a sus limites al salir', async ({ page }) => {
  await abrirFicha(page);
  const anio = page.locator('#year');

  // Tecla a tecla y no con fill(): p-inputnumber escucha el teclado, y un
  // valor puesto de golpe lo deshace al volver a formatear.
  await anio.click();
  await anio.press('Control+a');
  await anio.press('Backspace');
  await anio.pressSequentially('20a2x6');
  await expect(anio).toHaveValue('2026');

  // Mientras se escribe se pasa por valores fuera de rango ("2" de "2026"),
  // asi que el ajuste es al salir, no antes.
  await anio.press('Control+a');
  await anio.press('Backspace');
  await anio.pressSequentially('1999');
  await anio.blur();
  await expect(anio).toHaveValue('2000');

  await anio.focus();
  await expect(anio).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(anio).toHaveValue('2001');
});

test('un area crece con su texto en vez de cortarlo', async ({ page }) => {
  // Lo que se reporto: los textos del caso de estudio se leian cortados por
  // la mitad, con una barra de desplazamiento dentro de la caja.
  await abrirFicha(page);
  const area = page.locator('#rmObjective');

  const antes = (await area.boundingBox())!.height;
  await area.fill('Una linea bastante larga para ocupar el ancho del campo entero. '.repeat(8));
  const despues = (await area.boundingBox())!.height;

  expect(despues).toBeGreaterThan(antes + 40);
  // Todo el texto a la vista: nada queda escondido dentro de la caja.
  const oculto = await area.evaluate((el) => el.scrollHeight - el.clientHeight);
  expect(oculto).toBeLessThanOrEqual(2);
});

test('el dialogo de borrar no borra si se cancela', async ({ page }) => {
  const borrados: string[] = [];
  await page.route('**/api/projects', (r) => r.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify([{ id: 7, name: 'Gastu', shortDescription: 'Finanzas', status: 'Draft', year: 2025, displayOrder: 1 }])
  }));
  await page.route('**/api/projects/7', (r) => {
    if (r.request().method() === 'DELETE') borrados.push(r.request().url());
    return r.fulfill({ status: 204 });
  });

  await page.goto('/admin/dashboard/projects');
  await page.getByRole('button', { name: 'Eliminar Gastu' }).click();

  // Por su nombre: PrimeNG pone role="alertdialog" en el anfitrion y en la
  // caja, y el que importa es el que tiene titulo.
  const dialogo = page.getByRole('alertdialog', { name: /Eliminar/ });
  await expect(dialogo).toBeVisible();
  // El foco va a Cancelar: un Enter por inercia no borra nada.
  await expect(dialogo.getByRole('button', { name: 'Cancelar' })).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(dialogo).toHaveCount(0);
  // El velo se va con una animacion; hasta que no se ha ido, tapa la lista.
  await expect(page.locator('.p-dialog-mask')).toHaveCount(0);

  await page.getByRole('button', { name: 'Eliminar Gastu' }).click();
  await expect(dialogo.getByRole('button', { name: 'Cancelar' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialogo).toHaveCount(0);
  await expect(page.locator('.p-dialog-mask')).toHaveCount(0);
  expect(borrados).toHaveLength(0);

  await page.getByRole('button', { name: 'Eliminar Gastu' }).click();
  await dialogo.getByRole('button', { name: 'Eliminar' }).click();
  await expect.poll(() => borrados.length).toBe(1);
});
