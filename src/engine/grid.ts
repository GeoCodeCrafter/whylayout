import type { Measurer } from '../measure/types.js';
import type { Finding } from '../types.js';
import { describe } from './flex.js';

const GRID_CONTAINERS = new Set(['grid', 'inline-grid']);
const TOLERANCE = 0.5;

/**
 * `1fr` isn't "one fraction of the space". It's `minmax(auto, 1fr)`, and that
 * `auto` minimum is why one long word in a grid column blows out the whole
 * layout while everything else gets squeezed.
 *
 * Same underlying rule as the flex case. Different enough in practice that
 * people who know the flex fix still lose an afternoon to it.
 */
export function gridTrackRefusal(element: Element, measurer: Measurer): Finding[] {
  const parent = element.parentElement;
  if (!parent) return [];

  const display = measurer.style(parent, 'display');
  if (!GRID_CONTAINERS.has(display)) return [];
  if (!resolvesToAuto(measurer.style(element, 'min-width'))) return [];

  const box = measurer.box(element);
  const floor = measurer.minContentWidth(element);
  if (floor <= 0) return [];

  // The content has to be what is holding the track open, not a track sizing
  // function that asked for this width anyway.
  if (Math.abs(box.width - floor) > TOLERANCE) return [];

  const overflow = trackOverflow(parent, measurer);
  if (overflow <= TOLERANCE) return [];

  const columns = measurer.style(parent, 'grid-template-columns');

  return [
    {
      rule: 'grid-min-width-auto',
      summary:
        `${describe(element)} will not go below ${round(floor)}px, so the grid overflows by ` +
        `${round(overflow)}px. Grid items get min-width: auto, and a fr track is really ` +
        'minmax(auto, 1fr) - that auto is a floor, not a suggestion.',
      evidence: [
        {
          kind: 'computed',
          detail: `${describe(parent)} is display: ${display}${columns ? `, grid-template-columns: ${columns}` : ''}`,
        },
        { kind: 'computed', detail: 'min-width resolves to auto, the initial value for a grid item' },
        {
          kind: 'measurement',
          detail: `the item is ${round(box.width)}px and its widest unbreakable content is ${round(floor)}px`,
        },
        { kind: 'measurement', detail: `the tracks overrun ${describe(parent)} by ${round(overflow)}px` },
      ],
      fix: {
        declaration: 'min-width: 0',
        target: describe(element),
        note: 'Or size the track minmax(0, 1fr) instead of 1fr, which says the same thing on the container.',
      },
      confidence: 'proved',
    },
  ];
}

function trackOverflow(container: Element, measurer: Measurer): number {
  const containerBox = measurer.box(container);
  let widest = 0;

  for (const child of container.children) {
    const right = measurer.box(child).right;
    if (right > widest) widest = right;
  }

  return widest - containerBox.right;
}

function resolvesToAuto(value: string): boolean {
  return value === '' || value === 'auto';
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
