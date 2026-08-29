import type { Measurer } from '../measure/types.js';
import type { Finding } from '../types.js';
import { describe } from './flex.js';

/**
 * "Why is my position: fixed element scrolling away?"
 *
 * Because `fixed` sticks to the viewport right up until an ancestor becomes its
 * containing block, and a surprising number of harmless-looking properties do
 * that: a `translateZ(0)` someone added for a performance hunch, a filter on a
 * wrapper, `will-change`, `contain`, `backdrop-filter`.
 *
 * Entirely decidable from computed styles, so this names the exact ancestor and
 * the exact property.
 */

/** Properties that make an ancestor the containing block for fixed children. */
const TRAPS = ['transform', 'perspective', 'filter', 'backdrop-filter', 'contain', 'will-change'];

const NONE = new Set(['none', 'normal', 'auto', '']);

export function brokenFixedPositioning(element: Element, measurer: Measurer): Finding[] {
  if (measurer.style(element, 'position') !== 'fixed') return [];

  const trap = findTrap(element, measurer);
  if (!trap) return [];

  return [
    {
      rule: 'fixed-trapped-by-containing-block',
      summary:
        `${describe(element)} is position: fixed, but it is fixed to ${describe(trap.ancestor)} ` +
        `rather than to the viewport. ${trap.property}: ${trap.value} on that ancestor made it the ` +
        'containing block, and it scrolls with the page.',
      evidence: [
        {
          kind: 'ancestry',
          detail: `${describe(trap.ancestor)} is an ancestor of ${describe(element)}`,
        },
        {
          kind: 'computed',
          detail: `it has ${trap.property}: ${trap.value}, which creates a containing block for fixed descendants`,
        },
        {
          kind: 'computed',
          detail: 'position: fixed resolves against the nearest such ancestor, not the viewport',
        },
      ],
      fix: {
        declaration: `${trap.property}: none`,
        target: describe(trap.ancestor),
        note: 'Or move the fixed element out of that subtree. There is no way to opt back into the viewport from inside it.',
      },
      confidence: 'proved',
    },
  ];
}

/**
 * Also useful on its own: the same rule decides which ancestor an
 * `position: absolute` element resolves against when it is looking for one.
 */
export function findTrap(
  element: Element,
  measurer: Measurer,
): { ancestor: Element; property: string; value: string } | null {
  let ancestor = element.parentElement;

  while (ancestor) {
    for (const property of TRAPS) {
      const value = measurer.style(ancestor, property);
      if (value !== '' && !NONE.has(value)) {
        // `will-change` only traps when it names a property that would trap.
        if (property === 'will-change' && !TRAPS.some((trap) => value.includes(trap))) continue;
        return { ancestor, property, value };
      }
    }
    ancestor = ancestor.parentElement;
  }

  return null;
}
