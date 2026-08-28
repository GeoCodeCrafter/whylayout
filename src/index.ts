import type { Report } from './types.js';

export type { Report, Finding, Evidence, Fix } from './types.js';

/**
 * Explain why `element` looks the way it does.
 *
 * Read-only: this never mutates the page. Engines are added in the order set out
 * in PLAN.md, starting with flex, margins and overflow.
 */
export function explain(element: Element): Report {
  return { element, findings: [] };
}
