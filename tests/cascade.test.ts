import { describe, expect, it } from 'vitest';
import {
  compareSpecificity,
  explainProperty,
  resolve,
  specificity,
  type MatchedRule,
} from '../src/engine/cascade.js';

let order = 0;

function rule(
  selector: string,
  value: string,
  options: Partial<MatchedRule> & { important?: boolean } = {},
): MatchedRule {
  const { important = false, ...rest } = options;
  return {
    selector,
    declarations: [{ property: 'color', value, important }],
    source: `${selector}.css:1`,
    layer: null,
    layerOrder: -1,
    order: order++,
    ...rest,
  };
}

describe('specificity', () => {
  it.each([
    ['div', [0, 0, 1]],
    ['.card', [0, 1, 0]],
    ['#main', [1, 0, 0]],
    ['div.card', [0, 1, 1]],
    ['#main .card p', [1, 1, 1]],
    ['a:hover', [0, 1, 1]],
    ['[data-open]', [0, 1, 0]],
    ['p::before', [0, 0, 2]],
    ['ul > li + li ~ span', [0, 0, 4]],
    ['*', [0, 0, 0]],
  ])('%s is %s', (selector, expected) => {
    expect(specificity(selector)).toEqual(expected);
  });

  describe('functional pseudo-classes', () => {
    it(':where contributes nothing', () => {
      expect(specificity(':where(#main) .card')).toEqual([0, 1, 0]);
    });

    it(':is takes its most specific argument', () => {
      expect(specificity(':is(#main, .card) p')).toEqual([1, 0, 1]);
    });

    it(':not takes its most specific argument', () => {
      expect(specificity('p:not(.hidden)')).toEqual([0, 1, 1]);
    });

    it('handles nesting without double counting', () => {
      expect(specificity(':is(.a, :where(#b))')).toEqual([0, 1, 0]);
    });
  });

  it('does not count text inside attribute string values', () => {
    expect(specificity('[data-role="card.primary"]')).toEqual([0, 1, 0]);
  });
});

describe('compareSpecificity', () => {
  it('compares left to right, so one id beats any number of classes', () => {
    expect(compareSpecificity([1, 0, 0], [0, 9, 9])).toBe(1);
    expect(compareSpecificity([0, 1, 0], [0, 1, 0])).toBe(0);
  });
});

describe('resolve', () => {
  it('gives the winner and every runner-up', () => {
    const outcome = resolve('color', [rule('.card', 'red'), rule('#main', 'blue')]);

    expect(outcome.winner?.declaration.value).toBe('blue');
    expect(outcome.runnersUp).toHaveLength(1);
    expect(outcome.runnersUp[0]?.lostBecause).toContain('specificity 0-1-0 loses to 1-0-0');
  });

  it('returns nothing when no rule sets the property', () => {
    expect(resolve('margin-top', [rule('.card', 'red')]).winner).toBeNull();
  });

  it('breaks a specificity tie by document order', () => {
    const outcome = resolve('color', [rule('.a', 'first'), rule('.b', 'second')]);

    expect(outcome.winner?.declaration.value).toBe('second');
    expect(outcome.runnersUp[0]?.lostBecause).toContain('comes later in the document');
  });

  it('lets !important beat higher specificity', () => {
    const outcome = resolve('color', [rule('#main', 'blue'), rule('.card', 'red', { important: true })]);

    expect(outcome.winner?.declaration.value).toBe('red');
    expect(outcome.runnersUp[0]?.lostBecause).toContain('!important');
  });

  it('lets an inline style beat a more specific rule', () => {
    const inline = rule('style attribute', 'green', { inline: true });
    const outcome = resolve('color', [rule('#main', 'blue'), inline]);

    expect(outcome.winner?.declaration.value).toBe('green');
    expect(outcome.runnersUp[0]?.lostBecause).toContain('inline style attribute');
  });

  it('lets !important beat an inline style', () => {
    const inline = rule('style attribute', 'green', { inline: true });
    const outcome = resolve('color', [inline, rule('.card', 'red', { important: true })]);

    expect(outcome.winner?.declaration.value).toBe('red');
  });

  describe('layers', () => {
    it('lets unlayered beat a layer for a normal declaration', () => {
      const outcome = resolve('color', [
        rule('#main', 'layered', { layer: 'base', layerOrder: 0 }),
        rule('.card', 'unlayered'),
      ]);

      expect(outcome.winner?.declaration.value).toBe('unlayered');
      expect(outcome.runnersUp[0]?.lostBecause).toContain('unlayered beats layered');
    });

    it('lets a later layer beat an earlier one for a normal declaration', () => {
      const outcome = resolve('color', [
        rule('#main', 'first', { layer: 'base', layerOrder: 0 }),
        rule('.card', 'second', { layer: 'theme', layerOrder: 1 }),
      ]);

      expect(outcome.winner?.declaration.value).toBe('second');
    });

    /**
     * The inversion. For !important the layer axis runs backwards, which is the
     * single most surprising rule in the modern cascade and the reason this
     * engine exists rather than a specificity calculator.
     */
    it('reverses the layer order for !important: the earlier layer wins', () => {
      const outcome = resolve('color', [
        rule('.a', 'first', { layer: 'base', layerOrder: 0, important: true }),
        rule('#b', 'second', { layer: 'theme', layerOrder: 1, important: true }),
      ]);

      expect(outcome.winner?.declaration.value).toBe('first');
      expect(outcome.runnersUp[0]?.lostBecause).toContain('earlier layers win');
    });

    it('lets a layered !important beat an unlayered !important', () => {
      const outcome = resolve('color', [
        rule('#main', 'unlayered', { important: true }),
        rule('.card', 'layered', { layer: 'base', layerOrder: 0, important: true }),
      ]);

      expect(outcome.winner?.declaration.value).toBe('layered');
    });
  });
});

describe('explainProperty', () => {
  it('names the winner, its source and what it beat', () => {
    const element = document.createElement('div');
    element.className = 'card';

    const [finding] = explainProperty(element, 'color', [
      rule('.card', 'red'),
      rule('#main', 'blue'),
    ]);

    expect(finding?.rule).toBe('cascade-winner');
    expect(finding?.summary).toContain('1 other declaration');
    expect(finding?.evidence[0]?.detail).toContain('specificity 1-0-0');
    expect(finding?.evidence[1]?.detail).toContain('beaten');
  });

  it('says so when nothing competes', () => {
    const element = document.createElement('div');

    const [finding] = explainProperty(element, 'color', [rule('.card', 'red')]);

    expect(finding?.summary).toContain('nothing else sets it');
  });

  it('returns nothing for a property no rule sets', () => {
    expect(explainProperty(document.createElement('div'), 'z-index', [rule('.a', 'red')])).toEqual([]);
  });
});
