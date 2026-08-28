# whylayout

[![CI](https://github.com/GeoCodeCrafter/whylayout/actions/workflows/ci.yml/badge.svg)](https://github.com/GeoCodeCrafter/whylayout/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/licence-MIT-blue.svg)](LICENSE)

Click an element. Get a sentence explaining why it looks like that.

```
.card is 340px wide, not the 240px you asked for.

  width: 240px          main.css:47      applied
  min-width: auto       (initial)        <- this is why

  .card is a flex item. Flex items default to min-width: auto, which
  refuses to shrink below the widest unbreakable content - the 340px
  URL in .card__meta. Set min-width: 0 on .card to allow shrinking.
```

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
| Why is this element this width? | The sizing chain: specified, constrained, available - and which link bound it |
| Why did my `width` do nothing? | The property that overrode it, or the layout mode that ignores it |
| Why is there a gap here? | Which margin collapsed into which, and the ancestor that would stop it |
| Why won't this flex item shrink? | `min-width: auto` and the unbreakable content setting the floor |
| Why is my `z-index` ignored? | The ancestor that created the stacking context, and what created it |
| Why does the page scroll sideways? | The single widest offending node, not a list of suspects |
| Why is this `position: fixed` element not fixed? | The ancestor `transform`/`filter`/`contain` that made it a containing block |
| Which rule won? | Winner and runners-up with computed specificity, layer, and `!important` |

Every finding carries a `fix` - the declaration to add and where to add it.

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

## Status

Pre-alpha. See [PLAN.md](PLAN.md) for the build order.

## Licence

MIT (c) OpusDevs
