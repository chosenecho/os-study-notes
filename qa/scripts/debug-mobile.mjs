import { chromium } from "playwright";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const p = await ctx.newPage();
await p.goto("http://127.0.0.1:8123/", { waitUntil: "networkidle" });
const r = await p.evaluate(() => {
  const inner = document.querySelector(".md-content__inner");
  const content = document.querySelector(".md-content");
  const grid = document.querySelector(".md-main__inner");
  const rect = (el) => { const b = el.getBoundingClientRect(); return { x: Math.round(b.x), w: Math.round(b.width) }; };
  return {
    scrollX: window.scrollX,
    docScrollW: document.documentElement.scrollWidth,
    inner: { ...rect(inner), maxWidth: getComputedStyle(inner).maxWidth, margin: getComputedStyle(inner).margin },
    content: rect(content),
    grid: rect(grid),
    gridPadding: getComputedStyle(grid).padding,
    bodyOverflowX: getComputedStyle(document.body).overflowX,
  };
});
console.log(JSON.stringify(r, null, 1));
await b.close();
