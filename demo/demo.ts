import * as whylayout from '../src/index.js';

/**
 * The demo is the fixture the findings are developed against: if an engine
 * cannot explain a fault on this page, it is not finished.
 *
 * The whole API is put on `window` so the cascade question can be asked from
 * the console, where its answer is easiest to read.
 */
declare global {
  interface Window {
    whylayout: typeof whylayout;
  }
}

window.whylayout = whylayout;

document.getElementById('inspect')?.addEventListener('click', () => {
  whylayout.toggleInspector();
});

document.addEventListener('keydown', (event) => {
  const target = event.target as HTMLElement | null;
  if (target && /^(INPUT|TEXTAREA)$/.test(target.tagName)) return;
  if (event.key.toLowerCase() === 'i' && !event.metaKey && !event.ctrlKey) {
    whylayout.toggleInspector();
  }
});
