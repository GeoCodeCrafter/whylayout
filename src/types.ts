/**
 * A single explained cause. Every finding must be provable: `evidence` points at
 * the CSSOM entry or the measurement that establishes the cause. Findings that
 * cannot be proved are not emitted.
 */
export interface Finding {
  /** Stable identifier, e.g. 'flex-min-width-auto'. Part of the public API. */
  rule: string;
  /** One sentence, plain English, jargon second. */
  summary: string;
  /** What proves it: a matched rule, a measurement, a computed value. */
  evidence: Evidence[];
  /** The declaration to add, and where. */
  fix?: Fix;
  /**
   * 'proved'      - established from read-only inspection.
   * 'speculative' - established by re-measuring a cloned subtree.
   * 'opaque'      - a cross-origin stylesheet prevented certainty.
   */
  confidence: 'proved' | 'speculative' | 'opaque';
}

export interface Evidence {
  kind: 'declaration' | 'measurement' | 'computed' | 'ancestry';
  detail: string;
  /** e.g. 'main.css:47' */
  source?: string;
}

export interface Fix {
  declaration: string;
  target: string;
  note?: string;
}

export interface Report {
  element: Element;
  findings: Finding[];
  /**
   * Stylesheets that could not be read, by href. Cross-origin sheets throw on
   * `.cssRules`, and a cascade answer computed without them can be confidently
   * wrong - so their presence downgrades every finding to `opaque` rather than
   * being silently ignored.
   */
  opaqueSheets?: string[];
  /**
   * True when the element sits inside a shadow root. Its component stylesheet is
   * not in `document.styleSheets`, so any cascade answer would be built from a
   * fraction of the rules. Findings are downgraded to `opaque` when this is set.
   */
  inShadowRoot?: boolean;
}
