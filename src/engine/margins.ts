import type { Measurer } from '../measure/types.js';
import type { Finding } from '../types.js';
import { describe } from './flex.js';

/** Displays that establish a block formatting context, which stops collapsing. */
const CONTAINS_MARGINS = new Set([
  'flow-root',
  'flex',
  'inline-flex',
  'grid',
  'inline-grid',
  'table',
  'table-cell',
  'inline-block',
]);

/**
 * "There is a gap above this box and I cannot find where it came from."
 *
 * The answer is nearly always that the first child's top margin collapsed
 * through the parent and is now pushing the *parent* down. Every condition below
 * is a documented requirement for collapsing, so when all of them hold the cause
 * is established rather than suspected.
 */
export function collapsedTopMargin(element: Element, measurer: Measurer): Finding[] {
  const parent = element.parentElement;
  if (!parent) return [];

  if (!isInFlow(element, measurer)) return [];
  if (firstInFlowChild(parent, measurer) !== element) return [];

  const margin = lengthOf(measurer.style(element, 'margin-top'));
  if (margin <= 0) return [];

  const blocker = whatWouldStopIt(parent, measurer);
  if (blocker) return [];

  const parentMargin = lengthOf(measurer.style(parent, 'margin-top'));

  return [
    {
      rule: 'margin-collapse-through-parent',
      summary:
        `The ${margin}px gap is above ${describe(parent)}, not inside it. ${describe(element)} is ` +
        'its first in-flow child, and nothing separates them, so the child\'s top margin ' +
        'collapsed through and moved the parent instead.',
      evidence: [
        { kind: 'computed', detail: `${describe(element)} has margin-top: ${margin}px` },
        {
          kind: 'computed',
          detail: `${describe(parent)} has no top border, no top padding, and does not establish a block formatting context`,
        },
        {
          kind: 'ancestry',
          detail: `${describe(element)} is the first in-flow child of ${describe(parent)}`,
        },
        {
          kind: 'computed',
          detail: `${describe(parent)} now behaves as though its own margin-top were ${Math.max(margin, parentMargin)}px`,
        },
      ],
      fix: {
        declaration: 'display: flow-root',
        target: describe(parent),
        note: 'Any of padding-top, a top border, or overflow other than visible would also stop it. flow-root is the one that changes nothing else.',
      },
      confidence: 'proved',
    },
  ];
}

/** Returns the reason collapsing cannot happen, or null when nothing stops it. */
function whatWouldStopIt(parent: Element, measurer: Measurer): string | null {
  if (CONTAINS_MARGINS.has(measurer.style(parent, 'display'))) return 'display';
  if (lengthOf(measurer.style(parent, 'border-top-width')) > 0) return 'border';
  if (lengthOf(measurer.style(parent, 'padding-top')) > 0) return 'padding';

  const overflow = measurer.style(parent, 'overflow');
  if (overflow !== '' && overflow !== 'visible') return 'overflow';

  return null;
}

function firstInFlowChild(parent: Element, measurer: Measurer): Element | null {
  for (const child of parent.children) {
    if (isInFlow(child, measurer)) return child;
  }
  return null;
}

function isInFlow(element: Element, measurer: Measurer): boolean {
  const position = measurer.style(element, 'position');
  if (position === 'absolute' || position === 'fixed') return false;
  return measurer.style(element, 'float') === 'none' || measurer.style(element, 'float') === '';
}

function lengthOf(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
