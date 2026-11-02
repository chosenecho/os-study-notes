import urllib.request, json
base = "https://studynote.chosenecho.dpdns.org"
origin = "https://studynote-42b.pages.dev"

def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "deploy-check/1.0", "Accept-Encoding": "gzip"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            body = r.read()
            try:
                import gzip
                body = gzip.decompress(body)
            except Exception:
                pass
            return r.status, dict(r.headers), body.decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        body = e.read()
        try:
            import gzip; body = gzip.decompress(body)
        except Exception: pass
        return e.code, dict(e.headers), body.decode("utf-8", "replace")

checks = {}
for name, b in [("origin", origin), ("edge", base)]:
    checks[name] = {}
    for label, path in [("home", "/?v=live1"), ("home_plain", "/"), ("robots", "/robots.txt"), ("404", "/404.html"), ("css", "/assets/notes.css")]:
        st, hdr, body = get(b + path)
        checks[name][label] = {
            "status": st,
            "len": len(body),
            "has_progress_badge": "data-progress-chapter" in body,
            "has_continue": "继续复习" in body,
            "has_sitemap": "Sitemap:" in body,
            "chinese_404": "页面没有找到" in body,
            "csp": hdr.get("content-security-policy", "")[:40],
            "cache_control": hdr.get("cache-control", ""),
            "content_encoding": hdr.get("content-encoding", ""),
        }
# 双斜杠
import urllib.error
req = urllib.request.Request(base + "/lab/scheduling//", headers={"User-Agent": "deploy-check/1.0"}, method="GET")
opener = urllib.request.build_opener(urllib.request.HTTPRedirectHandler())
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None
try:
    urllib.request.build_opener(NoRedirect).open(req, timeout=30)
    checks["double_slash"] = {"status": "no-redirect"}
except urllib.error.HTTPError as e:
    checks["double_slash"] = {"status": e.code, "location": e.headers.get("Location")}
print(json.dumps(checks, ensure_ascii=False, indent=1))
