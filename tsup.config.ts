import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    treeshake: true,
  },
  {
    // The bookmarklet has to be one file with nothing to install, so it is
    // bundled as an IIFE and minified hard. Size is a feature here: it ends up
    // pasted into a browser's bookmark field.
    entry: { bookmarklet: 'src/entries/bookmarklet.ts' },
    format: ['iife'],
    minify: true,
    sourcemap: false,
    dts: false,
    outExtension: () => ({ js: '.js' }),
  },
]);
