import { toggleInspector } from '../ui/inspector.js';

/**
 * The bookmarklet entry: one self-contained IIFE, no dependencies, no install,
 * works on any page. Running it twice closes it again, because a bookmarklet has
 * no other way to be dismissed.
 */
toggleInspector();
