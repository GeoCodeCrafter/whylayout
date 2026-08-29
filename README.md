# whylayout

[![CI](https://github.com/GeoCodeCrafter/whylayout/actions/workflows/ci.yml/badge.svg)](https://github.com/GeoCodeCrafter/whylayout/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/licence-MIT-blue.svg)](LICENSE)

Click an element, find out why it looks like that.

**[Try it →](https://geocodecrafter.github.io/whylayout/)** — eight deliberately
broken layouts, hit <kbd>I</kbd> and click whatever looks wrong.

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

That's copied out of the demo page, not mocked up for the README.

---

## Why

DevTools tells you what the values are. It won't tell you why.

The Styles panel gives you a list of declarations with lines through the ones
that lost, and then you're on your own. Which is fine when the answer is "you
typoed the class name" and useless when it's `min-width: auto`, or a margin
collapsing through a parent, or some `transform` three levels up quietly turning
itself into a containing block.

The thing is, that list of causes is *short*. There are maybe a dozen things that
regularly make a box the wrong size, they're all in the spec, and they all have a
known fix. There's no reason you should have to rediscover them by bisecting your
stylesheet at half four on a Friday.

So: click the element, get a sentence.

## Try it

There's a [hosted demo](https://geocodecrafter.github.io/whylayout/), or run it
yourself:

```bash
npm install
npm run demo
```

Eight broken sections at <http://localhost:5173>, one per finding.

For real pages, build it and drag `dist/bookmarklet.js` into a bookmark — it's a
single file with no dependencies, so it works on any site without an extension or
a permission prompt.

You can also call it from a test, which is the other reason I split the engines
out from the UI:

```ts
import { explain } from 'whylayout';

const report = explain(document.querySelector('.card')!);
expect(report.findings.map((f) => f.rule)).not.toContain('flex-min-width-auto');
```

## What it can tell you

| Question | What you get back |
| --- | --- |
| Why is this element this width? | Whether `max-width` capped it or `min-width` raised it, with both numbers |
| Why did my `width` do nothing? | That it's inert on a non-replaced inline element, or which rule beat it |
| Why is there a gap here? | Which margin collapsed through which ancestor, and what would stop it |
| Why won't this flex item shrink? | `min-width: auto`, plus the measured width of the content holding it open |
| Why is my grid column so wide? | That `1fr` is really `minmax(auto, 1fr)`, and the `auto` is a floor |
| Why is my `z-index` ignored? | Whether it's inert on a static element, or trapped in an ancestor's stacking context |
| Why does the page scroll sideways? | The one element that doesn't fit its parent |
| Why isn't my `position: fixed` fixed? | The ancestor `transform`/`filter`/`contain` that became its containing block |

Each finding comes with the declaration to add and where to put it.

## The cascade bit

`explainCascade` resolves a single property and shows its working:

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

Look at that second line, because it catches people out. Normally an unlayered
rule beats a layered one, and a later `@layer` beats an earlier one. Add
`!important` and **both of those flip**: now layered beats unlayered, and the
*earlier* layer wins.

It sounds like a bug and it isn't. It's what lets a design system ship defaults
in a layer that you can freely override, while keeping the handful of rules it
genuinely needs to enforce. Took me a while to believe it, so the tool spells it
out rather than just printing a specificity score.

## Rules I've held myself to

**Never guess.** A finding only shows up if the engine can point at the computed
value or the CSSOM entry that proves it. If it can't prove the cause it says
nothing, because a confident wrong answer costs you more time than no answer.

**Never touch the page.** Everything is read-only. The one measurement that needs
to change something (min-content width) does it on a detached clone.

**Plain English first.** "Flex items won't shrink below their content" before
"`min-width: auto`". If you already knew the jargon you wouldn't be asking.

## How it's built

The engines never touch the DOM. They read the page through a `Measurer`
interface that gets injected, which sounds like architecture astronautics until
you realise jsdom does no layout at all — `getBoundingClientRect()` returns
zeroes there. Injecting the measurements is the only way to unit test any of this.

It also forced each engine to declare exactly what it needs to know, which is
what made the `evidence` field on every finding possible.

```
src/
  engine/     one file per finding, pure functions over measurements
  measure/    the real DOM measurer and the stylesheet walker
  report/     findings -> English
  ui/         the picker and panel
```

## Testing

104 unit tests over the engines, and 6 Playwright tests against the demo in a
real Chromium.

The e2e suite isn't there for completeness. The unit tests feed the engines
numbers I typed in myself, which catches logic errors and absolutely nothing
else — it can't tell me whether `getComputedStyle` really reports `auto` for an
untouched flex item, or whether my stylesheet walker finds any rules at all.

Both of those were broken at some point while the unit suite sat there green:

- The overflow rule blamed the wrong element. An oversized box shoves its later
  siblings further right than itself, so "furthest past the edge" finds a victim,
  not the cause. It's now "the deepest element that doesn't fit its own parent".
- The cascade walker collected **nothing at all**. Since CSS nesting shipped every
  `CSSStyleRule` has its own `cssRules` list, so my "is this a grouping rule?"
  check swallowed every ordinary rule on the way past. No error, no rules, no clue.
- The `max-width` check compared a border-box measurement against a content-box
  limit, so any capped element with padding on it looked inexplicable.

All three are pinned by regression tests now. None of them would have been found
without running the thing for real, which is most of why I bothered wiring up
Playwright.

## What it can't do yet

- Cross-origin stylesheets can't be read, so anything they affect is flagged
  `opaque` rather than answered from an incomplete cascade.
- Shadow DOM and iframes aren't traversed.
- Percentage and keyword widths aren't resolved. I'd rather say nothing than
  guess what `50%` came out as.
- No devtools panel yet — bookmarklet only. See [PLAN.md](PLAN.md).

## Licence

MIT © OpusDevs
