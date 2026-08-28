import type { Measurer } from '../measure/types.js';
import type { Finding } from '../types.js';
import { resolve, type MatchedRule } from './cascade.js';
import { describe } from './flex.js';

/**
 * "Why is this element this width?" and "why did my width do nothing?"
 *
 * `getComputedStyle().width` reports the *used* width, not what you asked for,
 * which is exactly why the question is hard to answer by reading DevTools: the
 * panel shows you the number you got, not the constraint that produced it.
 *
 * Two faults are worth naming, and both are decidable:
 *
 *   1. A `max-width` or `min-width` is the binding constraint, so the declared
 *      width was never going to apply.
 *   2. `width` is inert in this layout mode - on a non-replaced inline element
 *      it does nothing at all, and people spend a while not believing that.
 */

const TOLERANCE = 0.5;

/** Elements where `width` applies despite being inline-level. */
const REPLACED = new Set(['IMG', 'VIDEO', 'CANVAS', 'IFRAME', 'EMBED', 'OBJECT', 'SVG', 'INPUT', 'SELECT', 'TEXTAREA', 'BUTTON']);

export function widthConstraint(
  element: Element,
  measurer: Measurer,
  rules: MatchedRule[] = [],
): Finding[] {
  const findings: Finding[] = [];
  const declared = declaredWidth(element, rules);

  const inert = widthIsInert(element, measurer, declared);
  if (inert) return [inert];

  if (declared === null) return findings;

  const used = usedWidthInDeclaredBox(element, measurer);
  if (Math.abs(used - declared) <= TOLERANCE) return findings;

  const maxWidth = lengthOf(measurer.style(element, 'max-width'));
  const minWidth = lengthOf(measurer.style(element, 'min-width'));

  if (maxWidth !== null && Math.abs(used - maxWidth) <= TOLERANCE && maxWidth < declared) {
    findings.push(bound(element, 'max-width', maxWidth, declared, used, 'capped'));
  } else if (minWidth !== null && Math.abs(used - minWidth) <= TOLERANCE && minWidth > declared) {
    findings.push(bound(element, 'min-width', minWidth, declared, used, 'raised'));
  }

  return findings;
}

function bound(
  element: Element,
  property: 'max-width' | 'min-width',
  limit: number,
  declared: number,
  used: number,
  verb: string,
): Finding {
  return {
    rule: property === 'max-width' ? 'width-capped-by-max-width' : 'width-raised-by-min-width',
    summary:
      `${describe(element)} asked for width: ${round(declared)}px and is ${round(used)}px. ` +
      `${property}: ${round(limit)}px ${verb} it - that constraint always wins over width.`,
    evidence: [
      { kind: 'declaration', detail: `width resolves to ${round(declared)}px` },
      { kind: 'computed', detail: `${property} is ${round(limit)}px` },
      {
        kind: 'measurement',
        detail: `the used width is ${round(used)}px, which is the ${property} value, not the width value`,
      },
    ],
    fix: {
      declaration: `${property}: none`,
      target: describe(element),
      note: `Or change the width to something within the ${property}. Changing width alone cannot help.`,
    },
    confidence: 'proved',
  };
}

/** `width` on a non-replaced inline element does nothing whatsoever. */
function widthIsInert(element: Element, measurer: Measurer, declared: number | null): Finding | null {
  if (declared === null) return null;
  if (measurer.style(element, 'display') !== 'inline') return null;
  if (REPLACED.has(element.tagName)) return null;

  return {
    rule: 'width-inert-on-inline',
    summary:
      `width: ${round(declared)}px on ${describe(element)} does nothing. The element is display: ` +
      'inline, and width does not apply to non-replaced inline elements.',
    evidence: [
      { kind: 'computed', detail: 'display: inline' },
      { kind: 'computed', detail: `${element.tagName.toLowerCase()} is not a replaced element, so width is ignored entirely` },
      { kind: 'measurement', detail: `the box is ${round(measurer.box(element).width)}px, sized by its content` },
    ],
    fix: {
      declaration: 'display: inline-block',
      target: describe(element),
      note: 'inline-block keeps it in the text flow and makes width apply.',
    },
    confidence: 'proved',
  };
}

/**
 * The width that was *declared*, taken from whichever rule won the cascade for
 * it. `getComputedStyle().width` is no use here - it reports the used value,
 * which is the number we are trying to explain.
 *
 * Percentages and keywords are deliberately not resolved. Guessing what `50%`
 * came out to would produce exactly the confident-but-wrong answer this tool
 * exists to avoid, so those simply yield no finding.
 */
export function declaredWidth(element: Element, rules: MatchedRule[]): number | null {
  const winner = resolve('width', rules).winner;
  const declared = winner?.declaration.value ?? (element as HTMLElement).style?.width;

  if (!declared || !declared.trim().endsWith('px')) return null;

  const parsed = Number.parseFloat(declared);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * The used width measured in the same box that `width`, `min-width` and
 * `max-width` are expressed in.
 *
 * `getBoundingClientRect()` always reports the border box, but under the default
 * `box-sizing: content-box` those properties describe the *content* box. Compare
 * the two directly and a 320px cap on a padded element looks like a 354px
 * element that nothing explains - which is precisely the false negative this
 * caused before a real page caught it.
 */
function usedWidthInDeclaredBox(element: Element, measurer: Measurer): number {
  const borderBox = measurer.box(element).width;
  if (measurer.style(element, 'box-sizing') === 'border-box') return borderBox;

  const inset =
    edge(measurer, element, 'padding-left') +
    edge(measurer, element, 'padding-right') +
    edge(measurer, element, 'border-left-width') +
    edge(measurer, element, 'border-right-width');

  return borderBox - inset;
}

function edge(measurer: Measurer, element: Element, property: string): number {
  return lengthOf(measurer.style(element, property)) ?? 0;
}

function lengthOf(value: string): number | null {
  if (value === '' || value === 'none' || value === 'auto') return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
