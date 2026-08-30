import { expect, test } from '@playwright/test';

/**
 * These run against the demo page in a real Chromium.
 *
 * The unit tests feed the engines numbers I made up. That catches logic errors
 * and nothing else — it can't tell me whether `getComputedStyle` actually says
 * `auto` for an untouched flex item, or whether the stylesheet walker finds any
 * rules at all. Both of those were broken at some point and the unit suite was
 * green throughout, so this file exists to keep me honest.
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('every section on the demo page produces the finding it was built for', async ({ page }) => {
  const findings = await page.evaluate(() => {
    const w = window.whylayout;
    const first = (selector: string): string => {
      const element = document.querySelector(selector)!;
      return w.formatReport(w.explain(element)).split('\n')[0]!;
    };

    return {
      flex: first('.row .card:nth-child(2)'),
      margin: first('.panel__title'),
      grid: first('.cols .cell:nth-child(2)'),
      zIndex: first('.badge'),
      fixed: first('.cta'),
      maxWidth: first('.capped'),
      inlineWidth: first('.inline-width'),
      alignment: first('.bar'),
    };
  });

  expect(findings.flex).toContain('will not shrink');
  expect(findings.margin).toContain('collapsed through');
  expect(findings.grid).toContain('minmax(auto, 1fr)');
  expect(findings.zIndex).toContain('stacking context');
  expect(findings.fixed).toContain('fixed to div.promo');
  expect(findings.maxWidth).toContain('max-width: 320px capped it');
  expect(findings.inlineWidth).toContain('does not apply to non-replaced inline');
  expect(findings.alignment).toContain('has nothing to move');
});

test('the sideways scroll is blamed on the one element that caused it', async ({ page }) => {
  const summary = await page.evaluate(() => {
    const w = window.whylayout;
    return w.formatReport(w.explainOverflow()).split('\n')[0]!;
  });

  expect(summary).toContain('div.tile.tile--wide');
  // The tiles after it are pushed further right, and must not be blamed.
  expect(summary).not.toContain('tile--wide, div.tile');
});

test('the cascade walker reads real stylesheets, layers and all', async ({ page }) => {
  const report = await page.evaluate(() => {
    const w = window.whylayout;
    return w.formatReport(w.explainCascade(document.querySelector('.contested')!, 'color'));
  });

  // rebeccapurple sits in @layer base and seagreen in @layer theme. Both are
  // !important, and for !important the layer order runs backwards, so the
  // earlier layer wins. Getting this the wrong way round is the whole point.
  expect(report).toContain('is rebeccapurple');
  expect(report).toContain('3 other declarations lost');
  expect(report).toContain('earlier layers win');
});

test('nothing is reported for an element that is behaving itself', async ({ page }) => {
  const report = await page.evaluate(() => {
    const w = window.whylayout;
    return w.formatReport(w.explain(document.querySelector('.page-header')!));
  });

  expect(report).toContain('Nothing conclusive');
});

test('the inspector opens, explains what you click, and closes on escape', async ({ page }) => {
  await page.getByRole('button', { name: 'Inspect' }).click();

  const panel = page.locator('#whylayout-host').locator('.output');
  await expect(panel).toHaveText(/Click anything/);

  await page.locator('.row .card').nth(1).click();
  await expect(panel).toContainText('will not shrink');

  await page.keyboard.press('Escape');
  await expect(page.locator('#whylayout-host')).toHaveCount(0);
});

test('inspecting does not modify the page', async ({ page }) => {
  const before = await page.locator('main, body > section').first().innerHTML();

  await page.getByRole('button', { name: 'Inspect' }).click();
  await page.locator('.row .card').nth(1).click();
  await page.keyboard.press('Escape');

  expect(await page.locator('main, body > section').first().innerHTML()).toBe(before);
});
