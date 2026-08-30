import { alignmentWithNoFreeSpace } from './engine/alignment.js';
import { brokenFixedPositioning } from './engine/containing.js';
import { collapsedTopMargin } from './engine/margins.js';
import { explainProperty, type CascadeSource, type MatchedRule } from './engine/cascade.js';
import { flexShrinkRefusal } from './engine/flex.js';
import { gridTrackRefusal } from './engine/grid.js';
import { horizontalOverflow } from './engine/overflow.js';
import { ignoredZIndex } from './engine/stacking.js';
import { widthConstraint } from './engine/sizing.js';
import { collectMatchedRules } from './measure/cascade-dom.js';
import { DomMeasurer } from './measure/dom.js';
import type { Measurer } from './measure/types.js';
import type { Report } from './types.js';

export type { Report, Finding, Evidence, Fix } from './types.js';
export type { Measurer, Box } from './measure/types.js';
export type { MatchedRule, Declaration, CascadeOutcome, CascadeSource } from './engine/cascade.js';
export { formatReport, formatFinding } from './report/format.js';
export { DomMeasurer } from './measure/dom.js';
export { collectMatchedRules, splitSelectorList } from './measure/cascade-dom.js';
export { resolve, specificity, compareSpecificity, explainProperty } from './engine/cascade.js';
export { flexShrinkRefusal } from './engine/flex.js';
export { gridTrackRefusal } from './engine/grid.js';
export { collapsedTopMargin } from './engine/margins.js';
export { horizontalOverflow } from './engine/overflow.js';
export { ignoredZIndex, findStackingContext } from './engine/stacking.js';
export { brokenFixedPositioning, findTrap } from './engine/containing.js';
export { alignmentWithNoFreeSpace } from './engine/alignment.js';
export { widthConstraint, declaredWidth } from './engine/sizing.js';
export { toggleInspector } from './ui/inspector.js';

export interface ExplainOptions {
  /** Override the source of measurements. Used by the test suite. */
  measurer?: Measurer;
  /** Override the source of matched CSS rules. Used by the test suite. */
  cascade?: CascadeSource;
}

/**
 * Explain why `element` looks the way it does.
 *
 * Read-only: nothing here mutates the page. Engines that need to probe do so on
 * a cloned subtree and mark their findings `speculative`.
 */
export function explain(element: Element, options: ExplainOptions = {}): Report {
  const measurer = options.measurer ?? new DomMeasurer();

  let rules: MatchedRule[] = [];
  let opaqueSheets: string[] = [];

  if (options.cascade) {
    rules = options.cascade(element);
  } else if (typeof document !== 'undefined') {
    const collected = collectMatchedRules(element);
    rules = collected.rules;
    opaqueSheets = collected.opaqueSheets;
  }

  const findings = [
    ...flexShrinkRefusal(element, measurer),
    ...gridTrackRefusal(element, measurer),
    ...collapsedTopMargin(element, measurer),
    ...widthConstraint(element, measurer, rules),
    ...ignoredZIndex(element, measurer),
    ...brokenFixedPositioning(element, measurer),
    ...alignmentWithNoFreeSpace(element, measurer),
  ];

  // A stylesheet we could not read may hold the declaration that actually won,
  // so every finding on this element is downgraded rather than one of them.
  if (opaqueSheets.length > 0) {
    for (const finding of findings) finding.confidence = 'opaque';
  }

  // Styles inside a shadow root come from the component's own stylesheet, which
  // is not in document.styleSheets. Rather than answer from a cascade that is
  // missing most of the rules, say so.
  const inShadow = isInShadowRoot(element);
  if (inShadow) {
    for (const finding of findings) finding.confidence = 'opaque';
  }

  return { element, findings, opaqueSheets, inShadowRoot: inShadow };
}

/**
 * Which rule won for one property, and what lost. This is the question DevTools
 * shows the raw material for and never answers.
 */
export function explainCascade(
  element: Element,
  property: string,
  options: ExplainOptions = {},
): Report {
  const rules = options.cascade
    ? options.cascade(element)
    : typeof document !== 'undefined'
      ? collectMatchedRules(element).rules
      : [];

  return { element, findings: explainProperty(element, property, rules) };
}

/**
 * Find what is making the page scroll sideways. Page-scoped rather than
 * element-scoped, because the question is about the document.
 */
export function explainOverflow(
  root: Element = document.documentElement,
  options: ExplainOptions = {},
): Report {
  const measurer = options.measurer ?? new DomMeasurer();
  return { element: root, findings: horizontalOverflow(root, measurer) };
}

/** True when the element lives inside a shadow root rather than the document. */
function isInShadowRoot(element: Element): boolean {
  const root = element.getRootNode?.();
  return typeof ShadowRoot !== 'undefined' && root instanceof ShadowRoot;
}
