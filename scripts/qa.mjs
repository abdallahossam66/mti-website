// Runs every automated check in sequence, saves each output to docs/qa/<step>.txt and writes
// docs/qa/summary.md. The human-readable QA report with the brief §04 checklist is docs/QA-REPORT.md.
//   npm run qa
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const STEPS = [
  ['fixture', 'Approved-copy fixture matches the brief PDF', 'node scripts/verify-fixture.mjs'],
  ['unit', 'Unit tests (lead rules, proxy, Netlify adapter)', 'npm test'],
  ['html', 'HTML validation (W3C Nu checker)', 'node scripts/validate-html.mjs'],
  ['links', 'Link and fragment check', 'node scripts/check-links.mjs'],
  ['contrast', 'Colour contrast (WCAG 2.1)', 'node scripts/contrast.mjs'],
  ['e2e', 'Browser tests: content, form, mocked end-to-end submit, axe, keyboard', 'npx playwright test'],
  ['php', 'PHP proxy smoke test', 'node tests/php-smoke.mjs'],
  ['lighthouse', 'Lighthouse mobile + desktop', 'node scripts/lighthouse.mjs'],
  ['screenshots', 'Screenshots 1440 + 390', 'node scripts/screenshots.mjs'],
];

mkdirSync('docs/qa', { recursive: true });
const rows = [];
for (const [id, label, cmd] of STEPS) {
  process.stdout.write(`${label} … `);
  const started = Date.now();
  const res = spawnSync(cmd, { shell: true, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const output = `${res.stdout || ''}${res.stderr || ''}`.replace(/\x1b\[[0-9;]*m/g, '');
  writeFileSync(`docs/qa/${id}.txt`, `$ ${cmd}\n\n${output}`);
  const ok = res.status === 0;
  rows.push(`| ${label} | \`${cmd}\` | ${ok ? 'Pass' : '**FAIL**'} | ${((Date.now() - started) / 1000).toFixed(0)} s | [${id}.txt](${id}.txt) |`);
  console.log(ok ? 'pass' : 'FAIL');
}
const summary = `# Automated QA summary\n\nGenerated ${new Date().toISOString()} by \`npm run qa\`.\n\n| Check | Command | Result | Time | Output |\n| --- | --- | --- | --- | --- |\n${rows.join('\n')}\n`;
writeFileSync('docs/qa/summary.md', summary);
console.log('\nWrote docs/qa/summary.md');
process.exit(rows.some((r) => r.includes('FAIL')) ? 1 : 0);
