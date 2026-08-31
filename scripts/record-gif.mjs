#!/usr/bin/env node
/**
 * Records the README GIF by driving the demo in a real browser.
 *
 * Playwright screenshots each frame, gifenc encodes them. Playwright does ship
 * an ffmpeg, but it's a stripped build with no GIF muxer and no palette filters,
 * so it's webm-only and no use here.
 *
 * Screenshots don't include the mouse pointer, which makes a click-driven demo
 * impossible to follow, so a fake cursor is drawn into the page and moved in
 * step with the real one.
 *
 *   node scripts/record-gif.mjs
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { chromium } from '@playwright/test';
// Both are CommonJS, and Node's named-export detection doesn't see through
// either of them, so they come in as defaults.
import gifenc from 'gifenc';
import pngjs from 'pngjs';

const { GIFEncoder, applyPalette, quantize } = gifenc;
const { PNG } = pngjs;

const URL = process.env.DEMO_URL ?? 'http://localhost:5173';
const OUT = 'docs/demo.gif';
const WIDTH = 880;
const HEIGHT = 700;

const frames = [];

async function shoot(page, delay = 90) {
  const png = PNG.sync.read(await page.screenshot({ type: 'png' }));
  frames.push({ data: new Uint8Array(png.data), delay });
}

/** Holds the current picture on screen for a beat, so it can be read. */
async function hold(page, ms) {
  await shoot(page, ms);
}

/** Moves the real pointer and the drawn one together, in a few steps. */
async function glide(page, to, steps = 6) {
  const from = glide.at ?? { x: 40, y: 40 };

  for (let i = 1; i <= steps; i++) {
    const x = from.x + ((to.x - from.x) * i) / steps;
    const y = from.y + ((to.y - from.y) * i) / steps;
    await page.mouse.move(x, y);
    await page.evaluate(
      ({ x, y }) => window.__moveCursor?.(x, y),
      { x, y },
    );
    await shoot(page, 60);
  }

  glide.at = to;
}

async function clickHere(page) {
  await page.evaluate(() => window.__pressCursor?.(true));
  await shoot(page, 90);
  await page.mouse.click(glide.at.x, glide.at.y);
  await page.evaluate(() => window.__pressCursor?.(false));
}

/** Centre of an element, in viewport coordinates. */
async function centreOf(page, selector) {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) throw new Error(`no box for ${selector}`);
  return { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
}

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 1,
  reducedMotion: 'reduce',
});
const page = await context.newPage();

await page.goto(URL, { waitUntil: 'networkidle' });

// The drawn cursor. pointer-events: none so elementFromPoint still finds what's
// underneath it - otherwise the inspector would just keep picking the cursor.
await page.addInitScript(() => undefined);
await page.evaluate(() => {
  const cursor = document.createElement('div');
  cursor.style.cssText = [
    'position:fixed',
    'z-index:2147483647',
    'width:22px',
    'height:22px',
    'margin:-2px 0 0 -2px',
    'pointer-events:none',
    'transition:transform 60ms linear',
  ].join(';');
  cursor.innerHTML =
    '<svg viewBox="0 0 24 24" width="22" height="22">' +
    '<path d="M5 3l14 8.5-6 1.2L10.5 19z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/>' +
    '</svg>';
  document.body.append(cursor);

  window.__moveCursor = (x, y) => {
    cursor.style.left = `${x}px`;
    cursor.style.top = `${y}px`;
  };
  window.__pressCursor = (down) => {
    cursor.style.transform = down ? 'scale(0.82)' : 'scale(1)';
  };
  window.__moveCursor(40, 40);
});

await hold(page, 700);

// 1. Turn the inspector on.
await glide(page, await centreOf(page, '#inspect'));
await clickHere(page);
await hold(page, 500);

// 2. The card that won't shrink.
await glide(page, await centreOf(page, '.row .card:nth-child(2)'), 8);
await hold(page, 300);
await clickHere(page);
await hold(page, 2600);

// 3. The grid track, to show it's not a one-trick script.
await page.evaluate(() => document.querySelector('.cols')?.scrollIntoView({ block: 'center' }));
await hold(page, 350);
await glide(page, await centreOf(page, '.cols .cell:nth-child(2)'), 8);
await clickHere(page);
await hold(page, 2600);

// 4. The gap nobody can find.
await page.evaluate(() => document.querySelector('.panel')?.scrollIntoView({ block: 'center' }));
await hold(page, 350);
await glide(page, await centreOf(page, '.panel__title'), 8);
await clickHere(page);
await hold(page, 2800);

await browser.close();

// One palette across every frame. Quantising each frame on its own makes the
// colours crawl between frames, which looks like compression damage.
const sample = frames.filter((_, i) => i % 3 === 0);
const merged = new Uint8Array(sample.reduce((n, f) => n + f.data.length, 0));
let at = 0;
for (const frame of sample) {
  merged.set(frame.data, at);
  at += frame.data.length;
}

const palette = quantize(merged, 256, { format: 'rgb565' });
const encoder = GIFEncoder();

for (const frame of frames) {
  encoder.writeFrame(applyPalette(frame.data, palette, 'rgb565'), WIDTH, HEIGHT, {
    palette,
    delay: frame.delay,
  });
}

encoder.finish();

mkdirSync(dirname(OUT), { recursive: true });
const bytes = encoder.bytes();
writeFileSync(OUT, bytes);

const seconds = frames.reduce((n, f) => n + f.delay, 0) / 1000;
console.log(`${OUT}: ${frames.length} frames, ${seconds.toFixed(1)}s, ${(bytes.length / 1e6).toFixed(2)} MB`);
