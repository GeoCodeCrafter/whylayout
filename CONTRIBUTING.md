# Contributing

Early days, so the most useful thing you can do is point it at a page that
confuses you and tell me where it lied.

## Setup

```bash
npm install
npm test          # unit tests
npm run demo      # the broken-layouts page on :5173
npm run test:e2e  # Playwright against that page
```

## Adding a finding

Findings live one per file in `src/engine/`. Each is a plain function taking an
element and a `Measurer`, returning `Finding[]`.

The `Measurer` indirection exists because jsdom does no layout —
`getBoundingClientRect` returns zeroes there — so an engine that calls the DOM
directly can't be tested at all. Take measurements through the interface and you
can hand it whatever numbers the test needs.

A new finding needs three things:

1. **A section on the demo page that provokes it.** If you can't write one, the
   conditions probably aren't as tight as you think they are.
2. **A test that it fires, and tests that it doesn't.** The false-positive cases
   matter more. Look at `tests/flex.test.ts` — most of it is scenarios that have
   to stay quiet.
3. **`evidence` a person can check for themselves.** Not "this is a flex item so
   it's probably min-width", but the measurement you actually took.

## Things I'd push back on

These are the reasons the tool is worth using, so a change that breaks one is a
different tool rather than an improvement.

1. **No guessing.** If the cause can't be proved from what's readable, say
   nothing. A confident wrong answer costs more time than silence does.
2. **Never mutate the page.** Read-only, always. If a measurement genuinely needs
   to change something, clone the subtree and mark the finding `speculative`.
3. **The bookmarklet stays dependency-free.** One file, paste it into a bookmark,
   works anywhere.
4. **Plain English before jargon.** Anyone who already knew the term wasn't going
   to be asking.

There are tests behind all four. If you find yourself editing those to make a
change pass, that's worth a conversation first.

## Pull requests

One change at a time, and a bug fix should come with the test that would have
caught it. CI runs typecheck, unit tests with coverage thresholds, a build and
the e2e suite — the same commands as above, no surprises.
