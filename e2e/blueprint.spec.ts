import { test, expect } from '@playwright/test';
import projects from '../src/assets/data/projects.json';

/**
 * Los casos se derivan del propio projects.json para que los ids no vuelvan a
 * desincronizarse cuando se reordenen o agreguen proyectos.
 */
const cases = (projects as Array<{
  id: number;
  name: string;
  status: string;
  architectureNodes?: unknown[];
}>)
  .filter((p) => p.status !== 'Draft' && (p.architectureNodes?.length ?? 0) > 0)
  .map((p) => ({
    id: p.id,
    name: p.name,
    path: `/projects/${p.id}`,
    expectedNodes: p.architectureNodes!.length,
  }));

test.describe('Blueprint viewer renders on case-study pages', () => {
  test('hay proyectos con arquitectura para validar', () => {
    expect(cases.length).toBeGreaterThan(0);
  });

  for (const c of cases) {
    test(`${c.name} blueprint viewer renders`, async ({ page }) => {
      await page.goto(c.path, { waitUntil: 'networkidle' });

      const bw = page.locator('.blueprint-viewer');
      await expect(bw).toBeVisible();

      // Cada nodo del JSON debe tener su contraparte renderizada.
      const nodes = page.locator('.svg-node');
      await expect(nodes).toHaveCount(c.expectedNodes);

      const svg = page.locator('.blueprint-viewer svg');
      await expect(svg).toBeVisible();
      expect(await svg.boundingBox()).not.toBeNull();

      // Ningun conector puede quedar con un path degenerado.
      const paths = await page.locator('.connector-line').evaluateAll((els) =>
        els.map((e) => e.getAttribute('d') || '')
      );
      expect(paths.length).toBeGreaterThan(0);
      for (const d of paths) {
        const nums = d.match(/-?\d+(\.\d+)?/g)?.map(Number) || [];
        expect(nums.length).toBeGreaterThanOrEqual(4);
        expect(nums.every((n) => Number.isFinite(n))).toBe(true);
      }
    });
  }
});
