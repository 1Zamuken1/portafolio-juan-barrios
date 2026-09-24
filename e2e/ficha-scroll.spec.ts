import { test, expect, Page } from '@playwright/test';

/**
 * El scroll y la URL de la ficha, en el navegador.
 *
 * coordinador-scroll.spec prueba la regla (quien puede escribir la URL y
 * cuando) sin DOM. Esto prueba que el componente la cumple de verdad, con
 * GSAP, el router y un scroll suave de por medio: es donde vivian los
 * temporizadores que suponian cuanto tardaba cada cosa.
 */

const scroller = (page: Page) => page.locator('.project-scroller');
const fragmento = (page: Page) => page.evaluate(() => location.hash);

test('al abrir una ficha no se escribe ningun fragmento solo', async ({ page }) => {
  // Al montar, GSAP dispara el onEnter de las secciones que ya estan a la
  // vista. Si la coordinacion se soltara antes, la URL ganaria un #readme sin
  // que nadie hubiera hecho nada.
  await page.goto('/projects/1');
  await expect(scroller(page)).toBeVisible();
  await page.waitForTimeout(1200);
  expect(await fragmento(page)).toBe('');
});

test('un enlace a una seccion lleva hasta ella y la URL no se mueve de ahi', async ({ page }) => {
  // Lo que rompia la realimentacion: el scroll suave pasa por secciones
  // intermedias, cada una reescribia el fragmento y la vista acababa en otra.
  await page.goto('/projects/1#features');
  const features = page.locator('#features');
  await expect(features).toBeInViewport();
  await page.waitForTimeout(1200);
  expect(await fragmento(page)).toBe('#features');
  await expect(features).toBeInViewport();
});

test('el scroll a mano si escribe la seccion en la URL', async ({ page }) => {
  await page.goto('/projects/1');
  await expect(scroller(page)).toBeVisible();
  await page.waitForTimeout(800);

  // Hasta la seccion de metricas, como lo haria alguien con la rueda.
  await scroller(page).evaluate((el) => {
    const destino = document.getElementById('metrics')!;
    el.scrollTo({ top: destino.offsetTop, behavior: 'instant' as ScrollBehavior });
  });
  await expect.poll(() => fragmento(page), { timeout: 5000 }).toBe('#metrics');
});

test('llegar por un enlace a una seccion no deja la URL bloqueada', async ({ page }) => {
  // El router ya lleva la vista a la seccion (anchorScrolling), asi que el
  // desplazamiento del componente no mueve nada y el navegador no manda
  // scrollend. La coordinacion se quedaba abierta hasta la red de 2 s, y el
  // scroll a mano de ese rato se perdia: su onEnter no se repite.
  await page.goto('/projects/1#features');
  await expect(page.locator('#features')).toBeInViewport();
  await page.waitForTimeout(300);

  await scroller(page).evaluate((el) => {
    const destino = document.getElementById('metrics')!;
    el.scrollTo({ top: destino.offsetTop, behavior: 'instant' as ScrollBehavior });
  });
  await expect.poll(() => fragmento(page), { timeout: 1500 }).toBe('#metrics');
});
