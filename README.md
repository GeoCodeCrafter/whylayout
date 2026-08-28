# whylayout

[![CI](https://github.com/GeoCodeCrafter/whylayout/actions/workflows/ci.yml/badge.svg)](https://github.com/GeoCodeCrafter/whylayout/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/licence-MIT-blue.svg)](LICENSE)

Click an element. Get a sentence explaining why it looks like that.

```
div.card will not shrink below 426.3px. Flex items start at min-width: auto,
which refuses to go narrower than their widest unbreakable content.

  - div.row is display: flex, so div.card is a flex item
  - min-width resolves to auto, the initial value for a flex item
  - width is 426.3px, and the widest unbreakable content inside is 426.3px
    - the content is the floor
  - the flex line overflows div.row by 126.5px

  Fix: min-width: 0  on  div.card
       Or overflow-wrap: anywhere on the content, if the long word should
       break instead.
```

That is real output, copied from the demo page, not an illustration.

---

## Why this exists

DevTools shows you the cascade. It does not tell you the answer.

The Styles panel is a list of declarations with lines through the losers. Working
out *why the box ended up that size* is left entirely to you, and it is the
question every web developer actually has. `min-width: auto` on flex items,
collapsing margins, a `transform` quietly creating a containing block, the one
`overflow-x` culprit in a 400-node tree - these are known, enumerable causes with
known fixes, and nothing in the browser will name them for you.

whylayout names them. It walks the same information DevTools has and turns it
into a plain-English explanation with the fix attached.

## Install

Nothing to install - drag the bookmarklet to your bar and click any element.

Or load it as a devtools panel:

```bash
npm run build
# Chrome/Edge: load unpacked from dist/extension
```

Or call it programmatically, in a test:

```ts
import { explain } from 'whylayout';

const report = explain(document.querySelector('.card')!);
expect(report.findings.map((f) => f.rule)).not.toContain('flex-min-width-auto');
```

## What it explains

| Question | Answer it gives |
| --- | --- |
| Why is this element this width? | The constraint that bound it - `max-width` capping or `min-width` raising the width you declared |
| Why did my `width` do nothing? | That it is inert on a non-replaced inline element, or which rule beat it |
| Why is there a gap here? | Which margin collapsed through which ancestor, and what would stop it |
| Why won't this flex item shrink? | `min-width: auto` and the measured unbreakable content setting the floor |
| Why is my `z-index` ignored? | Whether it is inert on a static element, or trapped in an ancestor's stacking context |
| Why does the page scroll sideways? | The one element that does not fit its parent, not a list of suspects |
| Why is this `position: fixed` element not fixed? | The ancestor `transform`/`filter`/`contain` that made it a containing block |
| Which rule won? | Winner and runners-up with computed specificity, layer, and `!important` |

Every finding carries a `fix` - the declaration to add and where to add it.

All eight work today, and each has a section on the demo page that provokes it.
Still to come, in [PLAN.md](PLAN.md): the devtools panel, a grid engine, and a
docs site.

## The cascade, including the part that runs backwards

`explainCascade` resolves one property and shows what lost:

```js
whylayout.explainCascade(document.querySelector('.contested'), 'color');
```

```
color on h3#contested.contested is rebeccapurple, from .contested. 3 other declarations lost.

  - color: rebeccapurple !important from .contested (specificity 0-1-0, @layer base)   [broken.css]
  - beaten: color: seagreen !important from h3.contested - it is in @layer theme and the
    winner is in @layer base - for !important declarations, earlier layers win and layered
    beats unlayered
  - beaten: color: darkorange from #contested - the winner is !important
  - beaten: color: crimson from .contested - the winner is !important
```

That third line is the reason this engine exists rather than a specificity
calculator. For a normal declaration, unlayered author styles beat layered ones
and a later `@layer` beats an earlier one. For `!important`, **both of those
reverse**: layered beats unlayered, and the *earlier* layer wins. It is
deliberate - it lets a design system publish overridable defaults in a layer and
still enforce the few rules it must - and it is the single most surprising rule
in the modern cascade.

## The rules that are not negotiable

1. **No false explanations.** A finding is emitted only when the engine can point
   at the CSSOM entry or computed value that proves it. Where it cannot prove a
   cause it says so instead of guessing.
2. **Read-only.** The page is never mutated. Diagnosis that changes the patient is
   not diagnosis. Probes that must mutate run on a cloned subtree and are
   labelled `speculative`.
3. **No build step for the user.** The bookmarklet is one self-contained file,
   works on any site, and needs no extension, no npm, and no permission grant.
4. **Plain English, jargon second.** "Flex items refuse to shrink below their
   content" before "`min-width: auto`", never the other way round.

## Running the demo

```bash
npm install
npm run demo
```

Seven deliberately broken sections, one per finding, at
<http://localhost:5173>. Press <kbd>I</kbd> and click the offending element.

## Status

v0.1. All eight findings work and are verified against a real browser, not only
against unit tests - which mattered, because running it for real is what caught
the overflow rule naming a victim instead of a culprit, a cascade collector that
silently gathered nothing once CSS nesting gave every style rule a `cssRules`
list, and a `max-width` comparison that measured the border box against a
content-box limit.

97 tests, 98.6% statements. See [PLAN.md](PLAN.md) for what is next and
[CHANGELOG.md](CHANGELOG.md) for what changed.

## Licence

MIT (c) OpusDevs
