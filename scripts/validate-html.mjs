// W3C Nu HTML Checker (vnu.jar, needs Java) over every page in public/. Exit 1 on any error.
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import vnu from 'vnu-jar';

const files = readdirSync('public').filter((f) => f.endsWith('.html')).map((f) => `public/${f}`);
let out;
try {
  out = execFileSync('java', ['-jar', vnu, '--format', 'json', ...files], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
} catch (err) {
  out = err.stderr || err.stdout;
}
const { messages } = JSON.parse(out || '{"messages":[]}');
const errors = messages.filter((m) => m.type === 'error');
const warnings = messages.filter((m) => m.type === 'info' && m.subType === 'warning');
for (const m of [...errors, ...warnings]) {
  console.log(`${m.type === 'error' ? 'ERROR' : 'warning'} ${m.url.split('/').pop()}:${m.lastLine} ${m.message}`);
}
console.log(`HTML validation: ${files.length} files, ${errors.length} errors, ${warnings.length} warnings`);
process.exit(errors.length ? 1 : 0);
