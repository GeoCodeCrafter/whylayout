# Changelog

Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versioning is [semver](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Added

- **`align-items` / `justify-content` with no free space.** The declaration is
  fine and does nothing, because the container is already exactly its content's
  size on that axis. Reported as "nothing to do here yet" rather than as a
  mistake, since it starts working the moment the container gets a height.
- Shadow roots are now detected. Findings inside one are downgraded to `opaque`,
  because the component's stylesheet isn't in `document.styleSheets` and any
  cascade answer would be built from a fraction of the rules.

### Fixed

- The new alignment engine measured free space against the border box, so a 1px
  border read as 2px of spare room and the finding never fired on a real page.
  Same mistake the `max-width` check made earlier — content box versus border box
  is evidently a trap in this codebase.


## [0.1.0] - 2026-08-28

First release. Nine findings, a bookmarklet, and a demo page that provokes every
one of them.

### Added

- `explain(element)` — runs the element-scoped engines and hands back findings
  with the evidence behind each one.
- `explainCascade(element, property)` — resolves one property and shows what
  lost: specificity, `!important`, inline styles and `@layer`, including the bit
  where `!important` reverses the layer order.
- `explainOverflow(root)` — names the single element responsible for a sideways
  scroll.
- Engines for: flex items refusing to shrink, `1fr` grid tracks doing the same,
  margins collapsing through a parent, horizontal overflow, cascade resolution,
  `max-width`/`min-width` binding a declared width, `width` being inert on inline
  elements, z-index inert on static elements or trapped in a stacking context,
  and `position: fixed` caught by an ancestor's containing block.
- A bookmarklet — one file, no dependencies, works on any site.
- Demo page with eight deliberately broken sections.
- Playwright suite running against that page in real Chromium.

### Fixed while building it

All of these were found by running the thing rather than by the unit tests, which
were green throughout. Each has a regression test now.

- **The overflow rule blamed the wrong element.** An oversized box pushes its
  later siblings further right than itself, so "furthest past the edge" picks a
  victim. Now it's "deepest element that doesn't fit its own parent".
- **The cascade walker collected nothing at all.** Since CSS nesting shipped,
  every `CSSStyleRule` carries its own `cssRules` list, so my check for grouping
  rules swallowed every ordinary rule on the way past. Silent — no rules, no
  error.
- **`max-width` compared a border-box measurement to a content-box limit**, so a
  capped element with padding looked inexplicable.
- **`CSSStyleDeclaration`, `CSSRuleList` and `StyleSheetList` aren't reliably
  iterable.** jsdom implements none of their iterators. All read by index now.
- **The inspector appended to `cssText` on every pointer move**, growing the
  string until the page crawled.
- **`documentElement.clientWidth` can be 0** before layout settles or in an
  embedded view, which quietly suppressed every overflow finding. Falls back to
  `innerWidth`.

Two demo fixtures also failed to provoke the flex finding, both times for
spec-correct reasons — hyphens in the URL made it breakable, then a specified
width made the automatic minimum size the *smaller* of the specified and content
suggestions. The engine was right both times.

### Not there yet

- Cross-origin stylesheets can't be read. Anything they touch is flagged
  `opaque` rather than answered from a partial cascade.
- No shadow DOM or iframe traversal.
- Percentage and keyword widths aren't resolved — I'd rather say nothing than
  guess what `50%` came out as.

[0.1.0]: https://github.com/GeoCodeCrafter/whylayout/releases/tag/v0.1.0
