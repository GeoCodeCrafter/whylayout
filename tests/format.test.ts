import { describe, expect, it } from 'vitest';
import { formatFinding, formatReport } from '../src/report/format.js';
import type { Finding } from '../src/types.js';

const finding: Finding = {
  rule: 'flex-min-width-auto',
  summary: 'div.card will not shrink below 340px.',
  evidence: [
    { kind: 'declaration', detail: 'width: 240px was asked for, and ignored', source: 'inline style' },
    { kind: 'measurement', detail: 'width is 340px' },
  ],
  fix: { declaration: 'min-width: 0', target: 'div.card', note: 'Or break the long word.' },
  confidence: 'proved',
};

describe('formatFinding', () => {
  it('leads with the summary, then the evidence, then the fix', () => {
    const lines = formatFinding(finding).split('\n');

    expect(lines[0]).toBe('div.card will not shrink below 340px.');
    expect(formatFinding(finding)).toContain('  - width is 340px');
    expect(formatFinding(finding)).toContain('Fix: min-width: 0  on  div.card');
  });

  it('attributes evidence that has a source', () => {
    expect(formatFinding(finding)).toContain('[inline style]');
  });

  it('flags anything not established by reading the page', () => {
    const speculative = { ...finding, confidence: 'speculative' as const };

    expect(formatFinding(speculative)).toContain('re-measuring a copy');
  });
});

describe('formatReport', () => {
  it('says so plainly when nothing could be proved', () => {
    const empty = { element: document.createElement('div'), findings: [] };

    expect(formatReport(empty)).toContain('Nothing conclusive');
  });

  it('separates multiple findings', () => {
    const report = { element: document.createElement('div'), findings: [finding, finding] };

    expect(formatReport(report).split('div.card will not shrink')).toHaveLength(3);
  });
});
