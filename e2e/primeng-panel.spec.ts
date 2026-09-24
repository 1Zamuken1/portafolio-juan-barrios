import { test, expect } from '@playwright/test';

/**
 * PrimeNG es del panel y solo del panel.
 *
 * Se paso de app.config a las rutas de /admin para que el portafolio no
 * cargara su tema (104 kB del preset de Aura en main.js). En el primer intento
 * el tema dejo de aplicarse en el panel sin ningun error: providePrimeNG()
 * registra la configuracion con un inicializador de aplicacion, que en el
 * inyector de una ruta no se ejecuta. Toda la suite siguio en verde, porque
 * ninguna prueba miraba colores. Estas dos miran justo eso.
 */

test('en el panel, el tema de PrimeNG esta aplicado', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('jwt_token', 'prueba-e2e'));
  await page.goto('/admin/dashboard/projects/new');
  await expect(page.getByRole('button', { name: 'Seguir sin IA' })).toBeVisible();

  const primario = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--p-primary-color').trim());
  expect(primario, 'el preset del panel no se ha cargado').not.toBe('');
});

test('en el portafolio, PrimeNG no se carga', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.md-h1').first()).toBeVisible();

  const estilos = await page.locator('style[data-primeng-style-id]').count();
  expect(estilos, 'el tema de PrimeNG se esta cargando en la parte publica').toBe(0);
});
