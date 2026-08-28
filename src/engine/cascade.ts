import type { Finding } from '../types.js';
import { describe } from './flex.js';

/**
 * Which rule won, and why.
 *
 * DevTools shows the losers struck through and leaves the reasoning to you. The
 * reasoning is the part worth automating, because the modern cascade has steps
 * most people have never had to think about - and one of them runs backwards.
 *
 * For a normal declaration, unlayered author styles beat layered ones, and a
 * later `@layer` beats an earlier one. For an `!important` declaration both of
 * those reverse: layered beats unlayered, and an *earlier* layer wins. That
 * inversion is deliberate in the spec - it lets a design system publish
 * overridable defaults in a layer and still keep the few rules it must enforce -
 * and it is the single most surprising thing in the cascade.
 */

export interface Declaration {
  property: string;
  value: string;
  important: boolean;
}

export interface MatchedRule {
  /** The selector that matched this element, not the whole rule's selector list. */
  selector: string;
  declarations: Declaration[];
  /** Where it came from, e.g. `main.css:47`. */
  source: string;
  /** The `@layer` name, or null for unlayered author styles. */
  layer: string | null;
  /** Position of that layer in declared order. -1 when unlayered. */
  layerOrder: number;
  /** Position of the rule in document order. */
  order: number;
  /** True for the element's own style attribute. */
  inline?: boolean;
}

export interface CascadeOutcome {
  property: string;
  winner: { rule: MatchedRule; declaration: Declaration } | null;
  runnersUp: { rule: MatchedRule; declaration: Declaration; lostBecause: string }[];
}

/** A source of matched rules for an element. Injected so it can be faked. */
export type CascadeSource = (element: Element) => MatchedRule[];

interface Entry {
  rule: MatchedRule;
  declaration: Declaration;
}

/**
 * Resolves one property against the matched rules, newest cascade rules first.
 * Returns the winner and every runner-up with the reason it lost.
 */
export function resolve(property: string, rules: MatchedRule[]): CascadeOutcome {
  const entries: Entry[] = [];

  for (const rule of rules) {
    for (const declaration of rule.declarations) {
      if (declaration.property === property) entries.push({ rule, declaration });
    }
  }

  if (entries.length === 0) return { property, winner: null, runnersUp: [] };

  const sorted = [...entries].sort((a, b) => compare(b, a));
  const winner = sorted[0]!;

  return {
    property,
    winner: { rule: winner.rule, declaration: winner.declaration },
    runnersUp: sorted.slice(1).map((entry) => ({
      rule: entry.rule,
      declaration: entry.declaration,
      lostBecause: reasonItLost(entry, winner),
    })),
  };
}

/** Positive when `a` beats `b`. */
export function compare(a: Entry, b: Entry): number {
  if (a.declaration.important !== b.declaration.important) {
    return a.declaration.important ? 1 : -1;
  }

  const inlineA = a.rule.inline ? 1 : 0;
  const inlineB = b.rule.inline ? 1 : 0;
  if (inlineA !== inlineB) return inlineA - inlineB;

  const layerA = layerRank(a.rule, a.declaration.important);
  const layerB = layerRank(b.rule, b.declaration.important);
  if (layerA !== layerB) return layerA < layerB ? -1 : 1;

  const specificityDiff = compareSpecificity(specificity(a.rule.selector), specificity(b.rule.selector));
  if (specificityDiff !== 0) return specificityDiff;

  return a.rule.order - b.rule.order;
}

/**
 * Higher wins. Unlayered normal declarations sit above every layer; for
 * important declarations the whole axis inverts, so unlayered sinks below every
 * layer and earlier layers outrank later ones.
 */
function layerRank(rule: MatchedRule, important: boolean): number {
  const unlayered = rule.layerOrder < 0;

  if (!important) return unlayered ? Number.POSITIVE_INFINITY : rule.layerOrder;
  return unlayered ? Number.NEGATIVE_INFINITY : -rule.layerOrder;
}

function reasonItLost(loser: Entry, winner: Entry): string {
  if (winner.declaration.important && !loser.declaration.important) {
    return 'the winner is !important';
  }
  if (winner.rule.inline && !loser.rule.inline) {
    return 'the winner is an inline style attribute';
  }

  const loserLayer = layerRank(loser.rule, loser.declaration.important);
  const winnerLayer = layerRank(winner.rule, winner.declaration.important);
  if (loserLayer !== winnerLayer) {
    const detail = loser.declaration.important
      ? 'for !important declarations, earlier layers win and layered beats unlayered'
      : 'for normal declarations, unlayered beats layered and later layers win';
    return `it is in ${describeLayer(loser.rule)} and the winner is in ${describeLayer(winner.rule)} - ${detail}`;
  }

  const loserSpecificity = specificity(loser.rule.selector);
  const winnerSpecificity = specificity(winner.rule.selector);
  if (compareSpecificity(loserSpecificity, winnerSpecificity) !== 0) {
    return `specificity ${format(loserSpecificity)} loses to ${format(winnerSpecificity)}`;
  }

  return 'same specificity, and the winner comes later in the document';
}

function describeLayer(rule: MatchedRule): string {
  return rule.layerOrder < 0 ? 'no layer' : `@layer ${rule.layer}`;
}

export type Specificity = [number, number, number];

/**
 * Counts a selector as [ids, classes, types].
 *
 * `:is()`, `:not()` and `:has()` take the specificity of their most specific
 * argument; `:where()` contributes nothing. Pseudo-elements count as types.
 * This is a working parser rather than a complete CSS grammar - the shapes it
 * cannot decompose are counted conservatively rather than silently dropped.
 */
export function specificity(selector: string): Specificity {
  let working = selector.trim();
  const total: Specificity = [0, 0, 0];

  // Functional pseudo-classes first: their arguments are scored recursively and
  // the whole construct is then removed so the outer scan cannot double count.
  const functional = /:(is|not|has|where|matches|any)\(([^()]*(?:\([^()]*\)[^()]*)*)\)/gi;
  working = working.replace(functional, (_match, name: string, args: string) => {
    if (name.toLowerCase() === 'where') return ' ';

    const best = args
      .split(',')
      .map((part) => specificity(part))
      .reduce<Specificity>((max, current) => (compareSpecificity(current, max) > 0 ? current : max), [0, 0, 0]);

    total[0] += best[0];
    total[1] += best[1];
    total[2] += best[2];
    return ' ';
  });

  // Strings and remaining parenthesised content cannot contribute.
  working = working.replace(/"[^"]*"|'[^']*'/g, ' ');

  total[0] += count(working, /#[\w-]+/g);
  total[1] += count(working, /\.[\w-]+/g) + count(working, /\[[^\]]*\]/g);
  // Pseudo-elements (::before) are types; pseudo-classes (:hover) are classes.
  total[1] += count(working, /(?<!:):(?!:)[\w-]+/g);
  total[2] += count(working, /::[\w-]+/g);
  total[2] += count(working, /(?:^|[\s>+~(])([a-zA-Z][\w-]*)/g);

  return total;
}

function count(text: string, pattern: RegExp): number {
  return (text.match(pattern) ?? []).length;
}

export function compareSpecificity(a: Specificity, b: Specificity): number {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i]! - b[i]! > 0 ? 1 : -1;
  }
  return 0;
}

function format(value: Specificity): string {
  return value.join('-');
}

/**
 * Turns a resolution into a finding. Emitted for a property the caller asked
 * about, so it is informational rather than a fault - "which rule won" is a
 * question, not a bug.
 */
export function explainProperty(
  element: Element,
  property: string,
  rules: MatchedRule[],
): Finding[] {
  const outcome = resolve(property, rules);
  if (!outcome.winner) return [];

  const { rule, declaration } = outcome.winner;
  const evidence: Finding['evidence'] = [
    {
      kind: 'declaration',
      detail: `${property}: ${declaration.value}${declaration.important ? ' !important' : ''} from ${rule.selector} (specificity ${format(specificity(rule.selector))}${rule.layerOrder < 0 ? '' : `, @layer ${rule.layer}`})`,
      source: rule.source,
    },
  ];

  for (const loser of outcome.runnersUp.slice(0, 4)) {
    evidence.push({
      kind: 'declaration',
      detail: `beaten: ${property}: ${loser.declaration.value}${loser.declaration.important ? ' !important' : ''} from ${loser.rule.selector} - ${loser.lostBecause}`,
      source: loser.rule.source,
    });
  }

  const summary =
    outcome.runnersUp.length === 0
      ? `${property} on ${describe(element)} comes from ${rule.selector}, and nothing else sets it.`
      : `${property} on ${describe(element)} is ${declaration.value}, from ${rule.selector}. ` +
        `${outcome.runnersUp.length} other declaration${outcome.runnersUp.length === 1 ? '' : 's'} lost.`;

  return [
    {
      rule: 'cascade-winner',
      summary,
      evidence,
      confidence: 'proved',
    },
  ];
}
