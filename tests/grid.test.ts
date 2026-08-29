import { beforeEach, describe, expect, it } from 'vitest';
import { gridTrackRefusal } from '../src/engine/grid.js';
import { FakeMeasurer } from './fake-measurer.js';

/** A three-column grid where the middle cell holds an unbreakable string. */
function scenario() {
  document.body.innerHTML =
    '<div class="grid"><div class="cell"></div><div class="cell wide"></div><div class="cell"></div></div>';
  const grid = document.querySelector('.grid')!;
  const [first, wide, last] = [...document.querySelectorAll('.cell')];

  const m = new FakeMeasurer()
    .setStyle(grid, { display: 'grid', 'grid-template-columns': 'repeat(3, 1fr)' })
    .setStyle(wide!, { 'min-width': 'auto' })
    .setBox(grid, { width: 600, left: 0, right: 600 })
    .setBox(first!, { width: 80, left: 0, right: 80 })
    .setBox(wide!, { width: 430, left: 80, right: 510 })
    .setBox(last!, { width: 200, left: 510, right: 710 })
    .setMinContentWidth(wide!, 430);

  return { grid, wide: wide!, last: last!, m };
}

describe('gridTrackRefusal', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('explains a blown-out fr track in terms of minmax(auto, 1fr)', () => {
    const { wide, m } = scenario();

    const [finding] = gridTrackRefusal(wide, m);

    expect(finding?.rule).toBe('grid-min-width-auto');
    expect(finding?.summary).toContain('minmax(auto, 1fr)');
    expect(finding?.fix?.declaration).toBe('min-width: 0');
    expect(finding?.fix?.note).toContain('minmax(0, 1fr)');
  });

  it('quotes the track definition as evidence', () => {
    const { wide, m } = scenario();

    expect(gridTrackRefusal(wide, m)[0]?.evidence[0]?.detail).toContain('repeat(3, 1fr)');
  });

  it('stays quiet when the grid is not overflowing', () => {
    const { grid, last, wide, m } = scenario();
    m.setBox(grid, { width: 900, left: 0, right: 900 }).setBox(last, { width: 200, left: 510, right: 710 });

    expect(gridTrackRefusal(wide, m)).toEqual([]);
  });

  it('stays quiet when the track width came from somewhere other than the content', () => {
    const { wide, m } = scenario();
    m.setMinContentWidth(wide, 100);

    expect(gridTrackRefusal(wide, m)).toEqual([]);
  });

  it('stays quiet when min-width was set explicitly', () => {
    const { wide, m } = scenario();
    m.setStyle(wide, { 'min-width': '0px' });

    expect(gridTrackRefusal(wide, m)).toEqual([]);
  });

  it('ignores children of a non-grid parent', () => {
    const { grid, wide, m } = scenario();
    m.setStyle(grid, { display: 'block' });

    expect(gridTrackRefusal(wide, m)).toEqual([]);
  });

  it('handles an element with no parent', () => {
    expect(gridTrackRefusal(document.createElement('div'), new FakeMeasurer())).toEqual([]);
  });
});
