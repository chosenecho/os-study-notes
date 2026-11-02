import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        p = await b.new_page(viewport={"width":1280,"height":900})
        await p.goto("http://127.0.0.1:8123/lab/scheduling/", wait_until="networkidle")
        await p.select_option("select[name=algorithm]", "rr")
        await p.fill("input[name=quantum]", "2")
        await p.click("button[type=submit]")
        await p.wait_for_timeout(400)
        text = await p.locator(".lab-metrics").inner_text()
        rows = await p.evaluate(() => [...document.querySelectorAll('.lab-results table tbody tr')].map(tr => [...tr.cells].map(c => c.textContent)))
        await b.close()
        print(text)
        print(rows)
asyncio.run(main())
