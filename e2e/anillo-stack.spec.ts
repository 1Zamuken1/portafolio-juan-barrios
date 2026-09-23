import { test, expect } from '@playwright/test';

/**
 * El stack se puede ver como lista o como anillo.
 *
 * Lo que se comprueba aquí no es que el anillo gire —eso es decoración— sino
 * que la lista siga siendo lo principal: es la que se prerenderiza, la que lee
 * un buscador y la única de las dos que se puede recorrer con el teclado o con
 * un lector de pantalla. Un anillo que se arrastra con el ratón no sirve para
 * nada de eso, así que no puede acabar siendo el estado por defecto sin que
 * algo avise.
 */
test.describe('stack: lista y anillo', () => {

  test('se entra en lista, no en anillo', async ({ page }) => {
    await page.goto('/about/stack');

    await expect(page.locator('.stack-grid').first()).toBeVisible();
    await expect(page.locator('app-anillo-stack')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Lista' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('el anillo se pide, y al volver esta la lista', async ({ page }) => {
    await page.goto('/about/stack');

    await page.getByRole('button', { name: 'Anillo' }).click();
    await expect(page.locator('app-anillo-stack')).toBeVisible();
    await expect(page.locator('.stack-grid')).toHaveCount(0);

    await page.getByRole('button', { name: 'Lista' }).click();
    await expect(page.locator('.stack-grid').first()).toBeVisible();
  });

  test('el anillo pinta las mismas tecnologias que la lista', async ({ page }) => {
    // Si cada vista fuera a buscar los datos por su cuenta podrían acabar
    // enseñando cosas distintas. Por eso el anillo las recibe ya cargadas.
    await page.goto('/about/stack');
    const enLista = await page.locator('.stack-card').count();
    expect(enLista).toBeGreaterThan(0);

    await page.getByRole('button', { name: 'Anillo' }).click();
    await expect(page.locator('app-anillo-stack .planeta')).toHaveCount(enLista);
  });

  test('el html servido trae la lista, que es lo que lee un buscador', async ({ request }) => {
    // El anillo se monta en el navegador; si fuera el estado inicial, lo
    // prerenderizado quedaria sin ninguna tecnologia dentro.
    const html = await (await request.get('/about/stack')).text();
    expect(html).toContain('stack-card');
  });
});
