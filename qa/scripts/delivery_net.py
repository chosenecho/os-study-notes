#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
qa-delivery / network + delivery-layer probe.

Compares the local mkdocs build (站点/dist, served at http://127.0.0.1:8123)
against the live deployment (https://studynote.chosenecho.dpdns.org, Cloudflare
Worker proxy in front of a Pages origin).

Everything is measured with raw HTTP (urllib) so byte counts are exact:
Accept-Encoding: identity -> len(body) == on-the-wire body bytes.

Outputs:
  qa/artifacts/delivery/net.json      full machine-readable results
  stdout: ASCII-only summary (the PowerShell console mangles CJK)
"""

import hashlib
import json
import os
import re
import ssl
import statistics
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
DIST = os.path.join(ROOT, "站点", "dist")
OUT_DIR = os.path.join(ROOT, "qa", "artifacts", "delivery")
OUT_JSON = os.path.join(OUT_DIR, "net.json")

LIVE = "https://studynote.chosenecho.dpdns.org"
LOCAL = "http://127.0.0.1:8123"

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36")

PAGES = [
    "/",
    "/chapters/chapter-1/",
    "/chapters/chapter-2/",
    "/chapters/chapter-3/",
    "/chapters/chapter-4/",
    "/chapters/chapter-5/",
    "/chapters/chapter-6/",
    "/computer-organization/chapter-1/",
    "/computer-organization/chapter-2/",
    "/computer-organization/chapter-3/",
    "/computer-organization/chapter-4/",
    "/computer-organization/chapter-5/",
    "/computer-organization/chapter-6/",
    "/lab/scheduling/",
    "/404.html",
]

STATIC = [
    "/sitemap.xml",
    "/sitemap.xml.gz",
    "/robots.txt",
    "/assets/notes.css",
    "/assets/interactions.js",
    "/assets/javascripts/bundle.d7400e89.min.js",
    "/assets/javascripts/workers/search.2c215733.min.js",
    "/assets/stylesheets/main.ec1eaa64.min.css",
    "/assets/stylesheets/palette.ab4e12ef.min.css",
    "/assets/favicon.svg",
    "/assets/images/favicon.png",
    "/assets/figures/%E8%BF%9B%E7%A8%8B%E4%B8%89%E6%80%81.svg",  # 进程三态.svg
    "/search/search_index.json",
]

ROUTING = [
    ("no-trailing-slash", "/chapters/chapter-1"),
    ("with-trailing-slash", "/chapters/chapter-1/"),
    ("index.html-direct", "/chapters/chapter-1/index.html"),
    ("root-index.html", "/index.html"),
    ("uppercase-path", "/CHAPTERS/CHAPTER-1/"),
    ("mixedcase-file", "/Assets/Notes.css"),
    ("double-slash", "//chapters//chapter-1//"),
    ("query-string", "/chapters/chapter-1/?utm_source=qa&x=1"),
    ("lab-dir-index", "/lab/"),
    ("lab-no-slash", "/lab"),
    ("missing-page", "/no-such-page/"),
    ("missing-asset", "/assets/nope-does-not-exist.svg"),
    ("encoded-cn-figure", "/assets/figures/%E8%BF%9B%E7%A8%8B%E4%B8%89%E6%80%81.svg"),
    ("search-index", "/search/search_index.json"),
    ("sitemap", "/sitemap.xml"),
    ("robots", "/robots.txt"),
]

HDRS_OF_INTEREST = [
    "server", "cf-ray", "cf-cache-status", "age", "cache-control", "expires",
    "last-modified", "etag", "content-type", "content-encoding", "content-length",
    "vary", "x-served-by", "x-content-type-options", "strict-transport-security",
    "content-security-policy", "x-frame-options", "referrer-policy",
    "permissions-policy", "alt-svc", "x-xss-protection", "cross-origin-opener-policy",
    "cross-origin-resource-policy", "nel", "report-to", "speculation-rules",
]


# --------------------------------------------------------------------------- http

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


OPENER_FOLLOW = urllib.request.build_opener()
OPENER_RAW = urllib.request.build_opener(NoRedirect)


def sha(b):
    return hashlib.sha256(b).hexdigest()[:16]


def fetch(url, *, follow=True, accept_encoding="identity", timeout=45, method="GET"):
    """Return dict with status/headers/body/elapsed_ms/error. Never raises."""
    req = urllib.request.Request(url, method=method)
    req.add_header("User-Agent", UA)
    req.add_header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8")
    req.add_header("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8")
    req.add_header("Accept-Encoding", accept_encoding)
    opener = OPENER_FOLLOW if follow else OPENER_RAW
    t0 = time.perf_counter()
    try:
        with opener.open(req, timeout=timeout) as r:
            body = r.read() if method != "HEAD" else b""
            ms = (time.perf_counter() - t0) * 1000.0
            hdrs = {k.lower(): v for k, v in r.headers.items()}
            return {
                "url": url, "status": r.status, "headers": hdrs, "body": body,
                "bytes": len(body), "ms": round(ms, 1),
                "sha": sha(body), "error": None,
                "final_url": r.geturl(), "http_version": getattr(r, "version", None),
            }
    except urllib.error.HTTPError as e:
        body = e.read() if method != "HEAD" else b""
        ms = (time.perf_counter() - t0) * 1000.0
        hdrs = {k.lower(): v for k, v in (e.headers or {}).items()}
        return {
            "url": url, "status": e.code, "headers": hdrs, "body": body,
            "bytes": len(body), "ms": round(ms, 1), "sha": sha(body),
            "error": None, "final_url": getattr(e, "url", url),
            "http_version": None,
        }
    except Exception as e:  # noqa: BLE001
        ms = (time.perf_counter() - t0) * 1000.0
        return {
            "url": url, "status": None, "headers": {}, "body": b"", "bytes": 0,
            "ms": round(ms, 1), "sha": None, "error": f"{type(e).__name__}: {e}",
            "final_url": url, "http_version": None,
        }


def pick_headers(h):
    return {k: h[k] for k in HDRS_OF_INTEREST if k in h}


def local_path_for(path):
    """Map a site path to the file in 站点/dist that should serve it."""
    p = path.split("?")[0]
    p = urllib.parse.unquote(p)
    if p.endswith("/"):
        p += "index.html"
    rel = p.lstrip("/").replace("/", os.sep)
    full = os.path.join(DIST, rel)
    return full if os.path.isfile(full) else None


# ------------------------------------------------------------- beacon normalisation

# Cloudflare Web Analytics injects a beacon <script> before </body>. Strip any
# variant of it (plus the wrapping comments some edge versions add) so the rest
# of the document can be compared byte-for-byte.
BEACON_SCRIPT_RE = re.compile(
    r"<script[^>]*cloudflareinsights\.com[^>]*>\s*</script>\s*", re.S | re.I)
CF_COMMENT_RE = re.compile(r"<!--\s*Cloudflare[^>]*?-->\s*", re.S | re.I)


def normalize_html(text):
    t = BEACON_SCRIPT_RE.sub("", text)
    t = CF_COMMENT_RE.sub("", t)
    return t


def line_diff(local_text, live_text, limit=14):
    import difflib
    d = list(difflib.unified_diff(
        local_text.splitlines(), live_text.splitlines(),
        fromfile="local", tofile="live", lineterm="", n=0))
    added = [l[1:] for l in d if l.startswith("+") and not l.startswith("+++")]
    removed = [l[1:] for l in d if l.startswith("-") and not l.startswith("---")]
    return {
        "diff_line_count": len(d),
        "added_lines": len(added),
        "removed_lines": len(removed),
        "added_sample": [a.strip()[:220] for a in added[:limit]],
        "removed_sample": [r.strip()[:220] for r in removed[:limit]],
    }


# ------------------------------------------------------------------------- checks

def check_parity():
    rows = []
    for path in PAGES + STATIC:
        live = fetch(LIVE + path)
        loc = local_path_for(path)
        local_bytes = None
        local_note = None
        if loc and os.path.isfile(loc):
            with open(loc, "rb") as fh:
                local_bytes = fh.read()
        else:
            local_note = "no local file"

        row = {
            "path": path,
            "live_status": live["status"],
            "live_bytes": live["bytes"],
            "live_sha": live["sha"],
            "live_ms": live["ms"],
            "live_content_encoding": live["headers"].get("content-encoding"),
            "live_content_type": live["headers"].get("content-type"),
            "local_file": os.path.relpath(loc, ROOT).replace("\\", "/") if loc else None,
            "local_bytes": len(local_bytes) if local_bytes is not None else None,
            "local_sha": sha(local_bytes) if local_bytes is not None else None,
            "local_note": local_note,
            "error": live["error"],
        }
        if local_bytes is not None and live["error"] is None:
            if local_bytes == live["body"]:
                row["verdict"] = "byte-identical"
                row["delta_bytes"] = 0
            else:
                is_html = path.endswith("/") or path.endswith(".html")
                row["delta_bytes"] = live["bytes"] - len(local_bytes)
                if is_html:
                    lt = local_bytes.decode("utf-8", "replace")
                    lv = live["body"].decode("utf-8", "replace")
                    nl, nv = normalize_html(lt), normalize_html(lv)
                    row["normalized_equal"] = (nl == nv)
                    row["normalized_delta_bytes"] = len(nv.encode()) - len(nl.encode())
                    row["diff_raw"] = line_diff(lt, lv)
                    row["diff_normalized"] = line_diff(nl, nv)
                    row["verdict"] = "beacon-only" if nl == nv else "CONTENT-DIFF"
                else:
                    # non-HTML: byte delta is a real difference
                    row["verdict"] = "BYTES-DIFFER"
                    try:
                        lt = local_bytes.decode("utf-8", "replace")
                        lv = live["body"].decode("utf-8", "replace")
                        row["diff_raw"] = line_diff(lt, lv)
                    except Exception:
                        pass
        else:
            row["verdict"] = "skip" if live["error"] is None else "live-error"
        rows.append(row)
    return rows


def check_routing():
    rows = []
    for label, path in ROUTING:
        live = fetch(LIVE + path, follow=False)
        row = {
            "label": label, "path": path,
            "live_status": live["status"],
            "live_location": live["headers"].get("location"),
            "live_bytes": live["bytes"],
            "live_ms": live["ms"],
            "live_content_type": live["headers"].get("content-type"),
            "error": live["error"],
        }
        # followed result (what a browser ends up on)
        if live["status"] in (301, 302, 307, 308):
            f = fetch(LIVE + path, follow=True)
            row["followed_status"] = f["status"]
            row["followed_url"] = f["final_url"]
            row["followed_bytes"] = f["bytes"]
            row["followed_ms"] = f["ms"]
        local = fetch(LOCAL + path, follow=False)
        row["local_status"] = local["status"]
        row["local_location"] = local["headers"].get("location")
        row["local_bytes"] = local["bytes"]
        rows.append(row)
    return rows


def check_cache():
    """Three sequential GETs per URL: cache status, age, TTFB drift."""
    rows = []
    for path in ["/", "/chapters/chapter-2/", "/assets/notes.css",
                 "/assets/javascripts/bundle.d7400e89.min.js"]:
        runs = []
        for i in range(3):
            r = fetch(LIVE + path)
            runs.append({
                "n": i + 1, "status": r["status"], "ms": r["ms"],
                "bytes": r["bytes"],
                "cf_cache_status": r["headers"].get("cf-cache-status"),
                "age": r["headers"].get("age"),
                "cache_control": r["headers"].get("cache-control"),
                "etag": r["headers"].get("etag"),
                "last_modified": r["headers"].get("last-modified"),
                "x_served_by": r["headers"].get("x-served-by"),
            })
            time.sleep(0.4)
        ms = [x["ms"] for x in runs]
        rows.append({
            "path": path, "runs": runs,
            "ms_min": min(ms), "ms_median": round(statistics.median(ms), 1),
            "ms_max": max(ms),
            "cf_cache_statuses": [x["cf_cache_status"] for x in runs],
        })
    return rows


def check_conditional():
    """Does the edge honour If-None-Match / If-Modified-Since -> 304?"""
    out = []
    for path in ["/", "/assets/notes.css"]:
        first = fetch(LIVE + path)
        etag = first["headers"].get("etag")
        lm = first["headers"].get("last-modified")
        row = {"path": path, "etag": etag, "last_modified": lm}
        for kind, hdr, val in (("if-none-match", "If-None-Match", etag),
                               ("if-modified-since", "If-Modified-Since", lm)):
            if not val:
                row[kind] = "no validator"
                continue
            req = urllib.request.Request(LIVE + path)
            req.add_header("User-Agent", UA)
            req.add_header("Accept-Encoding", "identity")
            req.add_header(hdr, val)
            t0 = time.perf_counter()
            try:
                with OPENER_FOLLOW.open(req, timeout=45) as r:
                    row[kind] = {"status": r.status, "bytes": len(r.read()),
                                 "ms": round((time.perf_counter() - t0) * 1000, 1)}
            except urllib.error.HTTPError as e:
                body = e.read()
                row[kind] = {"status": e.code, "bytes": len(body),
                             "ms": round((time.perf_counter() - t0) * 1000, 1)}
            except Exception as e:  # noqa: BLE001
                row[kind] = {"error": f"{type(e).__name__}: {e}"}
        out.append(row)
    return out


def check_compression():
    """identity vs gzip vs brotli on the same URL -> transfer bytes saved."""
    rows = []
    for path in ["/", "/chapters/chapter-2/", "/assets/notes.css",
                 "/assets/javascripts/bundle.d7400e89.min.js",
                 "/assets/stylesheets/main.ec1eaa64.min.css",
                 "/search/search_index.json", "/sitemap.xml"]:
        row = {"path": path}
        for enc in ("identity", "gzip", "br"):
            r = fetch(LIVE + path, accept_encoding=enc)
            row[enc] = {
                "status": r["status"], "bytes": r["bytes"],
                "content_encoding": r["headers"].get("content-encoding"),
                "vary": r["headers"].get("vary"),
            }
        loc = local_path_for(path)
        row["local_bytes"] = os.path.getsize(loc) if loc else None
        rows.append(row)
    return rows


def check_headers():
    out = {}
    for path in ["/", "/chapters/chapter-2/", "/assets/notes.css", "/no-such-page/"]:
        live = fetch(LIVE + path, follow=False)
        local = fetch(LOCAL + path, follow=False)
        out[path] = {
            "live_status": live["status"],
            "live": pick_headers(live["headers"]),
            "live_all_header_names": sorted(live["headers"].keys()),
            "local_status": local["status"],
            "local": pick_headers(local["headers"]),
            "local_all_header_names": sorted(local["headers"].keys()),
        }
    return out


def check_alpn_h2():
    """Negotiate ALPN against the live host to prove h2 support (curl here has no nghttp2)."""
    import socket
    host = urllib.parse.urlsplit(LIVE).hostname
    out = {"host": host}
    for proto_list in (["h2", "http/1.1"], ["http/1.1"]):
        key = "+".join(proto_list)
        ctx = ssl.create_default_context()
        try:
            ctx.set_alpn_protocols(proto_list)
            with socket.create_connection((host, 443), timeout=20) as raw:
                with ctx.wrap_socket(raw, server_hostname=host) as s:
                    out["alpn_" + key] = s.selected_alpn_protocol()
                    out["tls_version_" + key] = s.version()
                    out["cipher_" + key] = s.cipher()[0]
        except Exception as e:  # noqa: BLE001
            out["alpn_" + key] = f"error: {type(e).__name__}: {e}"
    return out


def check_curl_versions():
    """curl -w http_version / alt-svc for the live root (TLS-negotiated protocol)."""
    out = {"curl_features": None, "probes": []}
    try:
        v = subprocess.run(["curl.exe", "-V"], capture_output=True, text=True, timeout=30)
        out["curl_features"] = v.stdout.strip().splitlines()[:4]
    except Exception as e:  # noqa: BLE001
        out["curl_features"] = f"error: {e}"
    for path in ["/", "/chapters/chapter-2/", "/assets/notes.css"]:
        try:
            p = subprocess.run(
                ["curl.exe", "-sS", "-o", "NUL", "-A", UA,
                 "-w", "%{http_version} %{http_code} %{time_starttransfer} %{time_total} %{size_download}",
                 LIVE + path],
                capture_output=True, text=True, timeout=60)
            out["probes"].append({"path": path, "result": p.stdout.strip(), "stderr": p.stderr.strip()[:200]})
        except Exception as e:  # noqa: BLE001
            out["probes"].append({"path": path, "error": f"{type(e).__name__}: {e}"})
    return out


def check_sitemap():
    r = fetch(LIVE + "/sitemap.xml")
    text = r["body"].decode("utf-8", "replace")
    urls = re.findall(r"<loc>([^<]+)</loc>", text)
    with open(os.path.join(DIST, "sitemap.xml"), "rb") as fh:
        local_text = fh.read().decode("utf-8", "replace")
    local_urls = re.findall(r"<loc>([^<]+)</loc>", local_text)
    live_paths = {u.replace(LIVE, "") for u in urls}
    local_paths = {u.replace(LIVE, "") for u in local_urls}
    page_set = set(PAGES) - {"/404.html"}
    return {
        "live_status": r["status"],
        "live_bytes": r["bytes"],
        "live_url_count": len(urls),
        "live_urls": urls,
        "local_url_count": len(local_urls),
        "identical": urls == local_urls,
        "missing_from_sitemap": sorted(page_set - live_paths),
        "extra_in_sitemap": sorted(live_paths - page_set),
        "host_prefix": sorted({u.split("/")[2] for u in urls if "://" in u}),
        "robots_status": fetch(LIVE + "/robots.txt")["status"],
        "robots_local": os.path.isfile(os.path.join(DIST, "robots.txt")),
        "gzip_status": fetch(LIVE + "/sitemap.xml.gz")["status"],
    }


def check_html_meta():
    """Meta tags that matter for delivery/mobile (from the built HTML, verified live)."""
    r = fetch(LIVE + "/")
    html = r["body"].decode("utf-8", "replace")
    metas = re.findall(r"<meta\b[^>]*>", html, re.I)
    links = re.findall(r"<link\b[^>]*>", html, re.I)
    want = ("viewport", "theme-color", "apple-mobile-web-app", "mobile-web-app",
            "og:", "twitter:", "description", "robots")
    hits = {w: [m for m in metas if w in m.lower()] for w in want}
    return {
        "viewport": hits["viewport"],
        "theme_color": hits["theme-color"],
        "apple_mobile_web_app": hits["apple-mobile-web-app"],
        "mobile_web_app": hits["mobile-web-app"],
        "og": hits["og:"],
        "twitter": hits["twitter:"],
        "description": hits["description"],
        "robots": hits["robots"],
        "link_rel": sorted({re.search(r'rel="([^"]+)"', l).group(1)
                            for l in links if re.search(r'rel="([^"]+)"', l)}),
        "link_hrefs": [re.search(r'href="([^"]+)"', l).group(1)
                       for l in links if re.search(r'href="([^"]+)"', l)][:20],
        "canonical": [l for l in links if 'rel="canonical"' in l.lower()],
        "meta_count": len(metas),
        "script_srcs": re.findall(r'<script[^>]*src="([^"]+)"', html)[:12],
    }


def check_404_body():
    live = fetch(LIVE + "/no-such-page/")
    with open(os.path.join(DIST, "404.html"), "rb") as fh:
        local = fh.read()
    lt = local.decode("utf-8", "replace")
    lv = live["body"].decode("utf-8", "replace")
    return {
        "live_status": live["status"],
        "live_bytes": live["bytes"],
        "live_content_type": live["headers"].get("content-type"),
        "local_bytes": len(local),
        "matches_local_404": live["body"] == local,
        "normalized_equal": normalize_html(lt) == normalize_html(lv),
        "live_title": (re.search(r"<title>(.*?)</title>", lv, re.S) or [None, None])[1],
        "diff": line_diff(lt, lv),
        "local_server_404": fetch(LOCAL + "/no-such-page/")["status"],
        "local_server_404_bytes": fetch(LOCAL + "/no-such-page/")["bytes"],
    }


def check_worker_headers_inferred():
    """Static inspection of esa-deploy/worker/index.js -> what headers the proxy sets/strips.

    部署实验已于 2026-11-01 移出仓库（仓库是公开远端，里面有源站 IP、account id 和一个待吊销的
    Cloudflare token），现在放在 Documents\\studynote-deploy\\。这里按「仓库内 → 外部目录」两处找，
    找不到就返回 missing，不让整套检查因为一个可选文件而崩掉。
    """
    candidates = [
        os.path.join(ROOT, "esa-deploy", "worker", "index.js"),
        os.path.join(os.path.dirname(ROOT), "studynote-deploy", "worker", "index.js"),
    ]
    p = next((c for c in candidates if os.path.exists(c)), None)
    if p is None:
        return {"missing": True, "looked_in": candidates}
    with open(p, "r", encoding="utf-8") as fh:
        src = fh.read()
    return {
        "sets": {
            "x-served-by": "cf-worker-proxy" in src,
            "x-content-type-options": "nosniff" in src,
            "x-forwarded-for": 'set("X-Forwarded-For"' in src,
        },
        "deletes": [m for m in ("cf-connecting-ip", "cf-connecting-ipv6", "cf-worker") if m in src],
        "cache_ttl": 1800 if "cacheTtl: 1800" in src else None,
        "cache_ttl_by_status": 'cacheTtlByStatus' in src,
        "cache_everything": "cacheEverything: true" in src,
        "origin_timeout_ms": 15000 if "ORIGIN_TIMEOUT_MS = 15000" in src else None,
        "redirect_mode": "manual" if 'redirect: "manual"' in src else None,
        "origin": "studynote-42b.pages.dev" if "studynote-42b.pages.dev" in src else None,
        "on_error_status": 502 if "status: 502" in src else None,
        "allowed_hosts_status": 421 if "status: 421" in src else None,
        "csp_absent": "content-security-policy" not in src.lower(),
        "hsts_absent": "strict-transport-security" not in src.lower(),
        "xfo_absent": "x-frame-options" not in src.lower(),
    }


def check_redirect_loop_safety():
    """HEAD on live root with a browser-like Accept to see if beacon appears for browsers only."""
    out = {}
    for label, hdrs in (
        ("plain", {}),
        ("browser-accept", {"Accept": "text/html,application/xhtml+xml"}),
        ("browser-accept-gzip", {"Accept": "text/html", "Accept-Encoding": "gzip, deflate, br"}),
    ):
        req = urllib.request.Request(LIVE + "/")
        req.add_header("User-Agent", UA)
        req.add_header("Accept-Encoding", "identity")
        for k, v in hdrs.items():
            req.add_header(k, v)
        try:
            with OPENER_FOLLOW.open(req, timeout=45) as r:
                body = r.read()
                text = body.decode("utf-8", "replace")
                out[label] = {
                    "status": r.status, "bytes": len(body),
                    "has_beacon": "cloudflareinsights" in text,
                    "sha": sha(body),
                }
        except Exception as e:  # noqa: BLE001
            out[label] = {"error": f"{type(e).__name__}: {e}"}
    return out


# ---------------------------------------------------------------------------- main

def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    result = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "live": LIVE, "local": LOCAL, "dist": os.path.relpath(DIST, ROOT).replace("\\", "/"),
        "ua": UA,
    }
    result["parity"] = check_parity()
    result["routing"] = check_routing()
    result["cache"] = check_cache()
    result["conditional"] = check_conditional()
    result["compression"] = check_compression()
    result["headers"] = check_headers()
    result["alpn"] = check_alpn_h2()
    result["curl"] = check_curl_versions()
    result["sitemap"] = check_sitemap()
    result["html_meta"] = check_html_meta()
    result["not_found"] = check_404_body()
    result["worker_inferred"] = check_worker_headers_inferred()
    result["beacon_variants"] = check_redirect_loop_safety()

    with open(OUT_JSON, "w", encoding="utf-8") as fh:
        json.dump(result, fh, ensure_ascii=False, indent=2)

    # ---- ASCII summary on stdout
    print("=== PARITY ===")
    for r in result["parity"]:
        print(f'{r["path"]:<58} live={r["live_status"]} {r["live_bytes"]:>7}B '
              f'local={r["local_bytes"] if r["local_bytes"] is not None else "-":>7} '
              f'{r["verdict"]}')
    print("=== ROUTING ===")
    for r in result["routing"]:
        print(f'{r["label"]:<20} {r["path"]:<40} live={r["live_status"]} '
              f'loc={r["live_location"]} follow={r.get("followed_status")} local={r["local_status"]}')
    print("=== CACHE ===")
    for r in result["cache"]:
        print(f'{r["path"]:<52} statuses={r["cf_cache_statuses"]} median={r["ms_median"]}ms')
    print("=== COMPRESSION ===")
    for r in result["compression"]:
        print(f'{r["path"]:<52} id={r["identity"]["bytes"]:>7} gzip={r["gzip"]["bytes"]:>7} '
              f'br={r["br"]["bytes"]:>7} local={r["local_bytes"]}')
    print("=== ALPN ===", result["alpn"])
    print("=== CURL ===", result["curl"]["probes"])
    print("=== SITEMAP ===", {k: v for k, v in result["sitemap"].items() if k not in ("live_urls",)})
    print("=== 404 ===", {k: v for k, v in result["not_found"].items() if k != "diff"})
    print("=== BEACON ===", result["beacon_variants"])
    print("wrote", OUT_JSON)


if __name__ == "__main__":
    main()
