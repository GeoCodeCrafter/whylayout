import type { Box, Measurer } from './types.js';

/**
 * The real measurer, backed by a browser that actually does layout.
 *
 * Not unit tested: there is nothing here to test without a layout engine, and a
 * jsdom test of this file would only assert that the mocks were called. It is
 * covered by the demo fixtures instead. Everything with a decision in it lives
 * in the engines, which are tested against a fake measurer.
 */
export class DomMeasurer implements Measurer {
  readonly #styles = new WeakMap<Element, CSSStyleDeclaration>();
  readonly #minContent = new WeakMap<Element, number>();

  box(element: Element): Box {
    const rect = element.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
    };
  }

  style(element: Element, property: string): string {
    let declaration = this.#styles.get(element);
    if (!declaration) {
      declaration = getComputedStyle(element);
      this.#styles.set(element, declaration);
    }
    return declaration.getPropertyValue(property);
  }

  /**
   * Measured by cloning the subtree into an inert, off-screen container sized
   * to `min-content`. The clone is used precisely so the live page is never
   * mutated - see the read-only rule in the README.
   */
  minContentWidth(element: Element): number {
    const cached = this.#minContent.get(element);
    if (cached !== undefined) return cached;

    const host = element.ownerDocument.createElement('div');
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText =
      'position:absolute;left:-99999px;top:0;width:min-content;visibility:hidden;contain:layout style;';

    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.width = 'min-content';
    clone.style.minWidth = '0';
    clone.style.maxWidth = 'none';
    host.append(clone);

    element.ownerDocument.body.append(host);
    const width = clone.getBoundingClientRect().width;
    host.remove();

    this.#minContent.set(element, width);
    return width;
  }

  viewportWidth(): number {
    return document.documentElement.clientWidth;
  }
}
