// Lead：核对 RR 平均带权周转时间的显示值
import { chromium } from 'playwright';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
await p.goto('http://127.0.0.1:8123/lab/scheduling/', { waitUntil: 'networkidle' });
await p.selectOption('select[name=algorithm]', 'rr');
await p.fill('input[name=quantum]', '2');
await p.click('button[type=submit]');
await p.waitForTimeout(500);
const text = await p.locator('.lab-metrics').innerText();
const rows = await p.evaluate(() => [...document.querySelectorAll('.lab-results table tbody tr')].map((tr) => [...tr.cells].map((c) => c.textContent)));
const sum = rows.reduce((a, r) => a + Number(r[3]), 0);
console.log(JSON.stringify({ text, rows, sumWeighted: sum, exactAvg: sum / rows.length, jsToFixed: (sum / rows.length).toFixed(2), properRound: Math.round((sum / rows.length) * 100 + 1e-9) / 100 }, null, 1));
await b.close();
