import urllib.request, gzip
def get(path):
    req = urllib.request.Request("https://studynote.chosenecho.dpdns.org" + path, headers={"User-Agent":"ua/1.0","Accept-Encoding":"gzip"})
    with urllib.request.urlopen(req, timeout=30) as r:
        b = r.read()
    try: b = gzip.decompress(b)
    except Exception: pass
    return b.decode("utf-8","replace")
co = get("/computer-organization/chapter-1/?v=final1")
print("CO details:", co.count('class="exercise-answer"'), "| chapter-nav:", co.count('chapter-nav__link'), "| raw pipes:", "|---|" in co)
os2 = get("/chapters/chapter-2/?v=final1")
print("OS2 chapter-nav:", os2.count('chapter-nav__link'), "| badges:", os2.count('data-progress-chapter'), "| inline css:", "<style>" in os2)
home = get("/?v=final1")
print("home badges:", home.count('data-progress-chapter'), "| continue:", "继续复习" in home, "| search placeholder color present:", "--note-muted" in home)
