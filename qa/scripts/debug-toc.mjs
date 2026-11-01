import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1024, height: 900 } });
await p.goto("http://127.0.0.1:8123/chapters/chapter-2/", { waitUntil: "networkidle" });
const info = await p.evaluate(() => {
  const el = document.querySelector(".md-sidebar--secondary");
  const cs = getComputedStyle(el);
  return {
    display: cs.display,
    width: cs.width,
    mq60: matchMedia("(min-width: 60em)").matches,
    mq76: matchMedia("(max-width: 76.234375em)").matches,
    inline: el.getAttribute("style"),
    sheets: [...document.styleSheets].map((s) => (s.href || "inline").split("/").pop()).slice(0, 8),
  };
});
console.log(JSON.stringify(info, null, 1));
await b.close();
