import { chromium } from "playwright";
const b = await chromium.launch();
const shots = [
  { url: "/", vp: { width: 1440, height: 900 }, file: "qa/artifacts/verify/live-home.png" },
  { url: "/chapters/chapter-2/", vp: { width: 375, height: 667 }, mobile: true, file: "qa/artifacts/verify/live-mobile-ch2.png" },
  { url: "/", vp: { width: 1440, height: 900 }, dark: true, file: "qa/artifacts/verify/live-home-dark.png" },
];
for (const s of shots) {
  const ctx = await b.newContext({ viewport: s.vp, isMobile: !!s.mobile, hasTouch: !!s.mobile, deviceScaleFactor: s.mobile ? 2 : 1, colorScheme: s.dark ? "dark" : "light" });
  const p = await ctx.newPage();
  await p.goto("https://studynote.chosenecho.dpdns.org" + s.url, { waitUntil: "networkidle" });
  await p.waitForTimeout(400);
  await p.screenshot({ path: s.file, fullPage: false });
  console.log("saved", s.file);
  await ctx.close();
}
await b.close();
