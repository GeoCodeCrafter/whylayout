import { collapsedTopMargin } from './engine/margins.js';
import { flexShrinkRefusal } from './engine/flex.js';
import { horizontalOverflow } from './engine/overflow.js';
import { DomMeasurer } from './measure/dom.js';
import type { Measurer } from './measure/types.js';
import type { Report } from './types.js';

export type { Report, Finding, Evidence, Fix } from './types.js';
export type { Measurer, Box } from './measure/types.js';
export { formatReport, formatFinding } from './report/format.js';
export { DomMeasurer } from './measure/dom.js';

export interface ExplainOptions {
  /** Override the source of measurements. Used by the test suite. */
  measurer?: Measurer;
}

/**
 * Explain why `element` looks the way it does.
 *
 * Read-only: nothing here mutates the page. Engines that need to probe do so on
 * a cloned subtree and mark their findings `speculative`.
 */
export function explain(element: Element, options: ExplainOptions = {}): Report {
  const measurer = options.measurer ?? new DomMeasurer();

  return {
    element,
    findings: [...flexShrinkRefusal(element, measurer), ...collapsedTopMargin(element, measurer)],
  };
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
