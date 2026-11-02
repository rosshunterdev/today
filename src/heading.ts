// A heading is written, not stored: `# Garden` or `Garden:` on any line.
const HASH = /^\s*#+\s+/;
const COLON = /\s*:\s*$/;

// The heading's words without its symbol, or null for an ordinary line.
export function headingLabel(text: string): string | null {
  const hash = HASH.test(text);
  const colon = COLON.test(text);
  if (!hash && !colon) return null;
  const label = text.replace(HASH, '').replace(COLON, '').trim();
  return label === '' ? null : label;
}

export function isHeading(text: string): boolean {
  return headingLabel(text) !== null;
}
