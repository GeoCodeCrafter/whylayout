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
  },
});
