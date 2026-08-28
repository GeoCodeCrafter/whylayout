import { beforeEach, describe, expect, it } from 'vitest';
import { brokenFixedPositioning, findTrap } from '../src/engine/containing.js';
import { FakeMeasurer } from './fake-measurer.js';

function scenario() {
  document.body.innerHTML = '<div class="page"><div class="card"><div class="cta"></div></div></div>';
  const page = document.querySelector('.page')!;
  const card = document.querySelector('.card')!;
  const cta = document.querySelector('.cta')!;

  const m = new FakeMeasurer().setStyle(cta, { position: 'fixed' });
  return { page, card, cta, m };
}

describe('brokenFixedPositioning', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('names the ancestor and the property that trapped it', () => {
    const { card, cta, m } = scenario();
    m.setStyle(card, { transform: 'translateZ(0)' });

    const [finding] = brokenFixedPositioning(cta, m);

    expect(finding?.rule).toBe('fixed-trapped-by-containing-block');
    expect(finding?.summary).toContain('div.card');
    expect(finding?.summary).toContain('transform: translateZ(0)');
    expect(finding?.fix?.target).toBe('div.card');
    expect(finding?.confidence).toBe('proved');
  });

  it('says nothing for an element that is not fixed', () => {
    const { card, cta, m } = scenario();
    m.setStyle(cta, { position: 'absolute' });
    m.setStyle(card, { transform: 'translateZ(0)' });

    expect(brokenFixedPositioning(cta, m)).toEqual([]);
  });

  it('says nothing when the fixed element really is fixed to the viewport', () => {
    const { cta, m } = scenario();

    expect(brokenFixedPositioning(cta, m)).toEqual([]);
  });
});

describe('findTrap', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it.each([
    ['transform', { transform: 'translateX(10px)' }],
    ['filter', { filter: 'blur(1px)' }],
    ['backdrop-filter', { 'backdrop-filter': 'blur(4px)' }],
    ['perspective', { perspective: '800px' }],
    ['contain', { contain: 'paint' }],
  ])('recognises %s', (property, style) => {
    const { card, cta, m } = scenario();
    m.setStyle(card, style);

    expect(findTrap(cta, m)?.property).toBe(property);
  });

  it('ignores neutral values', () => {
    const { card, cta, m } = scenario();
    m.setStyle(card, { transform: 'none', filter: 'none', contain: 'none', perspective: 'none' });

    expect(findTrap(cta, m)).toBeNull();
  });

  describe('will-change', () => {
    it('traps only when it names a property that would trap', () => {
      const { card, cta, m } = scenario();
      m.setStyle(card, { 'will-change': 'transform' });

      expect(findTrap(cta, m)?.property).toBe('will-change');
    });

    it('does not trap when it names something harmless', () => {
      const { card, cta, m } = scenario();
      m.setStyle(card, { 'will-change': 'scroll-position' });

      expect(findTrap(cta, m)).toBeNull();
    });
  });

  it('returns the nearest trapping ancestor', () => {
    const { page, card, cta, m } = scenario();
    m.setStyle(page, { filter: 'blur(1px)' });
    m.setStyle(card, { transform: 'scale(1)' });

    expect(findTrap(cta, m)?.ancestor).toBe(card);
  });
});
