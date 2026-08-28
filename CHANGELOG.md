# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-08-28

First release. Eight findings, all verified against a real browser.

### Added

- **`explain(element)`** - runs every element-scoped engine and returns findings
  with the evidence that proves each one.
- **`explainCascade(element, property)`** - resolves one property, naming the
  winning rule and every runner-up with the reason it lost. Handles specificity,
  `!important`, inline styles, and `@layer` - including the inversion where
  `!important` reverses the layer order.
- **`explainOverflow(root)`** - names the single element responsible for a
  sideways scroll.
- **Engines**: flex shrink refusal (`min-width: auto`), margin collapse through a
  parent, horizontal overflow, cascade resolution, width constraints
  (`max-width`/`min-width` binding, `width` inert on inline elements), z-index
  (inert on static, or trapped in an ancestor's stacking context), and
  `position: fixed` trapped by an ancestor's containing block.
- **Bookmarklet** - one self-contained file, no install, works on any site.
- **Demo page** with seven deliberately broken sections, one per finding.
- **`Measurer` interface** - engines read the page through an injected measurer,
  so every heuristic is unit testable without a browser.

### Fixed during development

These were all found by running the tool against a real page rather than by the
test suite, and each is now pinned by a regression test.

- The overflow rule named a **victim rather than a culprit**. An oversized box
  pushes its later siblings further right than itself, so "furthest past the
  edge" is the wrong test. A culprit is an element that does not fit inside its
  own parent; the deepest such element wins.
- The cascade collector **gathered nothing at all**. Since CSS nesting shipped,
  every `CSSStyleRule` carries its own `cssRules` list, so testing for that
  property treated every ordinary rule as a grouping rule and skipped it.
- The `max-width` check **compared a border-box measurement against a
  content-box limit**, so a capped element with padding looked unexplainable.
- `CSSStyleDeclaration`, `CSSRuleList` and `StyleSheetList` are **not reliably
  iterable** - jsdom implements none of their iterators. All three are now read
  by index.
- The inspector overlay **appended to `cssText` on every pointer move**, growing
  the string without bound until the page crawled.
- `documentElement.clientWidth` can be `0` before layout settles or in an
  embedded view, which silently suppressed every overflow finding. It now falls
  back to `window.innerWidth`.

### Known limitations

- Cross-origin stylesheets cannot be read, so any report affected by one is
  marked `opaque` rather than being quietly computed from an incomplete cascade.
- Shadow DOM and same-origin iframes are not traversed.
- Percentage and keyword widths are not resolved, so no width finding is offered
  for them - guessing what `50%` resolved to would be exactly the confident,
  wrong answer this tool exists to avoid.

[0.1.0]: https://github.com/GeoCodeCrafter/whylayout/releases/tag/v0.1.0
