/**
 * The engines never touch the DOM directly. Every fact about the page arrives
 * through this interface.
 *
 * Two reasons, both load-bearing:
 *
 * 1. jsdom has no layout engine, so `getBoundingClientRect` returns zeroes
 *    there. Injecting the measurer is the only way the engines can be unit
 *    tested at all, and untested layout heuristics are exactly the kind that
 *    quietly lie to people.
 * 2. It forces every engine to declare what it needs to know, which is what
 *    makes a finding's `evidence` writable in the first place.
 */

export interface Box {
  width: number;
  height: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface Measurer {
  /** Border-box geometry, in CSS pixels, relative to the viewport. */
  box(element: Element): Box;

  /**
   * A single resolved property. Returns '' when the property is unknown, which
   * engines must treat as "no information" rather than as a value.
   */
  style(element: Element, property: string): string;

  /**
   * The narrowest width the element's content can take without overflowing:
   * its widest unbreakable run. Establishing this may require a probe on a
   * cloned subtree, so it is the one measurement that can be expensive.
   */
  minContentWidth(element: Element): number;

  /** The layout viewport width, excluding any classic scrollbar. */
  viewportWidth(): number;
}
