import urllib.request
def hdr(url):
    req = urllib.request.Request(url, headers={"User-Agent":"deploy-check/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        h = {k.lower(): v for k, v in r.headers.items()}
        return r.status, h.get("cache-control"), h.get("x-frame-options"), (h.get("content-security-policy") or "")[:24]
for p in ["/?v=cc2", "/assets/notes.css?v=cc2", "/chapters/chapter-1/?v=cc2", "/robots.txt?v=cc2"]:
    print(p, hdr("https://studynote.chosenecho.dpdns.org" + p))
