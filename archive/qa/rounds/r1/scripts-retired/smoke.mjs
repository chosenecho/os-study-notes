import { session, DEVICES, PAGES, goto, layout, tapTargets, contrast, a11y, shot, saveJSON, diagnostics } from './lib/audit.mjs';

const cases = [
  ['iphone-se', PAGES.os2, 'light', 'smoke/mobile-os2'],
  ['desktop-1440', PAGES.home, 'dark', 'smoke/desktop-home'],
];

const out = {};
for (const [dev, page, scheme, name] of cases) {
  const s = await session(dev, { colorScheme: scheme });
  try {
    await goto(s.page, page);
    const rec = {
      device: s.label,
      scheme,
      layout: await layout(s.page),
      tapTargets: (await tapTargets(s.page)).slice(0, 6),
      contrast: (await contrast(s.page)).slice(0, 6),
      a11y: await a11y(s.page),
    };
    rec.shot = await shot(s.page, `artifacts/${name}.png`);
    out[name] = rec;
  } finally {
    await s.close();
  }
}
// trim a11y noise
for (const k of Object.keys(out)) out[k].a11y = { ...out[k].a11y, headings: out[k].a11y.headings.slice(0, 6) };
console.log(await saveJSON('artifacts/smoke.json', out));
console.log(JSON.stringify(out, null, 1).slice(0, 2500));
