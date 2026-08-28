import type { Finding, Report } from '../types.js';

/**
 * Findings as plain text - the form used by the bookmarklet panel, the console
 * output, and the README. Deliberately not HTML: if the explanation does not
 * read well as a paragraph, it is not a good explanation yet.
 */
export function formatReport(report: Report): string {
  if (report.findings.length === 0) {
    return 'Nothing conclusive. Every check either did not apply or could not be proved.';
  }

  return report.findings.map(formatFinding).join('\n\n');
}

export function formatFinding(finding: Finding): string {
  const lines: string[] = [finding.summary];

  if (finding.confidence !== 'proved') {
    lines.push('', `  (${confidenceNote(finding.confidence)})`);
  }

  lines.push('');
  for (const item of finding.evidence) {
    const source = item.source ? `  [${item.source}]` : '';
    lines.push(`  - ${item.detail}${source}`);
  }

  if (finding.fix) {
    lines.push('', `  Fix: ${finding.fix.declaration}  on  ${finding.fix.target}`);
    if (finding.fix.note) lines.push(`       ${finding.fix.note}`);
  }

  return lines.join('\n');
}

function confidenceNote(confidence: Finding['confidence']): string {
  switch (confidence) {
    case 'speculative':
      return 'established by re-measuring a copy of this element, not by reading the page';
    case 'opaque':
      return 'a cross-origin stylesheet could not be read, so this may be incomplete';
    default:
      return '';
  }
}
