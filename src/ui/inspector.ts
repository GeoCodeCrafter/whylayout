import { explain, explainOverflow } from '../index.js';
import { formatReport } from '../report/format.js';

/**
 * The picker and the panel.
 *
 * No engine logic in here at all, which is what keeps the explanations testable
 * without a browser and the bookmarklet small enough to paste into a bookmark.
 * The overlay lives in a shadow root and takes itself off the page on Escape.
 */

const HOST_ID = 'whylayout-host';

export function toggleInspector(): void {
  const existing = document.getElementById(HOST_ID);
  if (existing) {
    existing.remove();
    return;
  }

  const host = document.createElement('div');
  host.id = HOST_ID;
  host.setAttribute('aria-hidden', 'true');
  const root = host.attachShadow({ mode: 'open' });
  root.append(styles(), highlight(), panel());
  document.body.append(host);

  start(host, root);
}

function start(host: HTMLElement, root: ShadowRoot): void {
  const box = root.querySelector<HTMLElement>('.highlight')!;
  const output = root.querySelector<HTMLElement>('.output')!;
  const title = root.querySelector<HTMLElement>('.title')!;

  const onMove = (event: PointerEvent): void => {
    const target = elementUnder(event, host);
    if (!target) return;
    const rect = target.getBoundingClientRect();
    // Assigned property by property: appending to cssText on every pointer move
    // grows the string without bound until the page crawls.
    box.style.display = 'block';
    box.style.top = `${rect.top}px`;
    box.style.left = `${rect.left}px`;
    box.style.width = `${rect.width}px`;
    box.style.height = `${rect.height}px`;
  };

  const onClick = (event: MouseEvent): void => {
    const target = elementUnder(event, host);
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();

    const element = explain(target);
    const overflow = explainOverflow();

    title.textContent = selectorFor(target);

    // The overflow finding is about the page, not the element you clicked, so it
    // gets its own heading. Merged into the same list it just reads as a second
    // explanation of the thing under the cursor, which it isn't.
    let text = formatReport({ element: target, findings: element.findings });
    if (overflow.findings.length > 0) {
      text += `

--- elsewhere on this page ---

${formatReport(overflow)}`;
    }

    output.textContent = text;
  };

  const onKey = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    document.removeEventListener('pointermove', onMove, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKey, true);
    host.remove();
  };

  document.addEventListener('pointermove', onMove, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKey, true);
}

/** The element under the pointer, ignoring our own overlay. */
function elementUnder(event: MouseEvent, host: HTMLElement): Element | null {
  const found = document.elementFromPoint(event.clientX, event.clientY);
  if (!found || found === host || host.contains(found)) return null;
  return found;
}

function selectorFor(element: Element): string {
  const id = element.id ? `#${element.id}` : '';
  const classes = element.classList.length ? `.${[...element.classList].join('.')}` : '';
  return `${element.tagName.toLowerCase()}${id}${classes}`;
}

function highlight(): HTMLElement {
  const node = document.createElement('div');
  node.className = 'highlight';
  return node;
}

function panel(): HTMLElement {
  const node = document.createElement('section');
  node.className = 'panel';
  node.innerHTML =
    '<header><strong class="title">whylayout</strong>' +
    '<span class="hint">click an element &middot; esc to close</span></header>' +
    '<pre class="output">Click anything on the page.</pre>';
  return node;
}

function styles(): HTMLStyleElement {
  const style = document.createElement('style');
  style.textContent = `
    :host { all: initial; }
    .highlight {
      position: fixed; display: none; pointer-events: none; z-index: 2147483646;
      outline: 1px solid #4f9cf9; background: rgba(79,156,249,0.12);
    }
    .panel {
      position: fixed; right: 16px; bottom: 16px; z-index: 2147483647;
      width: min(520px, calc(100vw - 32px)); max-height: 50vh; overflow: auto;
      background: #14161a; color: #e6e8eb; border: 1px solid #2c3038;
      border-radius: 10px; box-shadow: 0 12px 40px rgba(0,0,0,0.45);
      font: 13px/1.55 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }
    header {
      display: flex; justify-content: space-between; gap: 12px; align-items: baseline;
      padding: 10px 14px; border-bottom: 1px solid #2c3038; position: sticky; top: 0;
      background: #14161a;
    }
    .hint { color: #8b93a1; font-size: 11px; }
    .output { margin: 0; padding: 14px; white-space: pre-wrap; }
  `;
  return style;
}
