import { beforeEach, describe, expect, it } from 'vitest';
import { declaredWidth, widthConstraint } from '../src/engine/sizing.js';
import type { MatchedRule } from '../src/engine/cascade.js';
import { FakeMeasurer } from './fake-measurer.js';

function widthRule(value: string, selector = '.box'): MatchedRule {
  return {
    selector,
    declarations: [{ property: 'width', value, important: false }],
    source: 'main.css:1',
    layer: null,
    layerOrder: -1,
    order: 0,
  };
}

function scenario() {
  document.body.innerHTML = '<div class="box"></div>';
  const box = document.querySelector('.box')!;
  const m = new FakeMeasurer().setStyle(box, { display: 'block' });
  return { box, m };
}

describe('declaredWidth', () => {
  it('reads the width from whichever rule won the cascade', () => {
    const { box } = scenario();

    expect(declaredWidth(box, [widthRule('240px')])).toBe(240);
  });

  it('refuses a percentage rather than guessing what it resolved to', () => {
    const { box } = scenario();

    expect(declaredWidth(box, [widthRule('50%')])).toBeNull();
  });

  it('refuses a keyword', () => {
    const { box } = scenario();

    expect(declaredWidth(box, [widthRule('min-content')])).toBeNull();
  });

  it('falls back to the inline style when no rule is available', () => {
    const { box } = scenario();
    (box as HTMLElement).style.width = '300px';

    expect(declaredWidth(box, [])).toBe(300);
  });
});

describe('widthConstraint', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('names max-width when it capped the declared width', () => {
    const { box, m } = scenario();
    m.setStyle(box, { 'max-width': '200px' }).setBox(box, { width: 200 });

    const [finding] = widthConstraint(box, m, [widthRule('240px')]);

    expect(finding?.rule).toBe('width-capped-by-max-width');
    expect(finding?.summary).toContain('asked for width: 240px and is 200px');
    expect(finding?.fix?.declaration).toBe('max-width: none');
  });

  it('names min-width when it raised the declared width', () => {
    const { box, m } = scenario();
    m.setStyle(box, { 'min-width': '400px' }).setBox(box, { width: 400 });

    const [finding] = widthConstraint(box, m, [widthRule('240px')]);

    expect(finding?.rule).toBe('width-raised-by-min-width');
  });

  /**
   * getBoundingClientRect reports the border box; under content-box, max-width
   * describes the content box. Comparing the two directly made a real capped
   * element look unexplainable, which a real page caught and this pins.
   */
  it('compares like with like when box-sizing is content-box', () => {
    const { box, m } = scenario();
    m.setStyle(box, {
      'max-width': '320px',
      'box-sizing': 'content-box',
      'padding-left': '16px',
      'padding-right': '16px',
      'border-left-width': '1px',
      'border-right-width': '1px',
    }).setBox(box, { width: 354 });

    expect(widthConstraint(box, m, [widthRule('480px')])[0]?.rule).toBe('width-capped-by-max-width');
  });

  it('takes the border box as-is when box-sizing is border-box', () => {
    const { box, m } = scenario();
    m.setStyle(box, {
      'max-width': '320px',
      'box-sizing': 'border-box',
      'padding-left': '16px',
    }).setBox(box, { width: 320 });

    expect(widthConstraint(box, m, [widthRule('480px')])[0]?.rule).toBe('width-capped-by-max-width');
  });

  it('says nothing when the element got the width it asked for', () => {
    const { box, m } = scenario();
    m.setBox(box, { width: 240 });

    expect(widthConstraint(box, m, [widthRule('240px')])).toEqual([]);
  });

  it('says nothing when the width differs for some other reason', () => {
    // Neither limit explains the used width, so no confident answer is offered.
    const { box, m } = scenario();
    m.setStyle(box, { 'max-width': '900px' }).setBox(box, { width: 180 });

    expect(widthConstraint(box, m, [widthRule('240px')])).toEqual([]);
  });

  describe('width on an inline element', () => {
    it('reports the declaration as inert', () => {
      const { box, m } = scenario();
      m.setStyle(box, { display: 'inline' }).setBox(box, { width: 63 });

      const [finding] = widthConstraint(box, m, [widthRule('240px')]);

      expect(finding?.rule).toBe('width-inert-on-inline');
      expect(finding?.fix?.declaration).toBe('display: inline-block');
    });

    it('does not fire for a replaced element, where width does apply', () => {
      document.body.innerHTML = '<img class="box" />';
      const img = document.querySelector('.box')!;
      const m = new FakeMeasurer().setStyle(img, { display: 'inline' }).setBox(img, { width: 240 });

      expect(widthConstraint(img, m, [widthRule('240px')])).toEqual([]);
    });
  });
});
