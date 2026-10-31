import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { dirname, resolve, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const site = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(site, '..');
const base = `/${(process.env.SITE_BASE || '').replace(/^\/+|\/+$/g, '')}`.replace(/\/$/, '');
const chapters = [
  ['第1章_操作系统简介_笔记.md', '操作系统简介', '操作系统的作用、发展、功能与体系结构，CPU 指令执行。'],
  ['第2章_进程管理_笔记.md', '进程管理', '进程状态、内核与中断、线程、同步互斥及 P/V 操作。'],
  ['第3章_进程调度与死锁_笔记.md', '进程调度与死锁', '调度算法、周转时间、死锁条件与银行家算法。'],
];
await mkdir(resolve(site, 'src/content/docs/chapters'), { recursive: true });
await mkdir(resolve(site, 'public/notes-assets'), { recursive: true });

// 每题独立成组，选项逐行排列；答案在所属题目下展开。
function formatExercises(text) {
  return text.replace(/(^## .*教材.*习题[^\n]*\n)([\s\S]*?)(?=^## |$(?![\s\S]))/gm, (_, heading, body) => {
    const parts = body.split(/(?=^### )/m);
    return heading + parts.map(part => part.replace(
      /(^\*\*\d+\.[^\n]*|^\*\*题目：[^\n]*)([\s\S]*?)(?=^\*\*\d+\.|$(?![\s\S]))/gm,
      (_, question, rest) => {
        const split = rest.search(/^(?:\*\*答案|答案：|\*\*（1）计算 Need)/m);
        const prompt = split < 0 ? rest : rest.slice(0, split);
        let answer = split < 0 ? '' : rest.slice(split).trim();
        answer = answer.replace(/^\*\*答案：([^*]+)\*\*\s*/, '**参考答案：$1**\n\n').replace(/^\*\*答案：\*\*\s*/, '').replace(/^答案：\s*/, '');
        // 支持原笔记中同一行的 A—D 选项，以及分段列出的选项。
        const formatted = prompt.replace(/^[A-D][.．][\s\S]*?(?=\n\n(?![A-D][.．])|$)/gm, options => {
          const choices = options.trim().split(/(?:[\s　]+)(?=[A-D][.．])/).filter(Boolean);
          return `<div class="exercise-options">\n\n${choices.map(choice => `- ${choice.trim()}`).join('\n\n')}\n\n</div>`;
        });
        return `<section class="exercise-item">\n\n${question}\n${formatted.trim()}\n\n${answer ? `<details class="exercise-answer">\n<summary>答案与解析</summary>\n\n${answer}\n\n</details>` : ''}\n\n</section>\n\n`;
      }
    )).join('');
  });
}

for (const [i, [file, title, description]] of chapters.entries()) {
  let text = (await readFile(resolve(source, file), 'utf8')).replace(/\r\n/g, '\n').replace(/^# .+\n+/, '');
  const assets = new Set();
  async function image(path) {
    let asset = resolve(source, decodeURI(path));
    // 第一章已有重绘 SVG，网页直接使用矢量版本。
    if (extname(asset) === '.png') {
      try { await readFile(asset.replace(/\.png$/, '.svg')); asset = asset.replace(/\.png$/, '.svg'); } catch {}
    }
    const name = basename(asset);
    if (!assets.has(name)) { await copyFile(asset, resolve(site, 'public/notes-assets', name)); assets.add(name); }
    const svg = await readFile(asset, 'utf8');
    const viewBox = svg.match(/viewBox="[^"]*?([\d.]+)\s+([\d.]+)"/);
    const width = svg.match(/\bwidth="([\d.]+)"/)?.[1] || viewBox?.[1];
    const height = svg.match(/\bheight="([\d.]+)"/)?.[1] || viewBox?.[2];
    return { url: `${base}/notes-assets/${encodeURIComponent(name)}`, dimensions: width && height ? ` width="${width}" height="${height}"` : '' };
  }
  const matches = [...text.matchAll(/!\[([^\]]*)\]\(([^)]+)\)|<img\s+src="([^"]+)"[^>]*>/g)];
  for (const match of matches) {
    const { url, dimensions } = await image(match[2] || match[3]);
    const alt = match[1] || basename(match[3], extname(match[3]));
    text = text.replace(match[0], `<img src="${url}" alt="${alt}"${dimensions} loading="lazy" decoding="async">`);
  }
  text = formatExercises(text);
  await writeFile(resolve(site, `src/content/docs/chapters/chapter-${i + 1}.md`),
    `---\ntitle: "第 ${i + 1} 章 ${title}"\ndescription: "${description}"\n---\n\n${text}`);
  console.log(`已同步第 ${i + 1} 章：${assets.size} 张插图`);
}
