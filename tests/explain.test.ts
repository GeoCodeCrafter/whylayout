import { describe, expect, it } from 'vitest';
import { explain } from '../src/index.js';

describe('explain', () => {
  it('returns a report for an element', () => {
    const el = document.createElement('div');
    document.body.append(el);

    const report = explain(el);

    expect(report.element).toBe(el);
    expect(report.findings).toEqual([]);
  });

  it('never mutates the element it inspects', () => {
    const el = document.createElement('div');
    el.setAttribute('style', 'width: 240px');
    document.body.append(el);
    const before = el.outerHTML;

    explain(el);

    expect(el.outerHTML).toBe(before);
  });
});
