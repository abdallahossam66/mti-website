// Renders the Open Graph / Twitter card images (1200×630) for each language:
//   public/assets/img/og-image.png (en), og-image-de.png, og-image-ar.png
//   node scripts/build-og-image.mjs
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const logo = readFileSync('public/assets/img/logo-reversed.svg', 'utf8').replace(/<\?xml[^>]*>/, '');
const inter = readFileSync('public/assets/fonts/inter-latin-var.woff2').toString('base64');
const cairo = readFileSync('public/assets/fonts/cairo-arabic-var.woff2').toString('base64');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const page = (lang, headline) => {
  const rtl = lang === 'ar';
  // The document stays LTR (an RTL root would shift the capture origin); only the text block is mirrored.
  return `<!doctype html><html lang="${lang}"><head><style>
@font-face { font-family: Inter; src: url(data:font/woff2;base64,${inter}) format('woff2'); font-weight: 100 900; }
@font-face { font-family: Cairo; src: url(data:font/woff2;base64,${cairo}) format('woff2'); font-weight: 200 1000; unicode-range: U+0600-06FF, U+FB50-FDFF, U+FE70-FEFF; }
* { margin: 0; box-sizing: border-box; }
body { width: 1200px; height: 630px; font-family: Cairo, Inter, sans-serif; background: #0D1B3E; color: #fff; position: relative; overflow: hidden; }
.grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px); background-size: 20px 20px; }
.glow { position: absolute; width: 900px; height: 900px; right: -320px; top: -300px; background: radial-gradient(closest-side, rgba(30,111,217,.35), transparent); }
.bar { position: absolute; left: 0; right: 0; top: 0; height: 10px; background: linear-gradient(90deg, #C8922A, #1E6FD9 55%, #00C8FF); }
.hex { position: absolute; ${rtl ? 'left' : 'right'}: 56px; top: 150px; width: 320px; opacity: .9; }
.hex polygon { fill: none; stroke-linejoin: round; }
.content { position: absolute; ${rtl ? 'right' : 'left'}: 80px; top: 92px; width: 700px; direction: ${rtl ? 'rtl' : 'ltr'}; }
.logo { direction: ltr; display: flex; justify-content: ${rtl ? 'flex-end' : 'flex-start'}; }
.logo svg { width: 300px; height: auto; }
.tag { margin-top: 44px; padding-inline-start: 18px; border-inline-start: 4px solid #C8922A; color: #C8922A; font-family: Inter, sans-serif; font-weight: 700; letter-spacing: .16em; font-size: 22px; }
h1 { margin-top: 26px; font-size: ${rtl ? 60 : 56}px; line-height: ${rtl ? 1.35 : 1.08}; font-weight: 800; letter-spacing: ${rtl ? 0 : '-.02em'}; }
</style></head><body>
<div class="grid"></div><div class="glow"></div><div class="bar"></div>
<svg class="hex" viewBox="0 0 200 230"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#C8922A"/><stop offset=".55" stop-color="#1E6FD9"/><stop offset="1" stop-color="#00C8FF"/></linearGradient></defs>
<polygon points="100,5 195,60 195,170 100,225 5,170 5,60" stroke="url(#g)" stroke-width="5"/>
<polygon points="100,45 160,80 160,150 100,185 40,150 40,80" stroke="rgba(255,255,255,.25)" stroke-width="2"/></svg>
<div class="content"><div class="logo">${logo}</div>
<p class="tag" lang="en">WHERE INDUSTRY MEETS INTELLIGENCE</p>
<h1>${esc(headline)}</h1></div>
</body></html>`;
};

const browser = await chromium.launch({ channel: 'chrome' });
const tab = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const lang of ['en', 'de', 'ar']) {
  const { hero } = JSON.parse(readFileSync(`src/i18n/${lang}.json`, 'utf8'));
  await tab.setContent(page(lang, hero.headline), { waitUntil: 'load' });
  await tab.evaluate(() => document.fonts.ready);
  const out = `public/assets/img/og-image${lang === 'en' ? '' : `-${lang}`}.png`;
  await tab.screenshot({ path: out });
  console.log(out);
}
await browser.close();
