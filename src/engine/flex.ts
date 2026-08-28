import type { Measurer } from '../measure/types.js';
import type { Finding } from '../types.js';

const FLEX_CONTAINERS = new Set(['flex', 'inline-flex']);

/** Sub-pixel slack. Layout arithmetic rarely lands on a whole pixel. */
const TOLERANCE = 0.5;

/**
 * The single most common flexbox confusion: an item that will not shrink,
 * because flex items default to `min-width: auto` and that keyword refuses to go
 * below the widest unbreakable thing inside.
 *
 * This is only emitted when all three facts hold, each of them measured:
 *
 *   1. the element is a shrinkable item of a flex container;
 *   2. its min-width resolves to `auto`;
 *   3. its width is sitting exactly on its min-content width while the line
 *      overflows - i.e. the content floor is what is binding, not a stylesheet.
 *
 * Without (3) the element merely *could* be stuck. Reporting that would be a
 * guess, and a guess that a developer acts on is worse than saying nothing.
 */
export function flexShrinkRefusal(element: Element, measurer: Measurer): Finding[] {
  const parent = element.parentElement;
  if (!parent) return [];

  const display = measurer.style(parent, 'display');
  if (!FLEX_CONTAINERS.has(display)) return [];

  const shrink = Number.parseFloat(measurer.style(element, 'flex-shrink') || '1');
  if (Number.isFinite(shrink) && shrink === 0) {
    // Refusing to shrink is exactly what flex-shrink: 0 asks for. Not a bug.
    return [];
  }

  if (!resolvesToAuto(measurer.style(element, 'min-width'))) return [];

  const box = measurer.box(element);
  const floor = measurer.minContentWidth(element);
  if (floor <= 0) return [];

  // The content floor must be what is holding the width open.
  if (Math.abs(box.width - floor) > TOLERANCE) return [];

  // And the line must actually be overflowing, or nothing is wrong yet.
  const overflow = lineOverflow(parent, measurer);
  if (overflow <= TOLERANCE) return [];

  const evidence: Finding['evidence'] = [
    {
      kind: 'computed',
      detail: `${describe(parent)} is display: ${display}, so ${describe(element)} is a flex item`,
    },
    {
      kind: 'computed',
      detail: 'min-width resolves to auto, the initial value for a flex item',
    },
    {
      kind: 'measurement',
      detail: `width is ${round(box.width)}px, and the widest unbreakable content inside is ${round(floor)}px - the content is the floor`,
    },
    {
      kind: 'measurement',
      detail: `the flex line overflows ${describe(parent)} by ${round(overflow)}px`,
    },
  ];

  const asked = inlineWidth(element);
  if (asked !== null && asked < box.width - TOLERANCE) {
    evidence.unshift({
      kind: 'declaration',
      detail: `width: ${round(asked)}px was asked for, and ignored`,
      source: 'inline style',
    });
  }

  return [
    {
      rule: 'flex-min-width-auto',
      summary:
        `${describe(element)} will not shrink below ${round(floor)}px. Flex items start at ` +
        'min-width: auto, which refuses to go narrower than their widest unbreakable content.',
      evidence,
      fix: {
        declaration: 'min-width: 0',
        target: describe(element),
        note: 'Or overflow-wrap: anywhere on the content, if the long word should break instead.',
      },
      confidence: 'proved',
    },
  ];
}

/** How far the children overflow the container's own box, in pixels. */
function lineOverflow(container: Element, measurer: Measurer): number {
  const containerBox = measurer.box(container);
  let widest = 0;

  for (const child of container.children) {
    const right = measurer.box(child).right;
    if (right > widest) widest = right;
  }

  return widest - containerBox.right;
}

/**
 * Browsers report an unset min-width on a flex item as 'auto'; jsdom reports ''.
 * Both mean "nobody set this", which is the case the engine is looking for.
 */
function resolvesToAuto(value: string): boolean {
  return value === '' || value === 'auto';
}

/** The specified width, where it is readable without walking the cascade. */
function inlineWidth(element: Element): number | null {
  const inline = (element as HTMLElement).style?.width;
  if (!inline) return null;
  const parsed = Number.parseFloat(inline);
  return Number.isFinite(parsed) && inline.endsWith('px') ? parsed : null;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

export function describe(element: Element): string {
  const id = element.id ? `#${element.id}` : '';
  const classes = element.classList.length ? `.${[...element.classList].join('.')}` : '';
  return `${element.tagName.toLowerCase()}${id}${classes}`;
}
