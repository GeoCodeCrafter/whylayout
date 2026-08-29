import type * as whylayout from '../src/index.js';

// The demo page hangs the whole API off `window` so the console is usable.
declare global {
  interface Window {
    whylayout: typeof whylayout;
  }
}

export {};
