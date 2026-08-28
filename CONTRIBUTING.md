# Contributing

Thanks for looking. This is early - the fastest way to help is to try it and
tell me where it lied to you.

## Getting set up

```bash
npm install
npm test
npm run demo
```

## The rules that are not negotiable

1. **No false explanations.** A finding is emitted only when the engine can
   prove it. Unprovable causes are reported as unprovable.
2. **Read-only.** The inspected page is never mutated. Probes that must mutate
   run on a cloned subtree and are labelled `speculative`.
3. **No build step for the user.** The bookmarklet stays one self-contained file
   with no dependencies.
4. **Plain English, jargon second.**

Each of these has tests behind it. If you find yourself editing those tests to
make a change pass, stop and reconsider the change.

## Pull requests

- One change per pull request.
- A bug fix comes with the test that would have caught it.
- Run the checks before pushing; CI runs the same ones.
