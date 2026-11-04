// Lead：站内链接/资源完整性检查（不依赖 DOM 库）
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = fileURLToPath(new URL('../../dist', import.meta.url));
const htmlFiles = [];
async function walk(dir) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walk(p);
    else if (e.name.endsWith('.html')) htmlFiles.push(p);
  }
}
await walk(DIST);

const idCache = new Map();
async function ids(file) {
  if (idCache.has(file)) return idCache.get(file);
  const text = await fs.readFile(file, 'utf8');
  const set = new Set([...text.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  idCache.set(file, set);
  return set;
}
const exists = async (f) => {
  try {
    const st = await fs.stat(f);
    return st.isFile();
  } catch {
    return false;
  }
};
const toFile = async (base, urlPath) => {
  let p = path.join(base, urlPath);
  // 目录式 URL 必须 stat：早先直接 return，导致 24% 的站内链接
  // （1313 条里 315 条以 / 结尾）从未做过存在性检查，脚本永远报 broken:0。
  if (urlPath.endsWith('/')) {
    const idx = path.join(p, 'index.html');
    return (await exists(idx)) ? idx : null;
  }
  if (await exists(p)) return p;
  if (await exists(path.join(p, 'index.html'))) return path.join(p, 'index.html');
  if (await exists(p + '.html')) return p + '.html';
  return null;
};
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&#x27;/g, "'");

const brokenLinks = [];
const brokenAssets = [];
const missingAnchors = [];
let linkCount = 0;
let assetCount = 0;

for (const file of htmlFiles) {
  const html = await fs.readFile(file, 'utf8');
  const baseDir = path.dirname(file);
  const rel = path.relative(DIST, file).replace(/\\/g, '/');

  for (const m of html.matchAll(/<(?:a|link)\b[^>]*\bhref="([^"]+)"/g)) {
    const raw = decode(m[1]);
    if (/^(https?:|mailto:|tel:|javascript:|data:)/i.test(raw)) continue;
    linkCount++;
    const [p0, hash] = raw.split('#');
    const [p1] = p0.split('?');
    let target;
    if (!p1) target = file;
    else {
      const urlPath = p1.startsWith('/') ? '.' + p1 : p1;
      target = await toFile(baseDir, urlPath);
    }
    if (!target) {
      brokenLinks.push({ page: rel, href: raw });
      continue;
    }
    if (hash && target.endsWith('.html')) {
      const set = await ids(target);
      if (!set.has(hash) && !set.has(decodeURIComponent(hash))) missingAnchors.push({ page: rel, href: raw });
    }
  }
  for (const m of html.matchAll(/<img[^>]+src="([^"]+)"/g)) {
    const raw = decode(m[1]);
    if (/^(https?:|data:)/i.test(raw)) continue;
    assetCount++;
    const urlPath = raw.startsWith('/') ? '.' + raw : raw;
    const target = await toFile(baseDir, urlPath);
    if (!target) brokenAssets.push({ page: rel, src: raw });
  }
}

const result = {
  pages: htmlFiles.length,
  links: linkCount,
  linkTargets: new Set(brokenLinks.map((b) => b.href)).size,
  assets: assetCount,
  brokenLinks,
  missingAnchors,
  brokenAssets,
};
// CI 上不落盘：artifacts/ 被 gitignore，写进去只会污染工作树。
if (!process.env.CI) {
  const outFile = path.resolve('artifacts/lead/link-check.json');
  await fs.mkdir(path.dirname(outFile), { recursive: true });
  await fs.writeFile(outFile, JSON.stringify(result, null, 2), 'utf8');
}
console.log(JSON.stringify({ pages: result.pages, links: result.links, assets: result.assets, broken: brokenLinks.length, anchors: missingAnchors.length, brokenAssets: brokenAssets.length }, null, 1));
console.log(JSON.stringify(brokenLinks.slice(0, 20), null, 1));
console.log(JSON.stringify(missingAnchors.slice(0, 20), null, 1));
console.log(JSON.stringify(brokenAssets.slice(0, 10), null, 1));

// 有断链/坏资源/丢锚点就非零退出，否则这个检查永远不会让 CI 变红。
if (brokenLinks.length || brokenAssets.length || missingAnchors.length) {
  console.error(
    `FAIL broken=${brokenLinks.length} assets=${brokenAssets.length} anchors=${missingAnchors.length}`,
  );
  process.exit(1);
}
process.exit(0);
