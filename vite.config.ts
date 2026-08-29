import { defineConfig } from 'vite';

// Only used to build the demo for GitHub Pages. The library itself is built by
// tsup; the demo is a plain page that imports the source directly.
export default defineConfig({
  root: 'demo',
  // Project pages are served from /<repo>/, so relative asset URLs are the only
  // thing that works both there and on localhost.
  base: './',
  build: {
    outDir: '../dist-demo',
    emptyOutDir: true,
    target: 'es2022',
    // Leave the CSS alone. The minifier rewrites `rebeccapurple` to
    // `rgb(102, 51, 153)`, and since the whole point of the cascade section is
    // reading your own declarations back, the deployed demo should show what
    // was actually written.
    cssMinify: false,
  },
});
