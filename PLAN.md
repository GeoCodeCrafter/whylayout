# Build plan - whylayout

**Pitch:** `witr` for CSS. One narrow question, answered properly, demoed in ten
seconds.

**Why this one first:** highest star-per-hour of the six. It solves a daily
humiliation for every working web developer, the demo is a GIF of one click, and
shipping it proves cascade and layout-algorithm knowledge that most mid-level
front-end candidates cannot demonstrate.

---

## Architecture

```
src/
  engine/          pure functions: (element, CSSOM snapshot) -> Finding[]
    cascade.ts       specificity, layers, !important, winner + runners-up
    sizing.ts        the width/height constraint chain
    flex.ts          min-width:auto, basis vs width, shrink refusal
    grid.ts          track sizing, implicit tracks, auto placement
    margins.ts       collapse detection and the ancestor that would stop it
    stacking.ts      stacking context ancestry, z-index inertia
    containing.ts    transform/filter/contain breaking position: fixed
    overflow.ts      single widest offender causing horizontal scroll
  report/          Finding -> English, with the fix attached
  ui/              the inspector overlay (picker, panel, keyboard nav)
  entries/
    bookmarklet.ts   single-file IIFE, no deps, self-removing
    devtools.ts      MV3 panel wrapping the same engine
    index.ts         npm entry: explain(el) for tests and CI
```

The engine never touches the DOM beyond reading. The UI is a thin shell. That
split is what makes `explain()` usable inside Vitest, which is the second reason
anyone would install this.

## Milestones

### v0.1 - the GIF

- [ ] `explain(el)` returning `Finding[]` with `cause`, `evidence`, `fix`
- [ ] Three engines only: `flex.ts`, `margins.ts`, `overflow.ts` - the three most
      common real-world confusions
- [ ] Bookmarklet entry with element picker and a floating panel
- [ ] A demo page of deliberately broken layouts, one per finding
- [ ] Record the GIF: click a card, read the sentence, apply the fix

### v0.2 - credibility

- [ ] `cascade.ts` - winner and runners-up with specificity and `@layer` support
- [ ] `sizing.ts` - the full constraint chain
- [ ] `stacking.ts` and `containing.ts`
- [ ] Fixture suite: every finding has a page that provokes it and a page that
      must NOT provoke it (false-positive guard)
- [ ] Coverage thresholds in CI at 85%

### v0.3 - the install

- [ ] MV3 devtools panel
- [ ] npm package with `explain()` documented for assertions in tests
- [ ] `grid.ts`
- [ ] Docs site: one page per finding, each with a live broken example

### v1.0

- [ ] Chrome Web Store listing
- [ ] Firefox port
- [ ] Findings catalogue stable and versioned

## Hard problems, decided up front

**Specificity and layers.** `getMatchedCSSRules` is gone. Walk
`document.styleSheets`, match with `element.matches()`, compute specificity
locally, respect `@layer` order and `!important`. Cross-origin sheets throw on
`.cssRules` - catch that, mark the sheet `opaque`, and say so in the report
rather than silently producing a wrong winner.

**Proving a cause.** Every finding needs evidence a human can check. `flex.ts`
does not say "min-width: auto" merely because the element is a flex item; it
measures the widest unbreakable child and reports that measurement as the floor.

**Speculative probes.** Some causes are only provable by changing something and
re-measuring. Do that on a cloned subtree in an inert container, never on the
live page, and label the finding `speculative`.

**Shadow DOM and iframes.** Out of scope for v0.1. Detect and say "this element
is inside a shadow root, results may be incomplete" rather than being quietly
wrong.

## Launch checklist

- [ ] GIF above the fold in the README, under 3 MB
- [ ] Live demo page on GitHub Pages with the broken layouts and the bookmarklet
- [ ] Post to r/webdev, Hacker News (Show HN), Bluesky, Lobsters
- [ ] Title it as the user's own thought: "Why is this element 340px wide?"
