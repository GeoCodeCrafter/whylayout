import { beforeEach, describe, expect, it } from 'vitest';
import { collapsedTopMargin } from '../src/engine/margins.js';
import { FakeMeasurer } from './fake-measurer.js';

function scenario() {
  document.body.innerHTML = '<section class="panel"><h2 class="title"></h2><p class="body"></p></section>';
  const panel = document.querySelector('.panel')!;
  const title = document.querySelector('.title')!;

  const m = new FakeMeasurer()
    .setStyle(panel, {
      display: 'block',
      'border-top-width': '0px',
      'padding-top': '0px',
      overflow: 'visible',
      'margin-top': '0px',
      position: 'static',
      float: 'none',
    })
    .setStyle(title, { 'margin-top': '32px', position: 'static', float: 'none' });

  return { panel, title, m };
}

describe('collapsedTopMargin', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('explains the gap as the child margin escaping through the parent', () => {
    const { title, m } = scenario();

    const [finding] = collapsedTopMargin(title, m);

    expect(finding?.rule).toBe('margin-collapse-through-parent');
    expect(finding?.summary).toContain('32px');
    expect(finding?.fix?.declaration).toBe('display: flow-root');
  });

  it.each([
    ['a top border', { 'border-top-width': '1px' }],
    ['top padding', { 'padding-top': '8px' }],
    ['a clipped overflow', { overflow: 'hidden' }],
    ['a flex parent', { display: 'flex' }],
    ['a flow-root parent', { display: 'flow-root' }],
  ])('says nothing when the parent has %s', (_label, style) => {
    const { panel, title, m } = scenario();
    m.setStyle(panel, style);

    expect(collapsedTopMargin(title, m)).toEqual([]);
  });

  it('says nothing when the child is not first in flow', () => {
    const { title, m } = scenario();
    const body = document.querySelector('.body')!;
    m.setStyle(body, { position: 'static', float: 'none' });

    expect(collapsedTopMargin(body, m)).toEqual([]);
    expect(collapsedTopMargin(title, m)).toHaveLength(1);
  });

  it('ignores an absolutely positioned first child when deciding who is first', () => {
    const { title, m } = scenario();
    const body = document.querySelector('.body')!;
    m.setStyle(title, { position: 'absolute' });
    m.setStyle(body, { 'margin-top': '16px', position: 'static', float: 'none' });

    // The out-of-flow heading is not the first in-flow child; the paragraph is.
    expect(collapsedTopMargin(title, m)).toEqual([]);
    expect(collapsedTopMargin(body, m)).toHaveLength(1);
  });

  it('says nothing when there is no top margin to collapse', () => {
    const { title, m } = scenario();
    m.setStyle(title, { 'margin-top': '0px' });

    expect(collapsedTopMargin(title, m)).toEqual([]);
  });
});
