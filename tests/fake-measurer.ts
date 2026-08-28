import type { Box, Measurer } from '../src/measure/types.js';

/**
 * A measurer backed by numbers the test states outright.
 *
 * jsdom does no layout, so this is not a convenience - it is the only way to
 * exercise the engines. It also keeps the tests honest about what each engine
 * actually depends on: if a test does not supply a measurement, the engine had
 * better not be using it.
 */
export class FakeMeasurer implements Measurer {
  readonly #boxes = new Map<Element, Partial<Box>>();
  readonly #styles = new Map<Element, Record<string, string>>();
  readonly #minContent = new Map<Element, number>();
  #viewport = 1280;

  setBox(element: Element, box: Partial<Box>): this {
    this.#boxes.set(element, box);
    return this;
  }

  setStyle(element: Element, styles: Record<string, string>): this {
    this.#styles.set(element, { ...this.#styles.get(element), ...styles });
    return this;
  }

  setMinContentWidth(element: Element, width: number): this {
    this.#minContent.set(element, width);
    return this;
  }

  setViewportWidth(width: number): this {
    this.#viewport = width;
    return this;
  }

  box(element: Element): Box {
    const partial = this.#boxes.get(element) ?? {};
    return {
      width: partial.width ?? 0,
      height: partial.height ?? 0,
      left: partial.left ?? 0,
      right: partial.right ?? partial.width ?? 0,
      top: partial.top ?? 0,
      bottom: partial.bottom ?? 0,
    };
  }

  style(element: Element, property: string): string {
    return this.#styles.get(element)?.[property] ?? '';
  }

  minContentWidth(element: Element): number {
    return this.#minContent.get(element) ?? 0;
  }

  viewportWidth(): number {
    return this.#viewport;
  }
}
