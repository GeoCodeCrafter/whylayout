import type { Measurer } from '../measure/types.js';
import type { Finding } from '../types.js';
import { describe } from './flex.js';

const TOLERANCE = 0.5;

interface Candidate {
  element: Element;
  depth: number;
  /** How far past the viewport its right edge sits. */
  excess: number;
  /** How much wider it is than its own parent. Positive means it does not fit. */
  overrun: number;
}

/**
 * "Why does the page scroll sideways?"
 *
 * Browser tools answer this with a list, and the list is useless — when one box
 * is too wide every ancestor is too wide too, so mostly you get the path back to
 * <body>.
 *
 * The subtlety, which I got wrong first time and only caught on a real page: an
 * oversized box shoves its later siblings further right than itself, so sorting
 * by "furthest past the edge" finds a victim rather than the cause. A culprit is
 * an element that doesn't fit inside its own parent. Deepest one wins, since its
 * ancestors are only wide on its account.
 *
 * When nothing overruns its parent — a whole branch sized wide together — it
 * falls back to the deepest overflowing element and says which rule it used.
 */
export function horizontalOverflow(root: Element, measurer: Measurer): Finding[] {
  const viewport = measurer.viewportWidth();
  if (viewport <= 0) return [];

  // A holder rather than two `let`s: TypeScript cannot narrow variables that a
  // nested closure assigns to, and the walk below is that closure.
  const best: { culprit?: Candidate; deepestOverflowing?: Candidate } = {};

  const walk = (element: Element, depth: number, parentWidth: number | null): void => {
    const box = measurer.box(element);
    const excess = box.right - viewport;

    if (excess > TOLERANCE) {
      const overrun = parentWidth === null ? 0 : box.width - parentWidth;
      const candidate: Candidate = { element, depth, excess, overrun };

      if (overrun > TOLERANCE && beats(candidate, best.culprit, 'overrun')) best.culprit = candidate;
      if (beats(candidate, best.deepestOverflowing, 'excess')) best.deepestOverflowing = candidate;
    }

    for (const child of element.children) walk(child, depth + 1, box.width);
  };

  walk(root, 0, null);

  const chosen = best.culprit ?? best.deepestOverflowing;
  if (!chosen) return [];

  return [chosen.overrun > TOLERANCE ? overrunFinding(chosen, measurer) : widestFinding(chosen, viewport, measurer)];
}

/** Deeper always wins; at equal depth, the larger measure wins. */
function beats(candidate: Candidate, incumbent: Candidate | undefined, by: 'overrun' | 'excess'): boolean {
  if (!incumbent) return true;
  if (candidate.depth !== incumbent.depth) return candidate.depth > incumbent.depth;
  return candidate[by] > incumbent[by];
}

function overrunFinding(candidate: Candidate, measurer: Measurer): Finding {
  const { element, overrun } = candidate;
  const box = measurer.box(element);
  const parent = element.parentElement;

  return {
    rule: 'horizontal-overflow-culprit',
    summary:
      `${describe(element)} is ${round(overrun)}px wider than the space it has, and it is the ` +
      'deepest element that does not fit. Everything wider than the page above it is wide ' +
      'because of this one.',
    evidence: [
      {
        kind: 'measurement',
        detail: `it is ${round(box.width)}px wide inside a ${round(box.width - overrun)}px parent${parent ? ` (${describe(parent)})` : ''}`,
      },
      {
        kind: 'measurement',
        detail: `its right edge is ${round(candidate.excess)}px past the viewport`,
      },
      {
        kind: 'ancestry',
        detail: 'no element deeper than this one overruns its parent, so the width originates here',
      },
    ],
    fix: {
      declaration: 'max-width: 100%',
      target: describe(element),
      note: 'If it is a flex or grid item, min-width: 0 is more likely the real fix - see the flex finding.',
    },
    confidence: 'proved',
  };
}

function widestFinding(candidate: Candidate, viewport: number, measurer: Measurer): Finding {
  const { element, excess } = candidate;
  const box = measurer.box(element);

  return {
    rule: 'horizontal-overflow-widest',
    summary:
      `${describe(element)} sticks ${round(excess)}px past the right edge of the viewport. ` +
      'Nothing on the page is wider than its own parent, so this whole branch was sized wide ' +
      'together rather than by one offending box.',
    evidence: [
      {
        kind: 'measurement',
        detail: `its right edge is at ${round(box.right)}px, the viewport ends at ${round(viewport)}px`,
      },
      { kind: 'measurement', detail: `it is ${round(box.width)}px wide` },
      {
        kind: 'ancestry',
        detail: 'no element in the tree is wider than its parent, so no single culprit could be named',
      },
    ],
    fix: {
      declaration: 'max-width: 100%',
      target: describe(element),
      note: 'Look at the widths shared down this branch - a fixed width or a min-width high up is the usual cause.',
    },
    confidence: 'proved',
  };
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
