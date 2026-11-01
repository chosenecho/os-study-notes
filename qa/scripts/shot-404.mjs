import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
await p.goto("http://127.0.0.1:8123/404.html", { waitUntil: "networkidle" });
await p.screenshot({ path: "qa/artifacts/verify/v-404.png" });
const txt = await p.locator("main").innerText();
console.log(txt.slice(0, 300));
await b.close();
