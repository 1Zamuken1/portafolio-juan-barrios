#!/usr/bin/env node
/**
 * Mide lo que tarda y lo que pesa una pagina.
 *
 *   node scripts/medir.mjs [url] [vueltas]
 *   pnpm run medir
 *
 * No es Lighthouse: no puntua ni audita accesibilidad. Reporta lo que el
 * navegador mide de verdad --FCP, LCP, CLS, bytes y peticiones-- que era lo
 * que faltaba: el rendimiento de este sitio no se habia medido nunca, asi que
 * cualquier optimizacion era una corazonada.
 *
 * Frena la CPU a la cuarta parte y no reutiliza cache, para parecerse a una
 * visita nueva desde un portatil normal y no a esta maquina con todo caliente.
 * Los numeros absolutos importan menos que compararlos antes y despues de un
 * cambio, siempre con las mismas condiciones.
 */

import { chromium } from '@playwright/test';

const URL_POR_DEFECTO = 'https://portafolio-juan-barrios.vercel.app/';

const url = process.argv[2] ?? URL_POR_DEFECTO;
const vueltas = Number(process.argv[3] ?? 3);

const mediana = (xs) => {
  const ordenados = [...xs].sort((a, b) => a - b);
  return ordenados[Math.floor(ordenados.length / 2)];
};

const resultados = [];

for (let i = 0; i < vueltas; i++) {
  const navegador = await chromium.launch();
  const contexto = await navegador.newContext({ viewport: { width: 1366, height: 900 } });
  const pagina = await contexto.newPage();

  const cdp = await contexto.newCDPSession(pagina);
  await cdp.send('Network.enable');
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

  const peticiones = new Map();
  cdp.on('Network.requestWillBeSent', (e) =>
    peticiones.set(e.requestId, { url: e.request.url, tipo: e.type }));
  cdp.on('Network.responseReceived', (e) => {
    const r = peticiones.get(e.requestId);
    if (r) r.tipo = e.type;
  });
  cdp.on('Network.loadingFinished', (e) => {
    const r = peticiones.get(e.requestId);
    if (r) r.bytes = e.encodedDataLength;
  });

  await pagina.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

  const metricas = await pagina.evaluate(() => new Promise((resolve) => {
    const salida = { fcp: null, lcp: null, cls: 0 };

    for (const entrada of performance.getEntriesByType('paint')) {
      if (entrada.name === 'first-contentful-paint') salida.fcp = entrada.startTime;
    }
    new PerformanceObserver((lista) => {
      const ultimo = lista.getEntries().at(-1);
      if (ultimo) salida.lcp = ultimo.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });

    new PerformanceObserver((lista) => {
      for (const e of lista.getEntries()) if (!e.hadRecentInput) salida.cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });

    const nav = performance.getEntriesByType('navigation')[0];
    salida.dcl = nav?.domContentLoadedEventEnd ?? null;
    salida.carga = nav?.loadEventEnd ?? null;

    // Un respiro para que los observers recojan lo ultimo.
    setTimeout(() => resolve(salida), 600);
  }));

  const recursos = [...peticiones.values()].filter((r) => r.bytes);
  resultados.push({
    ...metricas,
    bytes: recursos.reduce((n, r) => n + r.bytes, 0),
    peticiones: recursos.length,
    recursos
  });

  await navegador.close();
}

const campo = (clave) => mediana(resultados.map((r) => r[clave]).filter((v) => v != null));
const ms = (v) => (v == null ? 'n/d' : `${Math.round(v)} ms`);
const kB = (v) => `${(v / 1024).toFixed(1)} kB`;

console.log(`\n${url}`);
console.log(`mediana de ${vueltas} pasadas, CPU frenada x4, sin cache`);
console.log('─'.repeat(60));
console.log('  First Contentful Paint    ', ms(campo('fcp')));
console.log('  Largest Contentful Paint  ', ms(campo('lcp')));
console.log('  DOMContentLoaded          ', ms(campo('dcl')));
console.log('  Load                      ', ms(campo('carga')));
console.log('  Cumulative Layout Shift   ', campo('cls')?.toFixed(3) ?? 'n/d');
console.log('  Descargado                ', `${kB(campo('bytes'))} en ${campo('peticiones')} peticiones`);

// El desglose de la ultima pasada: sirve para ver de donde sale el peso.
const ultima = resultados.at(-1);
const porTipo = {};
for (const r of ultima.recursos) porTipo[r.tipo] = (porTipo[r.tipo] ?? 0) + r.bytes;

console.log('\n  Por tipo:');
for (const [tipo, bytes] of Object.entries(porTipo).sort((a, b) => b[1] - a[1])) {
  console.log(`    ${tipo.padEnd(12)} ${kB(bytes).padStart(9)}   ${Math.round(bytes / ultima.bytes * 100)}%`);
}

console.log('\n  Los cinco mas pesados:');
for (const r of [...ultima.recursos].sort((a, b) => b.bytes - a.bytes).slice(0, 5)) {
  const ruta = r.url.replace(/^https?:\/\/[^/]+/, '') || '/';
  console.log(`    ${kB(r.bytes).padStart(9)}  ${r.tipo.padEnd(10)} ${ruta.slice(0, 58)}`);
}
console.log();
