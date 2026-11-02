// 修复后视觉抽查
import { session, PAGES, goto, warm, shot } from '../lib/audit.mjs';

const shots = [];
const take = async (dev, scheme, path, name, opts = {}) => {
  const s = await session(dev, { colorScheme: scheme });
  try {
    await goto(s.page, path);
    if (opts.warm) await warm(s.page);
    if (opts.dark) {
      await s.page.click('label[for="__palette_1"]');
      await s.page.waitForTimeout(300);
    }
    shots.push(await shot(s.page, `artifacts/verify/${name}.png`, opts));
  } finally {
    await s.close();
  }
};

await take('desktop-1440', 'light', PAGES.home, 'v-home-light');
await take('desktop-1440', 'light', PAGES.home, 'v-home-dark', { dark: true });
await take('desktop-1440', 'light', PAGES.os2, 'v-os2-light');
await take('desktop-1440', 'light', PAGES.os2, 'v-os2-dark', { dark: true });
await take('desktop-1440', 'light', PAGES.os3, 'v-os3-light', { warm: true });
await take('desktop-1440', 'light', PAGES.lab, 'v-lab-light');
await take('desktop-1440', 'light', PAGES.lab, 'v-lab-dark', { dark: true });
await take('desktop-1440', 'light', PAGES.co1, 'v-co1-light');
await take('iphone-se', 'light', PAGES.home, 'v-m-home');
await take('iphone-se', 'light', PAGES.os3, 'v-m-os3', { warm: true });
await take('iphone-se', 'light', PAGES.lab, 'v-m-lab');
await take('ipad-portrait', 'light', PAGES.os2, 'v-t-os2');

console.log(shots.join('\n'));
