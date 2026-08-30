import { beforeEach, describe, expect, it } from 'vitest';
import { alignmentWithNoFreeSpace } from '../src/engine/alignment.js';
import { FakeMeasurer } from './fake-measurer.js';

/** A row of two boxes, container exactly as tall as the tallest child. */
function scenario() {
  document.body.innerHTML = '<div class="bar"><div class="a"></div><div class="b"></div></div>';
  const bar = document.querySelector('.bar')!;
  const a = document.querySelector('.a')!;
  const b = document.querySelector('.b')!;

  const m = new FakeMeasurer()
    .setStyle(bar, { display: 'flex', 'flex-direction': 'row', 'align-items': 'center' })
    .setBox(bar, { width: 600, height: 40 })
    .setBox(a, { width: 100, height: 40 })
    .setBox(b, { width: 120, height: 32 });

  return { bar, a, b, m };
}

describe('alignmentWithNoFreeSpace', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('explains align-items doing nothing when the row is content-height', () => {
    const { bar, m } = scenario();

    const [finding] = alignmentWithNoFreeSpace(bar, m);

    expect(finding?.rule).toBe('align-items-no-free-space');
    expect(finding?.summary).toContain('vertically');
    expect(finding?.summary).toContain('height');
  });

  it('frames it as nothing-to-do rather than a mistake', () => {
    const { bar, m } = scenario();

    expect(alignmentWithNoFreeSpace(bar, m)[0]?.fix?.note).toContain('declaration itself is fine');
  });

  /**
   * box() reports the border box; children sit inside padding and border. A real
   * page caught this — a 1px border read as 2px of spare room and the finding
   * never fired.
   */
  it('measures free space against the content box, not the border box', () => {
    const { bar, m } = scenario();
    m.setStyle(bar, {
      'border-top-width': '1px',
      'border-bottom-width': '1px',
      'padding-top': '0px',
      'padding-bottom': '0px',
    }).setBox(bar, { width: 600, height: 42 });

    expect(alignmentWithNoFreeSpace(bar, m)[0]?.rule).toBe('align-items-no-free-space');
  });

  it('stays quiet once the container is taller than its content', () => {
    const { bar, m } = scenario();
    m.setBox(bar, { width: 600, height: 200 });

    expect(alignmentWithNoFreeSpace(bar, m)).toEqual([]);
  });

  it('swaps the axes for a column container', () => {
    const { bar, m } = scenario();
    m.setStyle(bar, { 'flex-direction': 'column' }).setBox(bar, { width: 120, height: 400 });

    const [finding] = alignmentWithNoFreeSpace(bar, m);

    // In a column, align-items works horizontally.
    expect(finding?.summary).toContain('horizontally');
    expect(finding?.summary).toContain('width');
  });

  it('reports justify-content when the main axis is full', () => {
    const { bar, m } = scenario();
    m.setStyle(bar, { 'align-items': 'stretch', 'justify-content': 'space-between' }).setBox(bar, {
      width: 220,
      height: 40,
    });

    const [finding] = alignmentWithNoFreeSpace(bar, m);

    expect(finding?.rule).toBe('justify-content-no-free-space');
  });

  it('can report both axes at once', () => {
    const { bar, m } = scenario();
    m.setStyle(bar, { 'justify-content': 'center' }).setBox(bar, { width: 220, height: 40 });

    expect(alignmentWithNoFreeSpace(bar, m)).toHaveLength(2);
  });

  it('ignores values that work without free space', () => {
    const { bar, m } = scenario();
    m.setStyle(bar, { 'align-items': 'stretch', 'justify-content': 'flex-start' });

    expect(alignmentWithNoFreeSpace(bar, m)).toEqual([]);
  });

  it('skips wrapping containers, where free space is not one number', () => {
    const { bar, m } = scenario();
    m.setStyle(bar, { 'flex-wrap': 'wrap' });

    expect(alignmentWithNoFreeSpace(bar, m)).toEqual([]);
  });

  it('ignores non-flex containers and empty ones', () => {
    const { bar, m } = scenario();
    m.setStyle(bar, { display: 'block' });
    expect(alignmentWithNoFreeSpace(bar, m)).toEqual([]);

    document.body.innerHTML = '<div class="empty"></div>';
    const empty = document.querySelector('.empty')!;
    const em = new FakeMeasurer().setStyle(empty, { display: 'flex', 'align-items': 'center' });
    expect(alignmentWithNoFreeSpace(empty, em)).toEqual([]);
  });
});
