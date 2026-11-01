// Link check: crawls the site with linkinator (pages, assets, external links) and verifies every
// in-page #fragment points at an existing id. Exit 1 on any broken internal link or fragment.
import { readdirSync, readFileSync } from 'node:fs';
import { LinkChecker } from 'linkinator';
import { server } from '../server/node-server.mjs';

const PORT = 8092;
const BASE = `http://localhost:${PORT}/`;
await new Promise((r) => server.listen(PORT, r));

const checker = new LinkChecker();
const result = await checker.check({ path: BASE, recurse: true, timeout: 15000, retry: true });
const internal = result.links.filter((l) => l.url.startsWith(BASE));
const external = result.links.filter((l) => !l.url.startsWith(BASE));
const brokenInternal = internal.filter((l) => l.state === 'BROKEN');

// Fragments: every href="#id" or "/page#id" must match an id on that page.
const pages = Object.fromEntries(readdirSync('public', { recursive: true }).map((f) => f.replaceAll('\\', '/')).filter((f) => f.endsWith('.html')).map((f) => [f, readFileSync(`public/${f}`, 'utf8')]));
const ids = Object.fromEntries(Object.entries(pages).map(([f, html]) => [f, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))]));
const brokenFragments = [];
let fragmentCount = 0;
for (const [file, html] of Object.entries(pages)) {
  for (const [, href] of html.matchAll(/\shref="([^"]*#[^"]*)"/g)) {
    if (/^(https?:|mailto:|tel:)/.test(href) || href.includes('icons.svg#')) continue;
    const [path, fragment] = href.split('#');
    const target = path === '' ? file : (path.endsWith('/') ? `${path.slice(1)}index.html` : path.slice(1));
    fragmentCount += 1;
    if (!ids[target]?.has(fragment)) brokenFragments.push(`${file}: ${href}`);
  }
}
// The JavaScript-generated summary links point at form fields; those ids are covered above.

console.log(`Internal links/assets checked: ${internal.length}, broken: ${brokenInternal.length}`);
brokenInternal.forEach((l) => console.log(`  BROKEN ${l.status} ${l.url} (on ${l.parent})`));
console.log(`Fragment links checked: ${fragmentCount}, broken: ${brokenFragments.length}`);
brokenFragments.forEach((f) => console.log(`  BROKEN FRAGMENT ${f}`));
console.log(`External links: ${external.length}`);
for (const l of external) console.log(`  ${l.state.padEnd(7)} ${String(l.status ?? '').padEnd(4)} ${l.url}`);

server.close();
process.exit(brokenInternal.length || brokenFragments.length ? 1 : 0);
