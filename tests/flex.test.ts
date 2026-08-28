import { beforeEach, describe, expect, it } from 'vitest';
import { flexShrinkRefusal } from '../src/engine/flex.js';
import { FakeMeasurer } from './fake-measurer.js';

/**
 * The scenario: a 240px card in a flex row, holding a 340px unbreakable URL. The
 * card renders at 340px and the row overflows.
 */
function scenario() {
  document.body.innerHTML = '<div class="row"><div class="card"></div><div class="other"></div></div>';
  const row = document.querySelector('.row')!;
  const card = document.querySelector('.card')!;
  const other = document.querySelector('.other')!;

  const m = new FakeMeasurer()
    .setStyle(row, { display: 'flex' })
    .setStyle(card, { 'min-width': 'auto', 'flex-shrink': '1' })
    .setBox(row, { width: 600, left: 0, right: 600 })
    .setBox(card, { width: 340, left: 0, right: 340 })
    .setBox(other, { width: 300, left: 340, right: 640 })
    .setMinContentWidth(card, 340);

  return { row, card, other, m };
}

describe('flexShrinkRefusal', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('names min-width: auto when the content floor is binding and the line overflows', () => {
    const { card, m } = scenario();

    const [finding] = flexShrinkRefusal(card, m);

    expect(finding?.rule).toBe('flex-min-width-auto');
    expect(finding?.confidence).toBe('proved');
    expect(finding?.fix?.declaration).toBe('min-width: 0');
  });

  it('quotes the width that was asked for when it is readable', () => {
    const { card, m } = scenario();
    (card as HTMLElement).style.width = '240px';

    const [finding] = flexShrinkRefusal(card, m);

    expect(finding?.evidence[0]?.detail).toContain('240px was asked for');
  });

  it('says nothing when the line is not overflowing', () => {
    const { row, card, other, m } = scenario();
    m.setBox(row, { width: 900, left: 0, right: 900 }).setBox(other, {
      width: 300,
      left: 340,
      right: 640,
    });
    void card;

    expect(flexShrinkRefusal(card, m)).toEqual([]);
  });

  it('says nothing when the width is set by a stylesheet rather than the content', () => {
    const { card, m } = scenario();
    // Width sits well above the content floor: something else is holding it open.
    m.setMinContentWidth(card, 120);

    expect(flexShrinkRefusal(card, m)).toEqual([]);
  });

  it('says nothing when flex-shrink: 0 asked for exactly this behaviour', () => {
    const { card, m } = scenario();
    m.setStyle(card, { 'flex-shrink': '0' });

    expect(flexShrinkRefusal(card, m)).toEqual([]);
  });

  it('says nothing when min-width was set explicitly', () => {
    const { card, m } = scenario();
    m.setStyle(card, { 'min-width': '0px' });

    expect(flexShrinkRefusal(card, m)).toEqual([]);
  });

  it('says nothing when the parent is not a flex container', () => {
    const { row, card, m } = scenario();
    m.setStyle(row, { display: 'block' });

    expect(flexShrinkRefusal(card, m)).toEqual([]);
  });

  it('says nothing for an element with no parent', () => {
    const orphan = document.createElement('div');

    expect(flexShrinkRefusal(orphan, new FakeMeasurer())).toEqual([]);
  });
});
