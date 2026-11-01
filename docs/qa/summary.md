# Automated QA summary

Generated 2026-11-01T00:43:46.056Z by `npm run qa`.

| Check | Command | Result | Time | Output |
| --- | --- | --- | --- | --- |
| Approved-copy fixture matches the brief PDF | `node scripts/verify-fixture.mjs` | Pass | 0 s | [fixture.txt](fixture.txt) |
| Unit tests (lead rules, proxy, Netlify adapter) | `npm test` | Pass | 5 s | [unit.txt](unit.txt) |
| HTML validation (W3C Nu checker) | `node scripts/validate-html.mjs` | Pass | 10 s | [html.txt](html.txt) |
| Link and fragment check | `node scripts/check-links.mjs` | Pass | 2 s | [links.txt](links.txt) |
| Colour contrast (WCAG 2.1) | `node scripts/contrast.mjs` | Pass | 0 s | [contrast.txt](contrast.txt) |
| Browser tests: content, form, mocked end-to-end submit, axe, keyboard | `npx playwright test` | Pass | 96 s | [e2e.txt](e2e.txt) |
| PHP proxy smoke test | `node tests/php-smoke.mjs` | Pass | 2 s | [php.txt](php.txt) |
| Lighthouse mobile + desktop | `node scripts/lighthouse.mjs` | Pass | 34 s | [lighthouse.txt](lighthouse.txt) |
| Screenshots 1440 + 390 | `node scripts/screenshots.mjs` | Pass | 18 s | [screenshots.txt](screenshots.txt) |
