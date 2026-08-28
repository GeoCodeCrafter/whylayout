import { toggleInspector } from '../src/ui/inspector.js';

/**
 * The demo is the fixture the findings are developed against: if an engine
 * cannot explain the three faults on this page, it is not finished.
 */
document.getElementById('inspect')?.addEventListener('click', () => {
  toggleInspector();
});

document.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 'i' && !event.metaKey && !event.ctrlKey) {
    toggleInspector();
  }
});
