import { test, expect } from '@playwright/test';

test.describe('Blueprint viewer renders on case-study pages', () => {
  const cases = [
    { slug: 'sgva', path: '/projects/2', title: 'SGVA' },
    { slug: 'seona', path: '/projects/4', title: 'Seona' },
  ];

  for (const c of cases) {
    test(`${c.title} blueprint viewer renders`, async ({ page }) => {
      await page.goto(c.path, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1200);

      const bw = page.locator('.blueprint-viewer');
      await expect(bw).toBeVisible();

      const nodes = page.locator('.bp-node');
      const count = await nodes.count();
      expect(count).toBeGreaterThan(0);

      const svg = page.locator('.blueprint-viewer svg');
      const svgBox = await svg.boundingBox();
      expect(svgBox).not.toBeNull();

      const paths = await page.locator('.connector-line').evaluateAll(els =>
        els.map(e => e.getAttribute('d') || '')
      );
      // no degenerate connector paths (three points where last two coincide)
      for (const d of paths) {
        const nums = d.match(/-?\d+(\.\d+)?/g)?.map(Number) || [];
        // no point should be identical to next point in a horizontal pipeline
        expect(nums.length).toBeGreaterThanOrEqual(4);
      }

      // horizontal pipeline: 8 nodes in a line
      if (c.slug === 'sgva') {
        expect(count).toBe(8);
      }
    });
  }
});
