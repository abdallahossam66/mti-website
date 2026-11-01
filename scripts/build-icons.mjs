// Builds public/assets/img/icons.svg from Lucide (ISC) line icons.
// Run once after changing the ICONS map: node scripts/build-icons.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const ICONS = {
  // challenges
  'repeat': 'repeat', 'unplug': 'unplug', 'eye-off': 'eye-off', 'trending-up': 'trending-up',
  'expand': 'expand', 'message-square-warning': 'message-square-warning',
  // solutions
  'workflow': 'workflow', 'bot': 'bot', 'code-xml': 'code-xml', 'library-big': 'library-big',
  'audio-lines': 'audio-lines', 'chart-pie': 'chart-pie', 'refresh-cw': 'refresh-cw', 'shield-check': 'shield-check',
  // industries
  'factory': 'factory', 'heart-pulse': 'heart-pulse', 'building-2': 'building-2', 'banknote': 'banknote',
  'shopping-cart': 'shopping-cart', 'graduation-cap': 'graduation-cap', 'truck': 'truck', 'hotel': 'hotel',
  'zap': 'zap', 'radio-tower': 'radio-tower', 'briefcase': 'briefcase', 'landmark': 'landmark',
  // why MTI
  'target': 'target', 'puzzle': 'puzzle', 'cpu': 'cpu', 'infinity': 'infinity', 'layers': 'layers', 'shield': 'shield',
  // technology
  'brain-circuit': 'brain-circuit', 'sparkles': 'sparkles', 'bot-message-square': 'bot-message-square',
  'audio-waveform': 'audio-waveform', 'app-window': 'app-window', 'cloud': 'cloud', 'database': 'database',
  'lock-keyhole': 'lock-keyhole',
  // interface
  'menu': 'menu', 'x': 'x', 'plus': 'plus', 'arrow-right': 'arrow-right', 'check': 'check',
  'circle-alert': 'circle-alert', 'circle-check': 'circle-check', 'info': 'info', 'mail': 'mail', 'phone': 'phone',
  'map-pin': 'map-pin', 'message-circle': 'message-circle', 'globe': 'globe', 'calendar': 'calendar',
  'external-link': 'external-link',
};

// LinkedIn glyph from Simple Icons (CC0); Lucide no longer ships brand icons.
const LINKEDIN = '<path fill="currentColor" stroke="none" d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>';

const symbols = Object.entries(ICONS).map(([id, file]) => {
  const src = readFileSync(`node_modules/lucide-static/icons/${file}.svg`, 'utf8');
  const inner = src.slice(src.indexOf('>', src.indexOf('<svg')) + 1, src.lastIndexOf('</svg>'))
    .replace(/\s*\n\s*/g, '').replace(/ \/>/g, '/>');
  return `<symbol id="${id}" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${inner}</g></symbol>`;
});
symbols.push(`<symbol id="linkedin" viewBox="0 0 24 24">${LINKEDIN}</symbol>`);

writeFileSync('public/assets/img/icons.svg',
  `<svg xmlns="http://www.w3.org/2000/svg">\n<!-- Icons: Lucide (ISC licence, https://lucide.dev); LinkedIn glyph: Simple Icons (CC0). -->\n${symbols.join('\n')}\n</svg>\n`);
console.log(`icons.svg: ${symbols.length} symbols`);
