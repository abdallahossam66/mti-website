// Lighthouse (mobile + desktop) against the local Node server. Reports → docs/lighthouse/.
//   node scripts/lighthouse.mjs           (uses the installed Google Chrome; set CHROME_PATH to override)
import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { promisify } from 'node:util';
import { server } from '../server/node-server.mjs';

const run = promisify(execFile);
const PORT = 8094;
const URL = `http://localhost:${PORT}/`;
const CHROME = process.env.CHROME_PATH || ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(existsSync);
const LH = 'node_modules/lighthouse/cli/index.js';

mkdirSync('docs/lighthouse', { recursive: true });
await new Promise((r) => server.listen(PORT, r));

const rows = [];
for (const formFactor of ['mobile', 'desktop']) {
  const out = `docs/lighthouse/${formFactor}`;
  const args = [LH, URL, '--quiet', '--output=json', '--output=html', `--output-path=${out}`,
    '--only-categories=performance,accessibility,best-practices,seo', '--chrome-flags=--headless=new --no-first-run'];
  if (formFactor === 'desktop') args.push('--preset=desktop');
  try {
    await run(process.execPath, args, { env: { ...process.env, CHROME_PATH: CHROME }, maxBuffer: 64 * 1024 * 1024 });
  } catch (err) {
    // On Windows Lighthouse can fail to delete its temp profile (EPERM) after writing the report; ignore that only.
    if (!existsSync(`${out}.report.json`)) throw err;
  }
  const report = JSON.parse(readFileSync(`${out}.report.json`, 'utf8'));
  const score = (id) => Math.round(report.categories[id].score * 100);
  const metric = (id) => report.audits[id]?.displayValue ?? '';
  rows.push({
    formFactor,
    performance: score('performance'), accessibility: score('accessibility'), bestPractices: score('best-practices'), seo: score('seo'),
    fcp: metric('first-contentful-paint'), lcp: metric('largest-contentful-paint'), tbt: metric('total-blocking-time'), cls: metric('cumulative-layout-shift'), si: metric('speed-index'),
    failed: Object.values(report.categories).flatMap((c) => c.auditRefs.filter((r) => r.weight > 0 && report.audits[r.id].score !== null && report.audits[r.id].score < 0.9).map((r) => `${c.id}:${r.id}`)),
  });
}
server.close();

const lines = [
  '| Form factor | Performance | Accessibility | Best practices | SEO | FCP | LCP | TBT | CLS | Speed Index |',
  '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ...rows.map((r) => `| ${r.formFactor} | ${r.performance} | ${r.accessibility} | ${r.bestPractices} | ${r.seo} | ${r.fcp} | ${r.lcp} | ${r.tbt} | ${r.cls} | ${r.si} |`),
];
console.log(lines.join('\n'));
rows.forEach((r) => r.failed.length && console.log(`${r.formFactor} audits below 0.9: ${r.failed.join(', ')}`));
writeFileSync('docs/lighthouse/scores.md', `${lines.join('\n')}\n`);
process.exit(rows.every((r) => Math.min(r.performance, r.accessibility, r.bestPractices, r.seo) >= 90) ? 0 : 1);
