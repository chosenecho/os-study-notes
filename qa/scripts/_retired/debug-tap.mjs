import { chromium } from "playwright";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const p = await ctx.newPage();
await p.goto("http://127.0.0.1:8123/chapters/chapter-2/", { waitUntil: "networkidle" });
const r = await p.evaluate(() => {
  const btn = document.querySelector('.md-header label[for="__drawer"]');
  const rect = btn.getBoundingClientRect();
  return { rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height }, hoverNone: matchMedia("(hover: none)").matches, padding: getComputedStyle(btn).padding };
});
console.log(JSON.stringify(r, null, 1));
await b.close();
