import urllib.request, gzip
url = "https://studynote.chosenecho.dpdns.org/"
req = urllib.request.Request(url, headers={"User-Agent":"ua/1.0","Accept-Encoding":"gzip"})
with urllib.request.urlopen(req, timeout=30) as r:
    b = r.read()
try: b = gzip.decompress(b)
except Exception: pass
t = b.decode("utf-8","replace")
print("plain URL:", r.status, len(t), "| badges:", "data-progress-chapter" in t, "| continue:", "继续复习" in t, "| inline css:", "<style>" in t)
