/**
 * Engines never touch the DOM. Every fact about the page comes through here.
 *
 * Two reasons. First, jsdom does no layout — `getBoundingClientRect` returns
 * zeroes — so injecting the measurements is the only way to unit test any of
 * this, and untested layout heuristics are precisely the kind that lie to
 * people. Second, it forces each engine to declare what it needs to know, which
 * is what makes the `evidence` on a finding writable at all.
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
