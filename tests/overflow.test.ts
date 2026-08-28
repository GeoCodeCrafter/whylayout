import { beforeEach, describe, expect, it } from 'vitest';
import { horizontalOverflow } from '../src/engine/overflow.js';
import { FakeMeasurer } from './fake-measurer.js';

describe('horizontalOverflow', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  /**
   * The bug that only showed up against a real browser: an oversized element
   * pushes its later siblings further right than itself, so "furthest past the
   * edge" names a victim. The culprit is the element that does not fit its
   * parent.
   */
  it('names the element that does not fit, not the sibling it shoved sideways', () => {
    document.body.innerHTML =
      '<main class="grid"><div class="a"></div><div class="wide"></div><div class="c"></div></main>';
    const grid = document.querySelector('.grid')!;
    const a = document.querySelector('.a')!;
    const wide = document.querySelector('.wide')!;
    const c = document.querySelector('.c')!;

    const m = new FakeMeasurer()
      .setViewportWidth(1280)
      .setBox(grid, { width: 1052, left: 24, right: 1076 })
      .setBox(a, { width: 80, left: 24, right: 104 })
      .setBox(wide, { width: 1600, left: 120, right: 1720 })
      // Pushed along by .wide: further right than the culprit, but it fits fine.
      .setBox(c, { width: 80, left: 1736, right: 1816 });

    const [finding] = horizontalOverflow(grid, m);

    expect(finding?.rule).toBe('horizontal-overflow-culprit');
    expect(finding?.summary).toContain('div.wide');
    expect(finding?.summary).not.toContain('div.c');
    expect(finding?.summary).toContain('548px wider');
  });

  it('prefers the deepest element that overruns its parent', () => {
    document.body.innerHTML = '<main><section><div class="inner"></div></section></main>';
    const main = document.querySelector('main')!;
    const section = document.querySelector('section')!;
    const inner = document.querySelector('.inner')!;

    const m = new FakeMeasurer()
      .setViewportWidth(1000)
      .setBox(main, { width: 1000, left: 0, right: 1000 })
      .setBox(section, { width: 1200, left: 0, right: 1200 })
      .setBox(inner, { width: 1400, left: 0, right: 1400 });

    expect(horizontalOverflow(main, m)[0]?.summary).toContain('div.inner');
  });

  it('falls back to the deepest overflowing element when nothing overruns its parent', () => {
    document.body.innerHTML = '<main><section><div class="wide"></div></section></main>';
    const main = document.querySelector('main')!;
    const section = document.querySelector('section')!;
    const wide = document.querySelector('.wide')!;

    const m = new FakeMeasurer()
      .setViewportWidth(1280)
      .setBox(main, { width: 1600, left: 0, right: 1600 })
      .setBox(section, { width: 1600, left: 0, right: 1600 })
      .setBox(wide, { width: 1600, left: 0, right: 1600 });

    const [finding] = horizontalOverflow(main, m);

    expect(finding?.rule).toBe('horizontal-overflow-widest');
    expect(finding?.summary).toContain('div.wide');
    expect(finding?.summary).toContain('sized wide together');
  });

  it('says nothing when the page fits', () => {
    document.body.innerHTML = '<main><div></div></main>';
    const main = document.querySelector('main')!;

    const m = new FakeMeasurer().setViewportWidth(1280).setBox(main, { width: 1280, right: 1280 });

    expect(horizontalOverflow(main, m)).toEqual([]);
  });

  it('ignores sub-pixel overhang rather than crying wolf', () => {
    document.body.innerHTML = '<main></main>';
    const main = document.querySelector('main')!;

    const m = new FakeMeasurer().setViewportWidth(1280).setBox(main, { right: 1280.3 });

    expect(horizontalOverflow(main, m)).toEqual([]);
  });

  it('says nothing when the viewport width is unknown', () => {
    document.body.innerHTML = '<main></main>';
    const main = document.querySelector('main')!;

    const m = new FakeMeasurer().setViewportWidth(0).setBox(main, { right: 500 });

    expect(horizontalOverflow(main, m)).toEqual([]);
  });
});
