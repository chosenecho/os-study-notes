import urllib.request, pathlib, difflib
base="https://studynote.chosenecho.dpdns.org/"
local=pathlib.Path("站点/dist")
def get(u):
    req=urllib.request.Request(u,headers={"User-Agent":"parity/1.0"})
    with urllib.request.urlopen(req,timeout=30) as r: return r.read()
live=get(base).decode("utf-8","replace").splitlines()
loc=(local/"index.html").read_text(encoding="utf-8").splitlines()
d=[l for l in difflib.unified_diff(loc,live,"local","live",lineterm="",n=1)]
print("\n".join(d[:80]))
print("=== probe lab ===")
for p in ["lab/scheduling/","lab/scheduling","lab/","chapters/chapter-1/","nope-does-not-exist/"]:
    try:
        req=urllib.request.Request(base+p,headers={"User-Agent":"parity/1.0"})
        with urllib.request.urlopen(req,timeout=30) as r:
            print(p,"->",r.status,len(r.read()))
    except Exception as e:
        print(p,"->",getattr(e,"code",e))
