import { chromium } from "playwright";
const b = await chromium.launch();
for (const w of [768, 1024, 1220, 1440]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 } });
  await p.goto("http://127.0.0.1:8123/", { waitUntil: "networkidle" });
  const r = await p.evaluate(() => {
    const input = document.querySelector(".md-search__input");
    const form = document.querySelector(".md-search__form");
    const icon = document.querySelector(".md-search__icon");
    const cs = getComputedStyle(input);
    return {
      formW: Math.round(form.getBoundingClientRect().width),
      formBg: getComputedStyle(form).backgroundColor,
      inputColor: cs.color,
      placeholder: getComputedStyle(input, "::placeholder").color,
      iconColor: icon ? getComputedStyle(icon).color : null,
      iconFill: icon ? getComputedStyle(icon.querySelector("svg") || icon).fill : null,
    };
  });
  console.log(w, JSON.stringify(r));
  await p.close();
}
await b.close();
