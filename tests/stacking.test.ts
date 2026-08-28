import { beforeEach, describe, expect, it } from 'vitest';
import { findStackingContext, ignoredZIndex } from '../src/engine/stacking.js';
import { FakeMeasurer } from './fake-measurer.js';

function scenario() {
  document.body.innerHTML =
    '<div class="wrapper"><div class="panel"><span class="badge"></span></div></div>';
  const wrapper = document.querySelector('.wrapper')!;
  const panel = document.querySelector('.panel')!;
  const badge = document.querySelector('.badge')!;

  const m = new FakeMeasurer()
    .setStyle(badge, { 'z-index': '9999', position: 'absolute' })
    .setStyle(panel, { display: 'block', position: 'static', opacity: '1' })
    .setStyle(wrapper, { display: 'block', position: 'static', opacity: '1' });

  return { wrapper, panel, badge, m };
}

describe('ignoredZIndex', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('says nothing when no z-index is set', () => {
    const { badge, m } = scenario();
    m.setStyle(badge, { 'z-index': 'auto' });

    expect(ignoredZIndex(badge, m)).toEqual([]);
  });

  describe('when the declaration is inert', () => {
    it('names position: static as the reason', () => {
      const { badge, m } = scenario();
      m.setStyle(badge, { position: 'static' });

      const [finding] = ignoredZIndex(badge, m);

      expect(finding?.rule).toBe('z-index-inert-on-static');
      expect(finding?.fix?.declaration).toBe('position: relative');
    });

    it('does not fire for a static flex item, where z-index does apply', () => {
      const { panel, badge, m } = scenario();
      m.setStyle(badge, { position: 'static' });
      m.setStyle(panel, { display: 'flex' });

      expect(ignoredZIndex(badge, m)).toEqual([]);
    });

    it('does not fire for a static grid item either', () => {
      const { panel, badge, m } = scenario();
      m.setStyle(badge, { position: 'static' });
      m.setStyle(panel, { display: 'inline-grid' });

      expect(ignoredZIndex(badge, m)).toEqual([]);
    });
  });

  describe('when the z-index works but is trapped', () => {
    it('names the ancestor and the property that formed the context', () => {
      const { panel, badge, m } = scenario();
      m.setStyle(panel, { opacity: '0.99' });

      const [finding] = ignoredZIndex(badge, m);

      expect(finding?.rule).toBe('z-index-trapped-in-stacking-context');
      expect(finding?.summary).toContain('div.panel');
      expect(finding?.summary).toContain('opacity: 0.99');
      expect(finding?.fix?.note).toContain('cannot work');
    });

    it('says nothing when no ancestor forms a context', () => {
      const { badge, m } = scenario();

      expect(ignoredZIndex(badge, m)).toEqual([]);
    });
  });
});

describe('findStackingContext', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it.each([
    ['opacity below 1', { opacity: '0.5' }],
    ['a transform', { transform: 'translateZ(0)' }],
    ['a filter', { filter: 'blur(2px)' }],
    ['isolation: isolate', { isolation: 'isolate' }],
    ['a blend mode', { 'mix-blend-mode': 'multiply' }],
  ])('recognises %s', (_label, style) => {
    const { panel, badge, m } = scenario();
    m.setStyle(panel, style);

    expect(findStackingContext(badge, m)?.ancestor).toBe(panel);
  });

  it('recognises a positioned ancestor with an explicit z-index', () => {
    const { panel, badge, m } = scenario();
    m.setStyle(panel, { position: 'relative', 'z-index': '1' });

    expect(findStackingContext(badge, m)?.property).toBe('z-index');
  });

  it('is not fooled by neutral values', () => {
    const { panel, badge, m } = scenario();
    m.setStyle(panel, {
      opacity: '1',
      transform: 'none',
      isolation: 'auto',
      'mix-blend-mode': 'normal',
      position: 'relative',
      'z-index': 'auto',
    });

    expect(findStackingContext(badge, m)).toBeNull();
  });

  it('returns the nearest one, not the outermost', () => {
    const { wrapper, panel, badge, m } = scenario();
    m.setStyle(wrapper, { opacity: '0.5' });
    m.setStyle(panel, { transform: 'scale(1.01)' });

    expect(findStackingContext(badge, m)?.ancestor).toBe(panel);
  });
});
