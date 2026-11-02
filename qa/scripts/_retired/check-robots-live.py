import urllib.request
req = urllib.request.Request("https://studynote.chosenecho.dpdns.org/robots.txt", headers={"User-Agent":"deploy-check/1.0"})
with urllib.request.urlopen(req, timeout=30) as r:
    body = r.read().decode("utf-8","replace")
print("status", r.status, "len", len(body))
print(body[:1200])
print("--- baiduspider present:", "Baiduspider" in body, "| sitemap:", [l for l in body.splitlines() if l.lower().startswith("sitemap")])
