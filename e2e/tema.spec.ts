import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * El tema claro, que durante meses existió sin poder usarse.
 *
 * Las variables estaban definidas y el atributo `data-theme` se aplicaba, pero
 * el layout pintaba encima con colores escritos a mano: 52 en la portada, 58 en
 * el layout, 13 en about. Y `toggleTheme()` no tenía un solo uso en todo el
 * proyecto desde que se quitó el navbar, así que nadie llegaba a verlo.
 *
 * Dos riesgos distintos, dos tipos de test:
 *
 *   - Que alguien añada un token a un tema y lo olvide en el otro. Se comprueba
 *     leyendo el fichero, sin navegador.
 *   - Que el tema vuelva a quedarse sin interruptor, o que el interruptor deje
 *     de cambiar nada. Eso hay que verlo en el navegador.
 */
const RAIZ = join(__dirname, '..');

/** Los nombres de variable que declara un bloque de tema. */
function variablesDe(tema: 'light' | 'dark'): Set<string> {
  const css = readFileSync(join(RAIZ, 'src', 'app', 'styles', 'theme.css'), 'utf-8');
  const bloque = new RegExp(`\\[data-theme="${tema}"\\][^{]*\\{([^}]*)\\}`).exec(css);
  expect(bloque, `no se encontro el bloque del tema ${tema}`).not.toBeNull();
  return new Set([...bloque![1].matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
}

test.describe('tema', () => {

  test('los dos temas declaran exactamente las mismas variables', () => {
    // Una variable que solo exista en oscuro se queda sin valor en claro y el
    // navegador pinta el color heredado, que casi siempre es el equivocado.
    const claro = variablesDe('light');
    const oscuro = variablesDe('dark');

    const soloOscuro = [...oscuro].filter((v) => !claro.has(v));
    const soloClaro = [...claro].filter((v) => !oscuro.has(v));

    expect(soloOscuro, `faltan en el tema claro:\n  ${soloOscuro.join('\n  ')}`).toEqual([]);
    expect(soloClaro, `faltan en el tema oscuro:\n  ${soloClaro.join('\n  ')}`).toEqual([]);
    expect(claro.size).toBeGreaterThan(60);
  });

  test('el layout usa :host-context para alcanzar el atributo del tema', () => {
    // La encapsulacion de Angular le pega el atributo del componente a todos
    // los compuestos del selector, incluido el ancestro. Con
    // `[data-theme="light"] .algo` la regla nunca coincide, porque data-theme
    // vive en <html>, fuera del componente. No da error: simplemente no pinta.
    const css = readFileSync(
      join(RAIZ, 'src', 'app', 'layout', 'vscode-layout', 'vscode-layout.component.css'), 'utf-8');

    expect(css).toContain(':host-context([data-theme="light"])');
    expect(css, 'un selector de tema sin :host-context no llegara a aplicarse')
      .not.toMatch(/^\s*\[data-theme="light"\]\s+\./m);
  });

  test('el interruptor sigue en la barra de actividad', () => {
    const html = readFileSync(
      join(RAIZ, 'src', 'app', 'layout', 'vscode-layout', 'vscode-layout.component.html'), 'utf-8');

    expect(html, 'nadie llama a toggleTheme(): el tema volveria a ser inalcanzable')
      .toContain('toggleTheme()');
    // Un <button> y no un <div>: alcanzable con teclado y anunciado como control.
    expect(html).toMatch(/<button[^>]*class="icon-item"/);
    expect(html).toContain('aria-label');
  });

  test('el interruptor cambia el tema y lo recuerda', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('button.icon-item');

    const temaDe = () => page.evaluate(() => document.documentElement.dataset['theme']);
    const inicial = await temaDe();

    await page.click('button.icon-item');
    await page.waitForTimeout(300);
    expect(await temaDe(), 'pulsar el interruptor no cambio el tema').not.toBe(inicial);

    // Y sobrevive a una recarga, que es para lo que existe el localStorage.
    const cambiado = await temaDe();
    await page.reload();
    await page.waitForSelector('button.icon-item');
    expect(await temaDe(), 'el tema no se recordo tras recargar').toBe(cambiado);
  });

  test('en claro, ningun texto de la interfaz baja de AA', async ({ page }) => {
    // La version anterior de este test solo miraba el h1, y por eso se colo la
    // barra de estado a 3,57:1 --texto real, pequeno y por debajo de AA--.
    // Comprobar un solo elemento solo demuestra que ese elemento esta bien.
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('jeb-theme', 'light'));
    await page.reload();
    await page.waitForSelector('.md-h1');

    const flojos = await page.evaluate(() => {
      const lum = (rgb: string) => {
        const [r, g, b] = rgb.match(/[\d.]+/g)!.slice(0, 3)
          .map((v) => { const n = Number(v) / 255; return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4; });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      // Una capa translucida no establece el fondo: hay que seguir subiendo.
      // Tratarla como opaca daba 1,56:1 en los chips, que en realidad estan
      // bien; un falso positivo asi habria hecho ignorar el test entero.
      const opaco = (c: string) => {
        const m = c.match(/[\d.]+/g);
        return !!m && (m.length < 4 || Number(m[3]) >= 0.999);
      };
      const fondoDe = (el: Element) => {
        let e: Element | null = el;
        while (e) {
          const c = getComputedStyle(e).backgroundColor;
          if (c && opaco(c)) return c;
          e = e.parentElement;
        }
        return 'rgb(255, 255, 255)';
      };
      const ratio = (a: string, b: string) => {
        const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
        return (x + 0.05) / (y + 0.05);
      };

      const malos: string[] = [];
      // Elementos con texto propio y visible, sin bajar a cada nodo del arbol.
      for (const el of document.querySelectorAll<HTMLElement>(
        '.md-h1, .md-h2, .md-text, .md-bold, .md-list-item, .status-item, .status-branch, ' +
        '.status-available, .explorer-title, .file-name, .tab-label, .stack-chip, .md-link')) {
        const texto = (el.textContent ?? '').trim();
        if (!texto || el.offsetParent === null) continue;
        const r = ratio(getComputedStyle(el).color, fondoDe(el));
        if (r < 4.5) malos.push(`${el.className.split(' ')[0]} "${texto.slice(0, 22)}" = ${r.toFixed(2)}`);
      }
      return malos;
    });

    expect(flojos, `Texto por debajo de 4.5:1 en tema claro:\n  ${flojos.join('\n  ')}`).toEqual([]);
  });

  test('en claro, el texto principal se lee sobre el fondo que lo rodea', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('jeb-theme', 'light'));
    await page.reload();
    await page.waitForSelector('.md-h1');

    const contraste = await page.evaluate(() => {
      const lum = (rgb: string) => {
        const [r, g, b] = rgb.match(/[\d.]+/g)!.slice(0, 3)
          .map((v) => { const n = Number(v) / 255; return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4; });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      // El fondo hay que buscarlo subiendo: el contenedor del texto suele ser
      // transparente, y leer `rgba(0,0,0,0)` como si fuera negro da un
      // contraste inventado. Este mismo descuido dio un falso fallo al medirlo
      // a mano la primera vez.
      const h1 = document.querySelector('.md-h1')!;
      let nodo: Element | null = h1;
      let fondo = 'rgb(255, 255, 255)';
      while (nodo) {
        const c = getComputedStyle(nodo).backgroundColor;
        if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) { fondo = c; break; }
        nodo = nodo.parentElement;
      }
      const texto = getComputedStyle(h1).color;
      const [a, b] = [lum(texto), lum(fondo)].sort((x, y) => y - x);
      return (a + 0.05) / (b + 0.05);
    });

    // AA para texto normal. El h1 es grande y le bastaria 3, pero si este cae
    // es que el fondo dejo de ser claro y lo demas caera con el.
    expect(contraste).toBeGreaterThanOrEqual(4.5);
  });
});
