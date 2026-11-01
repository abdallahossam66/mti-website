# Automated QA summary

Generated 2026-11-01T01:53:07.278Z by `npm run qa`.

| Check | Command | Result | Time | Output |
| --- | --- | --- | --- | --- |
| Generated pages match src/ (template + en/de/ar JSON) | `node scripts/build-site.mjs --check` | Pass | 0 s | [build.txt](build.txt) |
| Approved-copy fixture matches the brief PDF | `node scripts/verify-fixture.mjs` | Pass | 0 s | [fixture.txt](fixture.txt) |
| Unit tests (lead rules, proxy, Netlify adapter, translations) | `npm test` | Pass | 3 s | [unit.txt](unit.txt) |
| HTML validation (W3C Nu checker) | `node scripts/validate-html.mjs` | Pass | 12 s | [html.txt](html.txt) |
| Link and fragment check | `node scripts/check-links.mjs` | Pass | 3 s | [links.txt](links.txt) |
| Colour contrast (WCAG 2.1) | `node scripts/contrast.mjs` | Pass | 0 s | [contrast.txt](contrast.txt) |
| Browser tests (EN/DE/AR x 1440/390): content, form, mocked end-to-end submit, axe, keyboard | `npx playwright test` | Pass | 341 s | [e2e.txt](e2e.txt) |
| PHP proxy smoke test | `node tests/php-smoke.mjs` | Pass | 3 s | [php.txt](php.txt) |
| Lighthouse mobile + desktop for /, /de/, /ar/ | `node scripts/lighthouse.mjs` | Pass | 156 s | [lighthouse.txt](lighthouse.txt) |
| Screenshots EN/DE/AR at 1440 + 390 | `node scripts/screenshots.mjs` | Pass | 64 s | [screenshots.txt](screenshots.txt) |
