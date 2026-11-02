import urllib.request, urllib.error
class NR(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k): return None
req = urllib.request.Request("https://studynote.chosenecho.dpdns.org/lab/scheduling//", headers={"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/141 Safari/537.36"})
try:
    urllib.request.build_opener(NR).open(req, timeout=20)
    print("no redirect")
except urllib.error.HTTPError as e:
    print("status", e.code, "->", e.headers.get("Location"))
