import type { Measurer } from '../measure/types.js';
import type { Finding } from '../types.js';
import { describe } from './flex.js';

/**
 * "Why is my z-index being ignored?"
 *
 * Two different answers, and telling them apart is the whole value:
 *
 *   1. `z-index` does nothing at all on a statically positioned, non-flex,
 *      non-grid item. The declaration is inert. People raise the number.
 *   2. The z-index works perfectly, but it is only compared against siblings
 *      inside the nearest ancestor that created a stacking context. If that
 *      ancestor sits below the thing you are trying to cover, no number will
 *      help - 9999 loses to an ancestor's 1.
 *
 * The second is the one that wastes afternoons, and it is the one nothing in
 * the browser will point at for you.
 */

const NONE = new Set(['none', 'normal', 'auto', '']);

export function ignoredZIndex(element: Element, measurer: Measurer): Finding[] {
  const zIndex = measurer.style(element, 'z-index');
  if (zIndex === '' || zIndex === 'auto') return [];

  const position = measurer.style(element, 'position');
  const parent = element.parentElement;
  const parentDisplay = parent ? measurer.style(parent, 'display') : '';
  const isFlexOrGridItem = /^(inline-)?(flex|grid)$/.test(parentDisplay);

  // Case 1: the declaration is inert.
  if (position === 'static' && !isFlexOrGridItem) {
    return [
      {
        rule: 'z-index-inert-on-static',
        summary:
          `z-index: ${zIndex} on ${describe(element)} does nothing. z-index only applies to ` +
          'positioned elements, and to flex and grid items - this is none of those.',
        evidence: [
          { kind: 'computed', detail: `position: static, so the element is not positioned` },
          {
            kind: 'computed',
            detail: parent
              ? `its parent ${describe(parent)} is display: ${parentDisplay || 'block'}, so it is not a flex or grid item either`
              : 'it has no parent to make it a flex or grid item',
          },
        ],
        fix: {
          declaration: 'position: relative',
          target: describe(element),
          note: 'relative changes nothing visually on its own and makes z-index apply.',
        },
        confidence: 'proved',
      },
    ];
  }

  // Case 2: it applies, but only inside an ancestor's stacking context.
  const context = findStackingContext(element, measurer);
  if (!context) return [];

  return [
    {
      rule: 'z-index-trapped-in-stacking-context',
      summary:
        `z-index: ${zIndex} on ${describe(element)} is only compared against other children of ` +
        `${describe(context.ancestor)}, which created a stacking context with ${context.property}: ` +
        `${context.value}. Nothing inside can be painted above anything that ancestor sits below.`,
      evidence: [
        {
          kind: 'ancestry',
          detail: `${describe(context.ancestor)} is the nearest ancestor forming a stacking context`,
        },
        { kind: 'computed', detail: `it has ${context.property}: ${context.value}` },
        {
          kind: 'computed',
          detail: `${describe(element)} is position: ${position} with z-index: ${zIndex}, which is honoured - but only within that context`,
        },
      ],
      fix: {
        declaration: `${context.property}: ${neutralFor(context.property)}`,
        target: describe(context.ancestor),
        note: 'Or raise the ancestor itself, or move this element out of that subtree. Raising this element\'s own z-index cannot work.',
      },
      confidence: 'proved',
    },
  ];
}

/**
 * The nearest ancestor that forms a stacking context. Not exhaustive - the full
 * list in the spec is long and some entries are unobservable from computed
 * styles - but every entry here is checked rather than guessed, and the ones
 * left out cannot produce a false positive, only a missed finding.
 */
export function findStackingContext(
  element: Element,
  measurer: Measurer,
): { ancestor: Element; property: string; value: string } | null {
  let ancestor = element.parentElement;

  while (ancestor) {
    const reason = formsStackingContext(ancestor, measurer);
    if (reason) return { ancestor, ...reason };
    ancestor = ancestor.parentElement;
  }

  return null;
}

function formsStackingContext(
  element: Element,
  measurer: Measurer,
): { property: string; value: string } | null {
  const opacity = measurer.style(element, 'opacity');
  if (opacity !== '' && Number.parseFloat(opacity) < 1) return { property: 'opacity', value: opacity };

  for (const property of ['transform', 'filter', 'perspective', 'mix-blend-mode', 'contain', 'isolation']) {
    const value = measurer.style(element, property);
    if (value === '' || NONE.has(value)) continue;
    if (property === 'isolation' && value !== 'isolate') continue;
    if (property === 'mix-blend-mode' && value === 'normal') continue;
    return { property, value };
  }

  // A positioned element with an explicit z-index forms one too.
  const position = measurer.style(element, 'position');
  const zIndex = measurer.style(element, 'z-index');
  if (position !== 'static' && position !== '' && zIndex !== 'auto' && zIndex !== '') {
    return { property: 'z-index', value: zIndex };
  }

  return null;
}

function neutralFor(property: string): string {
  switch (property) {
    case 'opacity':
      return '1';
    case 'isolation':
      return 'auto';
    case 'mix-blend-mode':
      return 'normal';
    case 'z-index':
      return 'auto';
    default:
      return 'none';
  }
}
