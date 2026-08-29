# Where this is going

v0.1 is out. Nine findings, all of them working against a real browser rather
than just against numbers I typed into a test.

What's left, roughly in the order I care about it.

## Next

- **A GIF at the top of the README.** Genuinely the highest-value thing left.
  Half the repos I looked at for inspiration won their audience on one image, and
  right now someone landing here has to clone and run it before they understand
  what it does.
- **A devtools panel.** The bookmarklet works everywhere and needs no permission
  grant, which is why it came first, but a panel is what people expect and it
  survives a page reload.

## After that

- **A findings catalogue.** One page per finding with a live broken example. Half
  the value here is educational and the README can't carry that on its own.
- **Shadow DOM.** Currently not traversed at all. It should at minimum say "this
  element is inside a shadow root, results may be incomplete" instead of
  quietly returning less than the whole picture.
- **More of the sizing chain.** Right now it catches `max-width` capping and
  `min-width` raising. It doesn't resolve percentages or keywords, and I'm not
  going to make it guess — but resolving them properly against the containing
  block is doable and would cover a lot more cases.
- **`justify-content` and `align-items` doing nothing** because the axis is the
  one people assume rather than the one it is. Extremely common, decidable.

## Ideas I'm not sure about

- **Firefox port.** Mostly a question of whether anyone asks.
- **A `--ci` mode** that fails a build when a page grows a horizontal scrollbar.
  Possibly useful, possibly a solution looking for a problem.
- **Explaining `position: sticky` not sticking.** The causes are enumerable
  (`overflow` on an ancestor, no threshold set, parent too short) but proving
  which one applies is harder than it looks, and a wrong answer here would be
  worse than none.

## Notes to self

**Specificity parsing has limits.** The parser handles `:is()`, `:not()`, `:has()`
and `:where()`, and counts conservatively for shapes it can't decompose. It is
not a full CSS grammar and shouldn't pretend to be. If it starts getting selector
maths wrong, that's the place to look.

**The demo is the fixture.** Every engine was developed against a section on that
page. Keep it that way — twice now a fixture failed to provoke a finding and the
engine turned out to be right, which is only a useful signal if the demo is
honest about what it's demonstrating.

**Don't let the coverage number drive anything.** The excluded files are excluded
because mocking a browser would only prove the mocks got called. That's what the
Playwright suite is for.
