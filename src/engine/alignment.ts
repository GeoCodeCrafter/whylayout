import type { Measurer } from '../measure/types.js';
import type { Finding } from '../types.js';
import { describe } from './flex.js';

const FLEX_CONTAINERS = new Set(['flex', 'inline-flex']);
const TOLERANCE = 0.5;

/** Values that only do something when there's spare room to distribute. */
const NEEDS_SPACE = new Set([
  'center',
  'flex-end',
  'end',
  'right',
  'space-between',
  'space-around',
  'space-evenly',
]);

/**
 * "I set align-items: center and nothing moved."
 *
 * Almost always because there's no free space on that axis to move anything
 * through — the container is exactly as tall as its tallest item, so centring
 * inside it is a no-op. People then try `justify-content` instead, which is the
 * other axis, and end up convinced flexbox is broken.
 *
 * Worth being careful here: the declaration isn't wrong, and it'll start working
 * the moment the container gets a height. So this reports "nothing to do right
 * now" rather than "you've made a mistake".
 */
export function alignmentWithNoFreeSpace(element: Element, measurer: Measurer): Finding[] {
  const display = measurer.style(element, 'display');
  if (!FLEX_CONTAINERS.has(display)) return [];
  if (element.children.length === 0) return [];

  // A wrapped container has line boxes rather than one line, and free space
  // stops being a single number. Out of scope rather than guessed at.
  const wrap = measurer.style(element, 'flex-wrap');
  if (wrap !== '' && wrap !== 'nowrap') return [];

  const column = measurer.style(element, 'flex-direction').startsWith('column');
  const box = measurer.box(element);
  const findings: Finding[] = [];

  const content = contentBox(element, measurer, box);
  const cross = crossFreeSpace(element, measurer, column, content);
  const alignItems = measurer.style(element, 'align-items');
  if (NEEDS_SPACE.has(alignItems) && cross !== null && cross <= TOLERANCE) {
    findings.push(
      noFreeSpace(element, 'align-items', alignItems, column ? 'horizontally' : 'vertically', column ? 'width' : 'height'),
    );
  }

  const main = mainFreeSpace(element, measurer, column, content);
  const justify = measurer.style(element, 'justify-content');
  if (NEEDS_SPACE.has(justify) && main !== null && main <= TOLERANCE) {
    findings.push(
      noFreeSpace(element, 'justify-content', justify, column ? 'vertically' : 'horizontally', column ? 'height' : 'width'),
    );
  }

  return findings;
}

function noFreeSpace(
  element: Element,
  property: string,
  value: string,
  direction: string,
  dimension: string,
): Finding {
  return {
    rule: property === 'align-items' ? 'align-items-no-free-space' : 'justify-content-no-free-space',
    summary:
      `${property}: ${value} on ${describe(element)} has nothing to move. It positions children ` +
      `${direction}, and the container's ${dimension} is already exactly its content's ${dimension} — ` +
      'so there is no spare room on that axis.',
    evidence: [
      { kind: 'computed', detail: `${property}: ${value} needs free space on that axis to do anything` },
      {
        kind: 'measurement',
        detail: `the container's ${dimension} matches its content's, so the free space is zero`,
      },
      {
        kind: 'computed',
        detail: `flex-direction decides which axis this is: here ${property} works ${direction}`,
      },
    ],
    fix: {
      declaration: `${dimension}: <something larger>`,
      target: describe(element),
      note: `Give the container a ${dimension} (or let it stretch) and this starts working immediately. The declaration itself is fine.`,
    },
    confidence: 'proved',
  };
}

/**
 * The container's content box. `box()` gives the border box, but children are
 * laid out inside padding and border, so comparing the two directly makes a 1px
 * border look like 2px of spare room — which is exactly what stopped this firing
 * on a real page the first time.
 */
function contentBox(
  element: Element,
  measurer: Measurer,
  box: { width: number; height: number },
): { width: number; height: number } {
  const edge = (property: string): number => {
    const parsed = Number.parseFloat(measurer.style(element, property));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  return {
    width:
      box.width - edge('padding-left') - edge('padding-right') - edge('border-left-width') - edge('border-right-width'),
    height:
      box.height - edge('padding-top') - edge('padding-bottom') - edge('border-top-width') - edge('border-bottom-width'),
  };
}

/** Spare room on the cross axis: container minus the tallest (or widest) item. */
function crossFreeSpace(
  element: Element,
  measurer: Measurer,
  column: boolean,
  box: { width: number; height: number },
): number | null {
  const container = column ? box.width : box.height;
  if (container <= 0) return null;

  let largest = 0;
  for (const child of element.children) {
    const childBox = measurer.box(child);
    const size = column ? childBox.width : childBox.height;
    if (size > largest) largest = size;
  }

  return largest > 0 ? container - largest : null;
}

/** Spare room on the main axis: container minus the sum of the items. */
function mainFreeSpace(
  element: Element,
  measurer: Measurer,
  column: boolean,
  box: { width: number; height: number },
): number | null {
  const container = column ? box.height : box.width;
  if (container <= 0) return null;

  let total = 0;
  for (const child of element.children) {
    const childBox = measurer.box(child);
    total += column ? childBox.height : childBox.width;
  }

  return total > 0 ? container - total : null;
}
