import urllib.request, hashlib, pathlib, re, sys, json
base="https://studynote.chosenecho.dpdns.org/"
local=pathlib.Path(r"站点/dist")
pages=["","chapters/chapter-1/","lab/","404.html","sitemap.xml","assets/notes.css","assets/interactions.js"]
def get(u):
    req=urllib.request.Request(u,headers={"User-Agent":"parity-check/1.0"})
    with urllib.request.urlopen(req,timeout=30) as r:
        return r.status, r.read()
for p in pages:
    u=base+p
    try:
        st,body=get(u)
    except Exception as e:
        print("ERR",p,e); continue
    fp = local/("index.html" if p=="" else p.rstrip("/")+("/index.html" if not p.endswith((".xml",".css",".js",".html")) else ""))
    lb = fp.read_bytes() if fp.exists() else b""
    print(f"{p or '/'}: HTTP {st} live={len(body)} local={len(lb)} same={hashlib.sha256(body).hexdigest()==hashlib.sha256(lb).hexdigest()} path={fp}")
    global live_body
    if p=="":
        live_body=body.decode("utf-8")
print("--- head of live index (utf8) ---")
print(live_body[:400])
