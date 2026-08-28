import type { Declaration, MatchedRule } from '../engine/cascade.js';

/**
 * Collecting the rules that match an element, from the live stylesheets.
 *
 * `getMatchedCSSRules` was removed from browsers years ago, so this walks
 * `document.styleSheets` and tests each selector with `element.matches()`.
 *
 * Cross-origin stylesheets throw on `.cssRules`. That is caught and recorded
 * rather than swallowed: a cascade answer computed from an incomplete set of
 * rules can be confidently wrong, which is worse than admitting the gap, so the
 * report is marked `opaque` when it happens.
 *
 * Not unit tested - it needs real stylesheets. Everything it feeds is pure and
 * covered; this only gathers.
 */

export interface Collected {
  rules: MatchedRule[];
  /** Stylesheets that could not be read, by href. */
  opaqueSheets: string[];
}

export function collectMatchedRules(element: Element): Collected {
  const rules: MatchedRule[] = [];
  const opaqueSheets: string[] = [];
  const layerOrder = new Map<string, number>();
  let order = 0;

  // Indexed loops throughout: CSSRuleList, StyleSheetList and
  // CSSStyleDeclaration all expose length/item but are not reliably iterable -
  // jsdom does not implement Symbol.iterator on any of them, and older browsers
  // vary. `length` and `item()` are the parts every implementation has.
  const visit = (list: CSSRuleList, layer: string | null): void => {
    for (let index = 0; index < list.length; index++) {
      const rule = list[index];
      if (!rule) continue;
      if (isLayerBlock(rule)) {
        const name = rule.name || `anonymous-${layerOrder.size}`;
        if (!layerOrder.has(name)) layerOrder.set(name, layerOrder.size);
        visit(rule.cssRules, name);
        continue;
      }

      // Style rules are handled BEFORE the grouping-rule branch below. Since CSS
      // nesting shipped, a CSSStyleRule carries its own `cssRules` list, so a
      // "does it have cssRules" test treats every ordinary rule as a group and
      // skips it - which collected exactly nothing until this was found by
      // running it against a real page.
      if (isStyleRule(rule)) {
        const matched = matchingSelector(element, rule.selectorText);
        if (matched) {
          rules.push({
            selector: matched,
            declarations: declarationsOf(rule.style),
            source: sourceOf(rule, order),
            layer,
            layerOrder: layer === null ? -1 : (layerOrder.get(layer) ?? -1),
            order: order++,
          });
        }

        // Nested rules inside it still need visiting.
        if (rule.cssRules?.length) visit(rule.cssRules, layer);
        continue;
      }

      // @media, @supports and @container wrap rules that still apply; a rule
      // inside a media query that does not match simply will not be listed as
      // matching, so recursing is safe.
      if ('cssRules' in rule && rule.cssRules) {
        visit(rule.cssRules as CSSRuleList, layer);
        continue;
      }
    }
  };

  for (let index = 0; index < document.styleSheets.length; index++) {
    const sheet = document.styleSheets[index];
    if (!sheet) continue;
    try {
      visit(sheet.cssRules, null);
    } catch {
      opaqueSheets.push(sheet.href ?? '(inline stylesheet)');
    }
  }

  const inline = (element as HTMLElement).style;
  if (inline && inline.length > 0) {
    rules.push({
      selector: 'style attribute',
      declarations: declarationsOf(inline),
      source: 'inline style',
      layer: null,
      layerOrder: -1,
      order: order++,
      inline: true,
    });
  }

  return { rules, opaqueSheets };
}

/**
 * A rule's selector list may contain several selectors; only the one that
 * actually matched should be scored, because specificity is per selector.
 */
function matchingSelector(element: Element, selectorText: string): string | null {
  for (const selector of splitSelectorList(selectorText)) {
    try {
      if (element.matches(selector)) return selector;
    } catch {
      // An unsupported selector is not a match, and must not abort the walk.
    }
  }
  return null;
}

/** Splits on commas that are not inside brackets, parentheses or strings. */
export function splitSelectorList(selectorText: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let current = '';

  for (const char of selectorText) {
    if (quote) {
      if (char === quote) quote = null;
      current += char;
      continue;
    }

    if (char === '"' || char === "'") quote = char;
    else if (char === '(' || char === '[') depth++;
    else if (char === ')' || char === ']') depth--;
    else if (char === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim() !== '') parts.push(current.trim());
  return parts;
}

function declarationsOf(style: CSSStyleDeclaration): Declaration[] {
  const declarations: Declaration[] = [];

  for (let index = 0; index < style.length; index++) {
    const property = style.item(index);
    if (!property) continue;
    declarations.push({
      property,
      value: style.getPropertyValue(property),
      important: style.getPropertyPriority(property) === 'important',
    });
  }

  return declarations;
}

function sourceOf(rule: CSSStyleRule, index: number): string {
  const href = rule.parentStyleSheet?.href;
  const name = href ? href.split('/').pop() : '<style>';
  return `${name}:${index}`;
}

function isStyleRule(rule: CSSRule): rule is CSSStyleRule {
  return rule.constructor.name === 'CSSStyleRule' || 'selectorText' in rule;
}

function isLayerBlock(rule: CSSRule): rule is CSSLayerBlockRule {
  return typeof CSSLayerBlockRule !== 'undefined' && rule instanceof CSSLayerBlockRule;
}
