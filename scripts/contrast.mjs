// WCAG 2.1 contrast check for every text/UI colour pair used in main.css. Exit 1 if any pair fails.
const PAIRS = [
  // [foreground, background, minimum, usage]
  ['#0D1B3E', '#FFFFFF', 4.5, 'Navy headings/text on white'],
  ['#0D1B3E', '#F4F6FB', 4.5, 'Navy headings/text on off-white'],
  ['#3A4468', '#FFFFFF', 4.5, 'Secondary text on white'],
  ['#3A4468', '#F4F6FB', 4.5, 'Secondary text on off-white (focus tags, timeline)'],
  ['#1E6FD9', '#FFFFFF', 4.5, 'Blue links on white cards ("Explore Solution", Privacy Policy)'],
  ['#FFFFFF', '#1E6FD9', 4.5, 'White text on primary buttons'],
  ['#FFFFFF', '#185BB3', 4.5, 'White text on primary button hover'],
  ['#FFFFFF', '#0D1B3E', 4.5, 'White text on navy'],
  ['#C9D2E6', '#0D1B3E', 4.5, 'Muted text on navy'],
  ['#C9D2E6', '#0A1632', 4.5, 'Muted footer text'],
  ['#C8922A', '#0D1B3E', 4.5, 'Gold tagline, eyebrows, stage numbers on navy'],
  ['#00C8FF', '#0D1B3E', 3.0, 'Cyan icons/underlines on navy (non-text)'],
  ['#00C8FF', '#0D1B3E', 4.5, 'Cyan link hover text on navy'],
  ['#B42318', '#FFFFFF', 4.5, 'Error text on white'],
  ['#B42318', '#FEF2F2', 4.5, 'Error text on error background'],
  ['#065F46', '#ECFDF5', 4.5, 'Success text'],
  ['#075985', '#F0F9FF', 4.5, 'Booking note text'],
  ['#92400E', '#FFFBEB', 4.5, 'Placeholder-page note'],
  ['#6E7891', '#FFFFFF', 3.0, 'Form field borders (non-text, WCAG 1.4.11)'],
  ['#1E6FD9', '#FFFFFF', 3.0, 'Focus ring on white'],
  ['#1E6FD9', '#F4F6FB', 3.0, 'Focus ring on off-white'],
  ['#00C8FF', '#0D1B3E', 3.0, 'Focus ring on navy'],
];
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
let failed = 0;
console.log('| Foreground | Background | Ratio | Required | Result | Usage |\n| --- | --- | --- | --- | --- | --- |');
for (const [fg, bg, min, usage] of PAIRS) {
  const r = ratio(fg, bg);
  const ok = r >= min;
  if (!ok) failed += 1;
  console.log(`| ${fg} | ${bg} | ${r.toFixed(2)}:1 | ${min}:1 | ${ok ? 'Pass' : 'FAIL'} | ${usage} |`);
}
console.log(`\n${PAIRS.length - failed}/${PAIRS.length} pairs pass`);
process.exit(failed ? 1 : 0);
