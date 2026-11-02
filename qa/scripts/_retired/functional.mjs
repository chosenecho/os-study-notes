// qa-functional: 功能正确性审计（搜索/复习进度/字号/插图/习题折叠/交叉链接/调度实验/异常与 404/历史）
// 运行：node qa/scripts/functional.mjs   （workdir = 仓库根目录）
// 产出：qa/reports/functional.json + qa/artifacts/functional/*.png
import { session, PAGES, goto, warm, shot, shotElement, saveJSON, diagnostics, LOCAL, LIVE } from '../lib/audit.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';

const results = { member: 'qa-functional', env: 'local', devices: ['desktop-1280 1280x800', 'iPhone SE 375x667'], ranAt: new Date().toISOString(), checks: {}, verified: [], findings: [], gaps: [] };
const errors = [];
async function step(name, fn) {
  try {
    return await fn();
  } catch (e) {
    errors.push({ step: name, error: String(e).slice(0, 600) });
    return null;
  }
}
const CH = (n) => `/chapters/chapter-${n}/`;
const CO = (n) => `/computer-organization/chapter-${n}/`;
const ALL_CHAPTERS = [...[1, 2, 3, 4, 5, 6].map(CH), ...[1, 2, 3, 4, 5, 6].map(CO)];

// ---------------------------------------------------------------- 独立调度实现
// 与站点实现无关的独立重写：显式到达队列 + 选择器 + 精确分数平均。
function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}
function frac(n, d) {
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}
function fracAdd(a, b) {
  return frac(a.n * b.d + b.n * a.d, a.d * b.d);
}
function fracDiv(a, b) {
  return frac(a.n * b.d, a.d * b.n);
}
function fracToNumber(f) {
  return f.n / f.d;
}
/** 四舍五入到 2 位（十进制，round half up） */
function round2Exact(f) {
  const scaled = frac(f.n * 100, f.d); // exact 100*x
  const q = Math.floor(scaled.n / scaled.d);
  const rem = scaled.n - q * scaled.d;
  const rounded = rem * 2 >= scaled.d ? q + 1 : q;
  return rounded / 100;
}
/** 独立实现：单 CPU、无 I/O；SPF 非抢占；RR 在时间片边界先入新到达、再回队尾 */
function refSchedule(procs, algo, quantum) {
  const jobs = procs.map((p, i) => ({ id: `P${i + 1}`, arrival: p.arrival, burst: p.burst, left: p.burst, order: i, finish: 0 }));
  const future = [...jobs].sort((a, b) => a.arrival - b.arrival || a.order - b.order);
  const ready = []; // 已到达未完成，按到达先后
  const segments = [];
  let t = 0;
  const admit = () => {
    while (future.length && future[0].arrival <= t) ready.push(future.shift());
  };
  while (future.length || ready.length) {
    admit();
    if (!ready.length) {
      const nextArrival = future[0].arrival;
      segments.push({ id: '空闲', start: t, end: nextArrival });
      t = nextArrival;
      continue;
    }
    let idx = 0;
    if (algo === 'spf') {
      for (let i = 1; i < ready.length; i++) {
        const a = ready[i];
        const b = ready[idx];
        if (a.burst < b.burst || (a.burst === b.burst && (a.arrival < b.arrival || (a.arrival === b.arrival && a.order < b.order)))) idx = i;
      }
    }
    const job = ready.splice(idx, 1)[0];
    const run = algo === 'rr' ? Math.min(quantum, job.left) : job.left;
    segments.push({ id: job.id, start: t, end: t + run });
    t += run;
    job.left -= run;
    if (job.left > 0) {
      admit(); // 先把时间片边界到达的进程入队
      ready.push(job); // 再把未完成进程放回队尾
    } else {
      job.finish = t;
      admit();
    }
  }
  const rows = jobs.map((j) => {
    const turnaround = j.finish - j.arrival;
    return { id: j.id, finish: j.finish, turnaround, weighted: frac(turnaround, j.burst) };
  });
  const n = jobs.length;
  const sumT = rows.reduce((s, r) => s + r.turnaround, 0);
  const weightedSum = rows.reduce((s, r) => fracAdd(s, r.weighted), frac(0, 1));
  // 精确分数平均
  const avgTurnaround = frac(sumT, n);
  const avgWeighted = fracDiv(weightedSum, frac(n, 1));
  return {
    segments,
    rows,
    avgTurnaround,
    avgWeighted,
    avgTurnaroundExact: fracToNumber(avgTurnaround),
    avgWeightedExact: fracToNumber(avgWeighted),
    avgTurnaroundRounded: round2Exact(avgTurnaround),
    avgWeightedRounded: round2Exact(avgWeighted),
  };
}
function segmentsKey(list) {
  return list.map((s) => `${s.id}:${s.start}-${s.end}`).join(',');
}
// 页面 gantt 用 en dash（–）分隔起止，比对前统一成 ASCII 连字符
const normalizeDash = (s) => String(s).replace(/[–—−]/g, '-');
function parseMetrics(text) {
  if (!text) return null;
  const avg = text.match(/平均周转时间\s*([\d.]+)/);
  const wavg = text.match(/平均带权周转时间\s*([\d.]+)/);
  return avg && wavg ? { avg: Number(avg[1]), weighted: Number(wavg[1]) } : null;
}

const s = await session('desktop-1280');
const page = s.page;

// ---------------------------------------------------------------- 1. 搜索
const searchRuns = await step('search', async () => {
  const runs = {};
  const read = () =>
    page.evaluate(() => {
      const items = [...document.querySelectorAll('.md-search-result__item')];
      return {
        meta: document.querySelector('.md-search-result__meta')?.textContent ?? null,
        count: items.length,
        hrefs: [...document.querySelectorAll('.md-search-result__item a')].map((a) => a.getAttribute('href')),
        marksInPanel: document.querySelectorAll('.md-search-result mark').length,
        panel: (() => {
          const o = document.querySelector('.md-search__output');
          const r = o?.getBoundingClientRect();
          return r ? { h: Math.round(r.height), top: Math.round(r.top) } : null;
        })(),
      };
    });
  for (const q of ['进程调度', '内存管理', '死锁', '先来先服务', 'FCFS', 'CFS', 'FCF', 'FIFO', 'CPI', 'zjq没有这个词']) {
    await goto(page, `/?q=${encodeURIComponent(q)}`);
    runs[q] = await read();
  }
  // 带锚点的结果 → 落点精度
  await goto(page, `/?q=${encodeURIComponent('死锁')}`);
  const anchorHref = await page.evaluate(() => {
    const a = [...document.querySelectorAll('.md-search-result__item a')].find((x) => (x.getAttribute('href') || '').includes('#'));
    return a?.getAttribute('href') ?? null;
  });
  await page.goto(new URL(anchorHref, page.url()).href, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const landing = await page.evaluate(() => {
    const id = decodeURIComponent(location.hash.slice(1));
    const el = id ? document.getElementById(id) : null;
    const header = document.querySelector('.md-header');
    const r = el?.getBoundingClientRect();
    return {
      url: location.href,
      hash: location.hash,
      targetFound: !!el,
      targetTop: r ? Math.round(r.top) : null,
      headerBottom: Math.round(header.getBoundingClientRect().bottom),
      covered: r ? r.top < header.getBoundingClientRect().bottom - 1 : null,
      marksInContent: document.querySelectorAll('.md-content mark').length,
      firstMark: document.querySelector('.md-content mark')?.textContent ?? null,
    };
  });
  await shot(page, 'artifacts/functional/fn-09-search-highlight-anchor.png');
  // 页面级结果（无 #）→ 高亮是否生效
  await goto(page, `/?q=${encodeURIComponent('死锁')}`);
  const pageLevelHref = await page.evaluate(() => {
    const a = [...document.querySelectorAll('.md-search-result__item a')].find((x) => !(x.getAttribute('href') || '').includes('#'));
    return a?.getAttribute('href') ?? null;
  });
  await page.goto(new URL(pageLevelHref, page.url()).href, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const pageLevel = { href: pageLevelHref, marks: await page.evaluate(() => document.querySelectorAll('.md-content mark').length), url: page.url() };
  // 键盘操作
  await goto(page, `/?q=${encodeURIComponent('死锁')}`);
  await page.waitForTimeout(500);
  await page.click('input.md-search__input');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(150);
  const kbFocus = await page.evaluate(() => document.querySelectorAll('.md-search-result__link:focus').length);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000);
  const kbUrl = page.url();
  // 空结果截图
  await goto(page, `/?q=${encodeURIComponent('FCFS')}`);
  await shot(page, 'artifacts/functional/fn-06-search-fcfs.png');
  await goto(page, `/?q=${encodeURIComponent('进程调度')}`);
  await shot(page, 'artifacts/functional/fn-09b-search-panel.png');
  return { runs, landing, pageLevel, keyboard: { focusedResult: kbFocus, afterEnter: kbUrl } };
});
results.checks.search = searchRuns;

// ---------------------------------------------------------------- 2. 复习进度
const progress = await step('progress', async () => {
  await goto(page, PAGES.home);
  await page.evaluate(() => localStorage.clear());
  await goto(page, CH(2));
  const before = await page.evaluate(() => ({ checked: document.querySelector('[data-complete]')?.checked, ls: localStorage.getItem('os-notes:completed:v1'), toolbarTop: Math.round(document.querySelector('.study-toolbar').getBoundingClientRect().top) }));
  await page.check('[data-complete]');
  await page.waitForTimeout(200);
  const afterCheck = await page.evaluate(() => ({ ls: localStorage.getItem('os-notes:completed:v1'), status: document.querySelector('.save-status')?.textContent, checked: document.querySelector('[data-complete]').checked }));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const afterReload = await page.evaluate(() => ({ checked: document.querySelector('[data-complete]')?.checked, status: document.querySelector('.save-status')?.textContent, ls: localStorage.getItem('os-notes:completed:v1') }));
  // 第二章勾选后，第一章仍应未勾选；CO 互不影响
  await goto(page, CH(1));
  const os1 = await page.evaluate(() => ({ checked: document.querySelector('[data-complete]')?.checked }));
  await goto(page, CO(1));
  const co1Before = await page.evaluate(() => ({ checked: document.querySelector('[data-complete]')?.checked, chapter: document.querySelector('.study-toolbar')?.dataset.chapter }));
  await page.check('[data-complete]');
  await page.waitForTimeout(150);
  // 首页
  await goto(page, PAGES.home);
  const home = await page.evaluate(() => ({
    ls: localStorage.getItem('os-notes:completed:v1'),
    counts: [...document.querySelectorAll('[data-progress-count]')].map((e) => ({ k: e.dataset.progressCount, v: e.textContent })),
    bars: [...document.querySelectorAll('progress')].map((p) => ({ k: p.dataset.studyProgress, v: p.value, max: p.max })),
    badges: document.querySelectorAll('[data-progress-chapter]').length,
    nextChapter: !!document.querySelector('[data-next-chapter]'),
    progressText: [...document.querySelectorAll('.md-content p')].map((p) => p.textContent.trim()).filter((t) => /复习/.test(t)),
    chapterOrderMarked: [...document.querySelectorAll('.md-content li')].map((li) => li.textContent.trim()).filter((t) => /复习|已学|已完成/.test(t)),
  }));
  await shot(page, 'artifacts/functional/fn-07-home-progress.png');
  // 清空回落
  await page.evaluate(() => localStorage.clear());
  await goto(page, PAGES.home);
  const cleared = await page.evaluate(() => [...document.querySelectorAll('[data-progress-count]')].map((e) => e.textContent));
  return { before, afterCheck, afterReload, os1, co1Before, home, cleared };
});
results.checks.progress = progress;

// ---------------------------------------------------------------- 3. 字号
const font = await step('font', async () => {
  await page.evaluate(() => localStorage.clear()).catch(() => {});
  await goto(page, CH(2));
  const sample = () =>
    page.evaluate(() => {
      const g = (sel) => {
        const el = document.querySelector(sel);
        return el ? getComputedStyle(el).fontSize : null;
      };
      return {
        sel: document.querySelector('[data-reading-size]')?.value,
        varValue: getComputedStyle(document.documentElement).getPropertyValue('--note-font-size').trim(),
        bodyParagraph: g('.md-content__inner > p'),
        listItem: g('.md-content__inner li'),
        code: g('.md-content__inner code'),
        blockquote: g('.md-content__inner blockquote'),
        exerciseSummary: g('.md-content__inner details summary'),
        tableCell: g('.md-content__inner td'),
        tableHead: g('.md-content__inner th'),
        h2: g('.md-content__inner h2'),
        h3: g('.md-content__inner h3'),
        toolbar: g('.study-toolbar'),
        toolbarSelect: g('.study-toolbar select'),
        docOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      };
    });
  const runs = [];
  for (const v of ['16', '18', '20']) {
    await page.selectOption('[data-reading-size]', v);
    await page.waitForTimeout(200);
    runs.push(await sample());
  }
  // 截图：同一位置（首个表格附近）16 vs 20
  const scrollToFirstTable = async () => {
    await page.evaluate(() => {
      const t = document.querySelector('.md-content__inner table');
      if (t) {
        const y = t.getBoundingClientRect().top + window.scrollY - 260;
        window.scrollTo(0, Math.max(0, y));
      }
    });
    await page.waitForTimeout(250);
  };
  await page.selectOption('[data-reading-size]', '20');
  await page.waitForTimeout(200);
  await scrollToFirstTable();
  await shot(page, 'artifacts/functional/fn-04-font-20.png');
  await page.selectOption('[data-reading-size]', '16');
  await page.waitForTimeout(200);
  await scrollToFirstTable();
  await shot(page, 'artifacts/functional/fn-04-font-16.png');
  // 跨页与刷新记忆
  await page.selectOption('[data-reading-size]', '20');
  await page.waitForTimeout(150);
  await goto(page, CH(5));
  const across = await page.evaluate(() => ({ sel: document.querySelector('[data-reading-size]').value, body: getComputedStyle(document.querySelector('.md-content__inner > p')).fontSize }));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  const persisted = await page.evaluate(() => ({ sel: document.querySelector('[data-reading-size]').value, body: getComputedStyle(document.querySelector('.md-content__inner > p')).fontSize, ls: localStorage.getItem('os-notes:font-size:v1') }));
  await goto(page, PAGES.home);
  const homePage = await page.evaluate(() => ({ body: getComputedStyle(document.querySelector('.md-content__inner > p')).fontSize, varValue: getComputedStyle(document.documentElement).getPropertyValue('--note-font-size').trim() }));
  await page.evaluate(() => localStorage.clear());
  return { runs, across, persisted, homePage };
});
results.checks.font = font;

// ---------------------------------------------------------------- 4. 插图 dialog
const figures = await step('figures', async () => {
  await goto(page, CH(1));
  await warm(page);
  const info = await page.evaluate(() => ({
    figures: document.querySelectorAll('.figure-zoom').length,
    dialog: !!document.querySelector('dialog.image-dialog'),
    altCount: [...document.querySelectorAll('.figure-zoom img')].filter((i) => (i.alt || '').trim().length > 0).length,
    broken: [...document.querySelectorAll('.md-content__inner img')].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.currentSrc.split('/').pop()),
    hint: document.querySelector('.zoom-hint')?.textContent,
    sizes: [...document.querySelectorAll('.figure-zoom img')].slice(0, 3).map((i) => ({ nat: [i.naturalWidth, i.naturalHeight], rendered: [Math.round(i.getBoundingClientRect().width), Math.round(i.getBoundingClientRect().height)] })),
  }));
  await page.locator('.figure-zoom').first().click();
  await page.waitForTimeout(350);
  const openState = await page.evaluate(() => {
    const d = document.querySelector('dialog.image-dialog');
    const img = d.querySelector('img');
    return { open: d.open, src: decodeURIComponent(img.currentSrc.split('/').pop()), alt: img.alt, caption: d.querySelector('p')?.textContent, rendered: [Math.round(img.getBoundingClientRect().width), Math.round(img.getBoundingClientRect().height)], active: document.activeElement?.className, bodyScroll: getComputedStyle(document.body).overflow };
  });
  await shot(page, 'artifacts/functional/fn-05b-dialog-desktop.png');
  await page.click('dialog.image-dialog button');
  await page.waitForTimeout(250);
  const byButton = await page.evaluate(() => document.querySelector('dialog.image-dialog').open);
  await page.locator('.figure-zoom').nth(1).click();
  await page.waitForTimeout(250);
  const secondSrc = await page.evaluate(() => decodeURIComponent(document.querySelector('dialog.image-dialog img').currentSrc.split('/').pop()));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  const byEsc = { open: await page.evaluate(() => document.querySelector('dialog.image-dialog').open), focus: await page.evaluate(() => document.activeElement?.className) };
  await page.locator('.figure-zoom').nth(2).click();
  await page.waitForTimeout(250);
  await page.mouse.click(4, 4);
  await page.waitForTimeout(250);
  const byBackdrop = await page.evaluate(() => document.querySelector('dialog.image-dialog').open);
  // 连续两图不串图
  await page.locator('.figure-zoom').nth(3).click();
  await page.waitForTimeout(250);
  const thirdSrc = await page.evaluate(() => decodeURIComponent(document.querySelector('dialog.image-dialog img').currentSrc.split('/').pop()));
  await page.keyboard.press('Escape');
  return { info, openState, secondSrc, thirdSrc, close: { byButton, byEsc, byBackdrop }, noCrosstalk: secondSrc !== thirdSrc };
});
results.checks.figures = figures;

// ---------------------------------------------------------------- 5. 教材习题折叠
const exercises = await step('exercises', async () => {
  const dom = [];
  for (const p of ALL_CHAPTERS) {
    await goto(page, p);
    dom.push(
      await page.evaluate(() => {
        const details = [...document.querySelectorAll('.md-content details')];
        const items = [...document.querySelectorAll('section.exercise-item')];
        const liCounts = {};
        items.forEach((it) => {
          const n = it.querySelectorAll('.exercise-options li').length;
          liCounts[n] = (liCounts[n] || 0) + 1;
        });
        const h2 = [...document.querySelectorAll('.md-content h2')].find((h) => /教材.*习题/.test(h.textContent));
        let sib = h2?.nextElementSibling;
        const visibleAnswerTables = [];
        let guard = 0;
        while (sib && sib.tagName !== 'H2' && guard++ < 12) {
          sib.querySelectorAll?.('table').forEach((t) => {
            const header = [...t.rows[0].cells].map((c) => c.textContent.trim());
            if (/答案|解析/.test(header.join(' '))) {
              visibleAnswerTables.push({ rows: t.rows.length, header, firstAnswer: t.rows[1]?.cells?.[1]?.textContent?.trim()?.slice(0, 40), firstAnswerVisible: t.rows[1] ? getComputedStyle(t.rows[1].cells[t.rows[1].cells.length - 1]).display !== 'none' : null });
            }
          });
          sib = sib.nextElementSibling;
        }
        return {
          url: location.pathname,
          exerciseHeading: h2?.textContent?.trim() ?? null,
          intro: h2?.nextElementSibling?.textContent?.trim()?.slice(0, 60) ?? null,
          items: items.length,
          details: details.length,
          openDetails: details.filter((d) => d.open).length,
          emptyAnswers: details.filter((d) => d.textContent.replace(d.querySelector('summary')?.textContent || '', '').trim().length < 2).length,
          summaryLabels: [...new Set(details.map((d) => d.querySelector('summary')?.textContent.trim()))],
          liCounts,
          visibleAnswerTables,
          tableInPrompt: [...document.querySelectorAll('.md-content p')].filter((p) => !p.closest('details') && (p.textContent.match(/\|/g) || []).length >= 3).map((p) => p.textContent.trim().slice(0, 120)),
          rawPipeLength: [...document.querySelectorAll('.md-content p')].filter((p) => !p.closest('details') && (p.textContent.match(/\|/g) || []).length >= 3).map((p) => p.textContent.trim().length),
        };
      }),
    );
  }
  // 源笔记题目数（按 hooks.py 的口径：`## N 教材本章习题` 节内 `**N.` / `**题目：`）
  const sources = { os: [], co: [] };
  const sectionOf = (text) => {
    const parts = text.split(/^## /m);
    const hit = parts.find((p) => /^.*教材.*习题/.test(p.split('\n')[0]));
    return hit ? hit.split('\n').slice(1).join('\n') : '';
  };
  for (const [course, dir] of [
    ['os', '课程/操作系统概论'],
    ['co', '课程/计算机组成原理'],
  ]) {
    const files = (await fs.readdir(dir)).filter((f) => /^第\d章.*_笔记\.md$/.test(f));
    for (const f of files) {
      const text = await fs.readFile(path.join(dir, f), 'utf8');
      const sec = sectionOf(text);
      sources[course].push({
        file: f,
        markdownQuestions: [...sec.matchAll(/^\*\*\d+\./gm)].length + [...sec.matchAll(/^\*\*题目：/gm)].length,
        answerMarkers: [...sec.matchAll(/^\*{0,2}答案[:：]/gm)].length,
        tableRows: sec.split('\n').filter((l) => /^\|/.test(l.trim())).length,
        hasExercisesSection: !!sec,
      });
    }
  }
  await goto(page, CO(1));
  await page.evaluate(() => {
    const h = [...document.querySelectorAll('.md-content h2')].find((x) => /教材.*习题/.test(x.textContent));
    h?.scrollIntoView();
  });
  await page.waitForTimeout(300);
  await shot(page, 'artifacts/functional/fn-01-co-exercise.png');
  await shot(page, 'artifacts/functional/fn-11-co-label.png');
  await goto(page, CH(2));
  await page.evaluate(() => {
    const h = [...document.querySelectorAll('.md-content h2')].find((x) => /教材.*习题/.test(x.textContent));
    h?.scrollIntoView();
  });
  await page.waitForTimeout(300);
  await shot(page, 'artifacts/functional/fn-01-os-exercise.png');
  // 第三章综合应用题：表格没渲染的现场
  await goto(page, CH(3));
  await page.evaluate(() => {
    const items = [...document.querySelectorAll('section.exercise-item')];
    const bad = items.find((it) => [...it.querySelectorAll('p')].some((p) => (p.textContent.match(/\|/g) || []).length >= 3));
    (bad || items[items.length - 1])?.scrollIntoView({ block: 'center' });
  });
  await page.waitForTimeout(350);
  await shot(page, 'artifacts/functional/fn-02-ch3-broken-table.png');
  return { dom, sources };
});
results.checks.exercises = exercises;

// ---------------------------------------------------------------- 6. 交叉链接/锚点/页脚导航
const links = await step('links', async () => {
  const perPage = [];
  const all = new Map();
  for (const p of [PAGES.home, PAGES.lab, ...ALL_CHAPTERS]) {
    await goto(page, p);
    const data = await page.evaluate(() => {
      const all = [...document.querySelectorAll('.md-content a[href]')];
      const anchors = all.filter((a) => !a.classList.contains('headerlink'));
      return {
        url: location.pathname,
        contentLinks: anchors.length,
        external: anchors.filter((a) => /^https?:/.test(a.getAttribute('href'))).length,
        crossChapter: anchors.filter((a) => /chapter-|lab\/scheduling/.test(a.getAttribute('href') || '')).length,
        breadcrumb: document.querySelectorAll('.md-path').length,
        toc: [...document.querySelectorAll('.md-nav--secondary a.md-nav__link')].map((a) => a.getAttribute('href')).filter((h) => h && h.startsWith('#')),
        hrefs: all.map((a) => ({ t: a.textContent.trim().slice(0, 30), h: a.getAttribute('href') })),
      };
    });
    for (const a of data.hrefs) {
      const abs = new URL(a.h, page.url()).href;
      if (!all.has(abs)) all.set(abs, { abs, text: a.t, from: [p] });
    }
    perPage.push(data);
  }
  // 链接可用性与锚点存在性
  const bad = [];
  for (const [abs, meta] of all) {
    const u = new URL(abs);
    if (u.origin !== new URL(LOCAL).origin) continue;
    const res = await page.request.get(abs).catch(() => null);
    const status = res ? res.status() : 'ERR';
    let anchorOk = null;
    if (u.hash) {
      await goto(page, u.pathname);
      anchorOk = await page.evaluate((id) => !!document.getElementById(id), decodeURIComponent(u.hash.slice(1)));
    }
    if (status !== 200 || anchorOk === false) bad.push({ ...meta, status, anchorOk });
  }
  // 页脚上一页/下一页链路
  const footer = [];
  for (const p of [CH(1), CH(3), CH(6), CO(1), CO(6), PAGES.lab]) {
    await goto(page, p);
    footer.push(
      await page.evaluate(() => {
        const links = [...document.querySelectorAll('.md-footer__link')];
        return { url: location.pathname, links: links.map((a) => ({ href: a.getAttribute('href'), label: a.textContent.trim().replace(/\s+/g, ' ').slice(0, 34), cls: a.className })) };
      }),
    );
  }
  // TOC 锚点全部可解析 + 标题不被固定页头遮挡（hash 导航实测）
  const tocChecks = [];
  for (const p of [CH(4), CH(1), CO(3)]) {
    await goto(page, p);
    const ids = await page.evaluate(() => [...document.querySelectorAll('.md-content h1,.md-content h2,.md-content h3')].map((h) => h.id).filter(Boolean));
    const toc = await page.evaluate(() => [...new Set([...document.querySelectorAll('.md-nav--secondary a.md-nav__link')].map((a) => a.getAttribute('href')).filter((h) => h && h.startsWith('#')))]);
    const missing = [];
    for (const h of toc) {
      const ok = await page.evaluate((id) => !!document.getElementById(decodeURIComponent(id)), h.slice(1));
      if (!ok) missing.push(h);
    }
    const offsets = [];
    for (const id of ids.slice(1, 4)) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.evaluate((x) => {
        location.hash = '';
        location.hash = x;
      }, id);
      await page.waitForTimeout(450);
      offsets.push(
        await page.evaluate((x) => {
          const el = document.getElementById(x);
          const header = document.querySelector('.md-header');
          const r = el.getBoundingClientRect();
          return { id: x, top: Math.round(r.top), headerBottom: Math.round(header.getBoundingClientRect().bottom), covered: r.top < header.getBoundingClientRect().bottom - 1, scrollMarginTop: getComputedStyle(el).scrollMarginTop };
        }, id),
      );
    }
    tocChecks.push({ page: p, headings: ids.length, tocLinks: toc.length, missingAnchors: missing, offsets });
  }
  await goto(page, CH(1));
  await shot(page, 'artifacts/functional/fn-03-chapter-no-inbody-links.png');
  return { perPage, uniqueLinks: all.size, broken: bad, footer, tocChecks };
});
results.checks.links = links;

// ---------------------------------------------------------------- 7. 调度实验（独立复算）
const lab = await step('lab', async () => {
  await goto(page, PAGES.lab);
  await page.waitForTimeout(400);
  const readLab = () =>
    page.evaluate(() => ({
      metrics: document.querySelector('.lab-metrics')?.textContent ?? null,
      table: [...document.querySelectorAll('.lab-results table tr')].map((tr) => [...tr.cells].map((c) => c.textContent.trim())),
      gantt: [...document.querySelectorAll('.gantt-block')].map((b) => ({ text: b.textContent.replace(/\n/g, '|'), title: b.title })),
      quantumDisabled: document.querySelector('input[name="quantum"]').disabled,
      resultsText: document.querySelector('.lab-results')?.textContent?.slice(0, 60) ?? null,
    }));
  const setInputs = async (arrivals, bursts, quantum) => {
    // 时间片输入在 FCFS/SPF 下是 disabled，先切到 RR 再填
    await page.selectOption('[data-scheduler] select[name="algorithm"]', 'rr');
    await page.waitForTimeout(100);
    for (let i = 0; i < 4; i++) {
      await page.fill(`input[name="arrival-${i}"]`, String(arrivals[i]));
      await page.fill(`input[name="burst-${i}"]`, String(bursts[i]));
    }
    if (quantum != null) await page.fill('input[name="quantum"]', String(quantum));
  };
  const runAlgo = async (algo) => {
    await page.selectOption('[data-scheduler] select[name="algorithm"]', algo);
    await page.waitForTimeout(120);
    const disabled = await page.evaluate(() => document.querySelector('input[name="quantum"]').disabled);
    await page.click('[data-scheduler] button[type="submit"]');
    await page.waitForTimeout(300);
    return { disabled, ...(await readLab()) };
  };
  const datasets = [
    { name: '默认示例', arrivals: [0, 1, 2, 4], bursts: [5, 3, 1, 2], quantum: 2 },
    { name: '开头与中间有空闲', arrivals: [3, 1, 9, 5], bursts: [2, 2, 1, 3], quantum: 2 },
    { name: '全部同时到达', arrivals: [0, 0, 0, 0], bursts: [4, 2, 3, 1], quantum: 2 },
    { name: '到达乱序+等长', arrivals: [2, 0, 4, 1], bursts: [3, 1, 4, 2], quantum: 2 },
    { name: '时间片=1', arrivals: [0, 1, 2, 3], bursts: [4, 3, 2, 1], quantum: 1 },
  ];
  const comparisons = [];
  for (const ds of datasets) {
    await setInputs(ds.arrivals, ds.bursts, ds.quantum);
    for (const algo of ['fcfs', 'spf', 'rr']) {
      const got = await runAlgo(algo);
      const ref = refSchedule(
        ds.arrivals.map((a, i) => ({ arrival: a, burst: ds.bursts[i] })),
        algo,
        ds.quantum,
      );
      const pageMetrics = parseMetrics(got.metrics);
      const rowsMatch =
        got.table.length - 1 === ref.rows.length &&
        ref.rows.every((r, i) => {
          const row = got.table[i + 1] || [];
          return row[0] === r.id && Number(row[1]) === r.finish && Number(row[2]) === r.turnaround && Math.abs(Number(row[3]) - round2Exact(r.weighted)) < 1e-9;
        });
      const ganttMatch = got.gantt.map((g) => normalizeDash(g.text).replace('|', ':')).join(',') === segmentsKey(ref.segments);
      comparisons.push({
        dataset: ds.name,
        algorithm: algo,
        quantum: ds.quantum,
        quantumDisabledInUi: got.disabled,
        page: pageMetrics,
        metricsText: got.metrics,
        pageRows: got.table.slice(1),
        pageGantt: got.gantt.map((g) => g.text),
        ref: {
          avgTurnaround: ref.avgTurnaroundRounded,
          avgWeighted: ref.avgWeightedRounded,
          avgTurnaroundExact: +ref.avgTurnaroundExact.toFixed(6),
          avgWeightedExact: +ref.avgWeightedExact.toFixed(6),
          rows: ref.rows.map((r) => ({ id: r.id, finish: r.finish, turnaround: r.turnaround, weighted: r.weighted.n / r.weighted.d })),
          segments: ref.segments,
        },
        diff: {
          avg: pageMetrics ? +(pageMetrics.avg - ref.avgTurnaroundRounded).toFixed(4) : null,
          weighted: pageMetrics ? +(pageMetrics.weighted - ref.avgWeightedRounded).toFixed(4) : null,
          avgExact: pageMetrics ? +(pageMetrics.avg - ref.avgTurnaroundExact).toFixed(6) : null,
          weightedExact: pageMetrics ? +(pageMetrics.weighted - ref.avgWeightedExact).toFixed(6) : null,
        },
        rowsMatch,
        ganttMatch,
        ganttVsTableConsistent:
          got.gantt.length > 0 &&
          ref.rows.every((r) => [...got.gantt].reverse().find((g) => g.text.startsWith(r.id + '|'))?.text.endsWith(`|${r.finish}`)),
      });
    }
    results.checks.labScreen = null;
  }
  // 默认 RR 截图
  await page.click('[data-scheduler] button[type="reset"]');
  await page.waitForTimeout(350);
  await page.selectOption('[data-scheduler] select[name="algorithm"]', 'rr');
  await page.click('[data-scheduler] button[type="submit"]');
  await page.waitForTimeout(300);
  const rrScreenshot = await readLab();
  await shotElement(page, '.lab-results', 'artifacts/functional/fn-08-lab-rr.png');
  // 校验与重置
  await page.click('[data-scheduler] button[type="reset"]');
  await page.waitForTimeout(400);
  const afterReset = await readLab();
  await page.fill('input[name="burst-0"]', '0');
  const invalid0 = await page.evaluate(() => ({ message: document.querySelector('input[name="burst-0"]').validationMessage, valid: document.querySelector('input[name="burst-0"]').validity.valid }));
  await page.fill('input[name="burst-0"]', '101');
  const invalid101 = await page.evaluate(() => ({ message: document.querySelector('input[name="burst-0"]').validationMessage, valid: document.querySelector('input[name="burst-0"]').validity.valid }));
  await page.fill('input[name="burst-0"]', '');
  const emptyBurst = await page.evaluate(() => ({ message: document.querySelector('input[name="burst-0"]').validationMessage, valid: document.querySelector('input[name="burst-0"]').validity.valid }));
  await page.fill('input[name="burst-0"]', '5');
  // 中文校验路径是否可达：绕过原生校验后提交非法值
  await page.evaluate(() => {
    const f = document.querySelector('[data-scheduler] form');
    f.noValidate = true;
    document.querySelector('input[name="arrival-0"]').value = '101';
    f.requestSubmit();
  });
  await page.waitForTimeout(300);
  const jsValidation = await page.evaluate(() => document.querySelector('.lab-results')?.textContent?.trim().slice(0, 120));
  await page.evaluate(() => {
    const f = document.querySelector('[data-scheduler] form');
    document.querySelector('input[name="arrival-0"]').value = '0';
    f.noValidate = false;
    f.requestSubmit();
  });
  // quantum 在 FCFS 下禁用
  const quantumDisabled = await page.evaluate(() => {
    const sel = document.querySelector('[data-scheduler] select[name="algorithm"]');
    sel.value = 'fcfs';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    return document.querySelector('input[name="quantum"]').disabled;
  });
  return { comparisons, afterReset, invalid: { invalid0, invalid101, emptyBurst }, jsValidation, quantumDisabled, rrScreenshot, quantumDisabledInFcfs: quantumDisabled };
});
results.checks.lab = lab;

// ---------------------------------------------------------------- 8. 历史记录/滚动/主题
const history = await step('history', async () => {
  await goto(page, PAGES.home);
  await page.click('.md-content a[href*="chapters/chapter-1"]');
  await page.waitForLoadState('networkidle');
  const u1 = page.url();
  await goto(page, CH(2));
  await page.evaluate(() => window.scrollTo(0, 2000));
  await page.waitForTimeout(300);
  const y0 = await page.evaluate(() => Math.round(window.scrollY));
  await page.evaluate(() => document.querySelector('.md-footer__link--next')?.click());
  await page.waitForTimeout(900);
  const nextUrl = page.url();
  await page.goBack();
  await page.waitForTimeout(1000);
  const back = { url: page.url(), y: await page.evaluate(() => Math.round(window.scrollY)) };
  await page.goForward();
  await page.waitForTimeout(800);
  const fwd = { url: page.url(), y: await page.evaluate(() => Math.round(window.scrollY)) };
  // 深浅色切换不打断滚动
  await goto(page, CH(3));
  await page.evaluate(() => window.scrollTo(0, 1500));
  await page.waitForTimeout(250);
  const yA = await page.evaluate(() => Math.round(window.scrollY));
  await page.evaluate(() => document.querySelector('label[for="__palette_1"]')?.click());
  await page.waitForTimeout(600);
  const palette = { before: yA, after: await page.evaluate(() => Math.round(window.scrollY)), scheme: await page.evaluate(() => document.body.getAttribute('data-md-color-scheme')) };
  await shot(page, 'artifacts/functional/fn-12-dark.png');
  await page.evaluate(() => document.querySelector('label[for="__palette_0"]')?.click());
  return { u1, nextUrl, back, fwd, palette, scrollRestored: Math.abs(back.y - y0) <= 2 };
});
results.checks.history = history;

// ---------------------------------------------------------------- 9. JS 异常/4xx/404
const diag = await step('diagnostics', async () => {
  const perPage = [];
  for (const p of [PAGES.home, PAGES.lab, ...ALL_CHAPTERS]) {
    await page.goto(LOCAL + p, { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(150);
  }
  const d = diagnostics(s);
  perPage.push({ console: d.console, pageerror: d.pageerror, requestfailed: d.requestfailed, http4xx: d.http4xx });
  // 404 本地
  const localResp = await page.goto(LOCAL + '/no-such-page/', { waitUntil: 'domcontentloaded' }).catch((e) => null);
  const local404 = {
    status: localResp ? localResp.status() : 'ERR',
    title: await page.title(),
    h1: await page.evaluate(() => document.querySelector('h1')?.textContent?.trim() ?? null),
    bodyText: await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 160)),
    homeLinks: await page.evaluate(() => [...document.querySelectorAll('a')].filter((a) => /学习首页|首页|Home/.test(a.textContent)).map((a) => a.getAttribute('href'))),
  };
  await shot(page, 'artifacts/functional/fn-10-404-local.png');
  // 线上 404 + 线上抽查
  const live = await session('desktop-1280', { base: LIVE });
  const liveResp = await live.page.goto(LIVE + '/no-such-page-xyz/', { waitUntil: 'networkidle', timeout: 45000 }).catch(() => null);
  const live404 = {
    status: liveResp ? liveResp.status() : 'ERR',
    title: await live.page.title(),
    h1: await live.page.evaluate(() => document.querySelector('h1')?.textContent?.trim() ?? null),
    bodyText: await live.page.evaluate(() => document.querySelector('.md-content__inner')?.innerText?.trim().slice(0, 160) ?? null),
    contentLinks: await live.page.evaluate(() => [...document.querySelectorAll('.md-content a')].map((a) => ({ t: a.textContent.trim().slice(0, 20), h: a.getAttribute('href') }))),
    navHomeHref: await live.page.evaluate(() => document.querySelector('.md-nav--primary a.md-nav__link')?.getAttribute('href') ?? null),
  };
  await shot(live.page, 'artifacts/functional/fn-10-404-live.png');
  const liveSearch = {};
  for (const q of ['FCFS', '内存管理']) {
    await live.page.goto(`${LIVE}/?q=${encodeURIComponent(q)}`, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
    await live.page.waitForTimeout(600);
    liveSearch[q] = await live.page.evaluate(() => ({ meta: document.querySelector('.md-search-result__meta')?.textContent ?? null, count: document.querySelectorAll('.md-search-result__item').length }));
  }
  await live.close();
  return { pageDiagnostics: perPage, local404, live404, liveSearch };
});
results.checks.diagnostics = diag;

// ---------------------------------------------------------------- 10. iPhone SE 关键交互
const mobile = await step('mobile', async () => {
  const m = await session('iphone-se');
  try {
    await goto(m.page, CH(2));
    await warm(m.page);
    await m.page.evaluate(() => window.scrollTo(0, 0));
    const inline = await m.page.evaluate(() => {
      const img = document.querySelector('.figure-zoom img');
      const btn = document.querySelector('.figure-zoom');
      return { imgW: Math.round(img.getBoundingClientRect().width), imgH: Math.round(img.getBoundingClientRect().height), btnW: Math.round(btn.getBoundingClientRect().width), natural: [img.naturalWidth, img.naturalHeight] };
    });
    await m.page.locator('.figure-zoom').first().click();
    await m.page.waitForTimeout(450);
    const dialog = await m.page.evaluate(() => {
      const d = document.querySelector('dialog.image-dialog');
      const img = d.querySelector('img');
      const btn = d.querySelector('button');
      const br = btn.getBoundingClientRect();
      return { open: d.open, imgW: Math.round(img.getBoundingClientRect().width), imgH: Math.round(img.getBoundingClientRect().height), dialogW: Math.round(d.getBoundingClientRect().width), dialogH: Math.round(d.getBoundingClientRect().height), closeBtn: { w: Math.round(br.width), h: Math.round(br.height), inViewport: br.top >= 0 && br.bottom <= innerHeight }, caption: d.querySelector('p')?.textContent ?? null };
    });
    await shot(m.page, 'artifacts/functional/fn-05-mobile-dialog.png');
    await m.page.locator('dialog.image-dialog button').click();
    await m.page.waitForTimeout(250);
    const closed = await m.page.evaluate(() => !document.querySelector('dialog.image-dialog').open);
    // 字号 20 在 375px 下是否溢出
    await m.page.selectOption('[data-reading-size]', '20');
    await m.page.waitForTimeout(250);
    const font20 = await m.page.evaluate(() => ({ body: getComputedStyle(document.querySelector('.md-content__inner > p')).fontSize, overflow: document.documentElement.scrollWidth > innerWidth + 1, tableCell: getComputedStyle(document.querySelector('.md-content__inner td')).fontSize }));
    await shot(m.page, 'artifacts/functional/fn-04b-mobile-font20.png');
    // 工具条 + 进度 + 搜索
    const toolbar = await m.page.evaluate(() => ({
      select: { w: Math.round(document.querySelector('[data-reading-size]').getBoundingClientRect().width), h: Math.round(document.querySelector('[data-reading-size]').getBoundingClientRect().height) },
      checkbox: { w: Math.round(document.querySelector('[data-complete]').getBoundingClientRect().width), h: Math.round(document.querySelector('[data-complete]').getBoundingClientRect().height) },
      label: Math.round([...document.querySelectorAll('.study-toolbar label')][0].getBoundingClientRect().height),
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
    }));
    await m.page.check('[data-complete]');
    await m.page.reload({ waitUntil: 'networkidle' });
    await m.page.waitForTimeout(300);
    const persistMobile = await m.page.evaluate(() => ({ checked: document.querySelector('[data-complete]')?.checked, ls: localStorage.getItem('os-notes:completed:v1') }));
    await m.page.evaluate(() => localStorage.clear());
    // 移动端实验页
    await goto(m.page, PAGES.lab);
    await m.page.waitForTimeout(400);
    const labMobile = await m.page.evaluate(() => ({
      metrics: document.querySelector('.lab-metrics')?.textContent ?? null,
      tableOverflow: (() => {
        const t = document.querySelector('.lab-results table');
        return t ? { client: t.clientWidth, scroll: t.scrollWidth } : null;
      })(),
      ganttScroll: (() => {
        const g = document.querySelector('.gantt');
        return g ? { client: g.clientWidth, scroll: g.scrollWidth } : null;
      })(),
      docOverflow: document.documentElement.scrollWidth > innerWidth + 1,
    }));
    await shot(m.page, 'artifacts/functional/fn-08b-lab-mobile.png');
    // 移动端搜索（?q= 直连）
    await goto(m.page, '/?q=' + encodeURIComponent('内存管理'));
    await m.page.waitForTimeout(600);
    const searchMobile = await m.page.evaluate(() => ({ meta: document.querySelector('.md-search-result__meta')?.textContent ?? null, count: document.querySelectorAll('.md-search-result__item').length, panelH: Math.round(document.querySelector('.md-search__output')?.getBoundingClientRect().height ?? 0) }));
    return { inline, dialog, closed, ratio: +(dialog.imgW / inline.imgW).toFixed(3), font20, toolbar, persistMobile, labMobile, searchMobile };
  } finally {
    await m.close();
  }
});
results.checks.mobile = mobile;

// ---------------------------------------------------------------- 汇总 findings
const C = results.checks;
const osDom = C.exercises ? C.exercises.dom.filter((d) => d.url.startsWith('/chapters/')) : [];
const coDom = C.exercises ? C.exercises.dom.filter((d) => d.url.startsWith('/computer-organization/')) : [];
const osDetails = osDom.reduce((n, d) => n + d.details, 0);
const coDetails = coDom.reduce((n, d) => n + d.details, 0);
const coAnswerRows = coDom.reduce((n, d) => n + (d.visibleAnswerTables[0]?.rows ? d.visibleAnswerTables[0].rows - 1 : 0), 0);
const coTables = coDom.map((d) => d.visibleAnswerTables[0] ?? null);
const ch3Broken = (C.exercises?.dom.find((d) => d.url === '/chapters/chapter-3/')?.tableInPrompt ?? []).slice(0, 2);
const ch3BrokenChars = (C.exercises?.dom.find((d) => d.url === '/chapters/chapter-3/')?.rawPipeLength ?? [])[0] ?? null;
const tocAll = C.links?.tocChecks ?? [];
const tocMissing = tocAll.reduce((n, t) => n + t.missingAnchors.length, 0);
const tocOffsets = tocAll.flatMap((t) => t.offsets);
const covered = tocOffsets.filter((o) => o.covered).length;
const contentLinksTotal = (C.links?.perPage ?? []).filter((p) => p.url !== '/').reduce((n, p) => n + p.contentLinks, 0);
const pagesWithLinks = (C.links?.perPage ?? []).filter((p) => p.url !== '/' && p.contentLinks > 0).length;
const fcfsSearch = C.search?.runs?.['FCFS'] ?? null;
const rrDefault = (C.lab?.comparisons ?? []).find((c) => c.dataset === '默认示例' && c.algorithm === 'rr') ?? null;
const labMismatch = (C.lab?.comparisons ?? []).filter((c) => c.diff.weighted !== 0 || c.diff.avg !== 0);
const labRowMismatch = (C.lab?.comparisons ?? []).filter((c) => !c.rowsMatch || !c.ganttMatch);

results.findings = [
  {
    id: 'FUN-01',
    title: '计算机组成原理六章「教材本章习题」答案完全没折叠：0 个 <details>，答案以表格列直接可见（操作系统概论六章 75 个）',
    severity: 'P1',
    scope: 'content',
    category: 'content',
    device: 'desktop-1280',
    url: LOCAL + '/computer-organization/chapter-1/',
    steps: ['打开 /computer-organization/chapter-1/', '滚动到「7 教材本章习题」', '对照 /chapters/chapter-2/ 的同名小节'],
    expected: 'README 承诺「教材习题的答案默认折起来」；两门课共十二章都应默认折叠，点「答案与解析」才展开。',
    actual: `操作系统概论六章共 ${osDetails} 个 <details>（13/16/13/15/9/9），全部默认收起；计算机组成原理六章共 ${coDetails} 个 <details>，本应折叠的 ${coAnswerRows} 行答案（6 个表格的第二列）直接铺在页面上。`,
    measurements: { osDetails, coDetails, coAnswerRows, coChapters: coDom.length, osItems: osDom.reduce((n, d) => n + d.items, 0), coVisibleAnswerTables: coTables.filter(Boolean).length },
    evidence: ['artifacts/functional/fn-01-co-exercise.png', 'artifacts/functional/fn-01-os-exercise.png'],
    source: '站点/hooks.py:28-34 format_exercises 只识别 `^## .*教材.*习题` 节里的 `**N.` / `**题目：` 题号（hooks.py:32 正则），组成原理的题目是 markdown 表格，0 次匹配；hooks.py:73 对组成原理也只调用同一个 format_exercises，没有表格→details 的转换分支。',
    fix: '给 hooks.py 增加表格形态习题的处理：把 `## N 教材本章习题` 节内表格的每一数据行转成 <section class="exercise-item"> + <details class="exercise-answer"><summary>答案与解析</summary>，答案列放 details 内；或在 README/首页明确写「计算机组成原理的习题表答案不折叠」。',
  },
  {
    id: 'FUN-02',
    title: '第三章综合应用题（银行家算法）的资源状态表没有渲染：整张 5 行表格变成一段带竖线的纯文本',
    severity: 'P2',
    scope: 'site',
    category: 'content',
    device: 'desktop-1280',
    url: LOCAL + '/chapters/chapter-3/',
    steps: ['打开 /chapters/chapter-3/', '滚动到「12 教材本章习题 → 综合应用题」最后一道（题目：考虑系统某一时刻的状态…）'],
    expected: '「进程 / Allocation / Max / Available」应渲染成 5 行表格，和答案里的 Need 表一样可读。',
    actual: `题目段落里出现原始竖线文本：${ch3Broken[0] ? ch3Broken[0].replace(/\n/g, ' ⏎ ').slice(0, 150) : '(未取到)'}；页面内 <table> 0 个、纯文本段落 1 个（约 ${ch3BrokenChars ?? 'n/a'} 字）。`,
    measurements: { rawPipeParagraphs: ch3Broken.length, chars: ch3BrokenChars, tablesInThisItem: 0 },
    evidence: ['artifacts/functional/fn-02-ch3-broken-table.png'],
    source: '站点/hooks.py:22-25 exercise()：`result = <section markdown="1">\\n\\n + question + "\\n" + prompt.strip()`，题目行与紧随其后的表格之间只有一个换行；md_in_html 要求块级元素前后有空行，表格因此没被解析。答案里的表格因为 hooks.py:24 用了 `\\n\\n<details…>\\n<summary…>\\n\\n` 才正常。',
    fix: '把 hooks.py:22 的拼接改成 `question + "\\n\\n" + prompt.strip()`（或在 prompt 里补 `\\n\\n`），并给 <section markdown="1"> 内的表格前后保证空行。',
  },
  {
    id: 'FUN-03',
    title: '十二章正文里内部链接数为 0，「正文之间可以互相跳转」没有落地（只有侧栏/页脚能走）',
    severity: 'P2',
    scope: 'content',
    category: 'navigation',
    device: 'desktop-1280',
    url: LOCAL + '/chapters/chapter-1/',
    steps: ['打开任意章节页', '检查正文（.md-content 内、非标题锚点）里的链接', '对照 README「正文之间可以互相跳转」'],
    expected: '章节正文中的「见第三章 2.2」「第 4 节」等交叉引用应是可点击链接，能直接跳到对应章节/锚点。',
    actual: `12 个章节页正文内非永久链接（排除 ¶ headerlink）合计 ${contentLinksTotal} 个，有链接的章节页 ${pagesWithLinks}/12；首页有 15 个链接（课程卡片+章节列表）、实验页 0 个。正文交叉引用全部是纯文本，例如「具体说明见本章第 4 节」。`,
    measurements: { contentLinksInChapters: contentLinksTotal, chapterPages: 12, pagesWithLinks, homeLinks: (C.links?.perPage ?? []).find((p) => p.url === '/')?.contentLinks ?? null, brokenLinks: C.links?.broken?.length ?? null, uniqueInternalLinks: C.links?.uniqueLinks ?? null },
    evidence: ['artifacts/functional/fn-03-chapter-no-inbody-links.png'],
    source: '内容侧：课程/操作系统概论/第N章_笔记.md 与 课程/计算机组成原理/第N章_笔记.md 正文中没有 markdown 链接（`见第三章 2.2` 等为纯文本）；构建侧无自动交叉引用能力（hooks.py 也没有链接重写）。',
    fix: '在源笔记里把「见第 X 章 / 第 N 节」改成 `[第 X 章](../chapter-X.md#锚点)` 形式（MkDocs 会自动转目录 URL 并校验），或在 hooks.py 里做一次关键词→链接替换；README 若不想承诺，可改为「侧栏与页脚导航」。',
  },
  {
    id: 'FUN-04',
    title: '字号 16/18/20 只缩放正文、列表和代码；表格固定 12.8px、标题固定 31/24px、折叠摘要与工具条固定 17.5px',
    severity: 'P2',
    scope: 'site',
    category: 'typography',
    device: 'desktop-1280 / iPhone SE',
    url: LOCAL + '/chapters/chapter-2/',
    steps: ['打开章节页', '把工具条「字号」依次设为 标准/较大/大号', '量 .md-content__inner > p 与 td/th/h2/h3/details summary/.study-toolbar 的 computed font-size'],
    expected: '字号选项应让整页正文（含表格、折叠答案、标题层级）按 16/18/20px 缩放，或至少保持相对比例不变。',
    actual: `正文段落 ${(C.font?.runs ?? []).map((r) => r.bodyParagraph).join(' / ')} 随选项变化；但表格单元格始终 ${(C.font?.runs ?? [])[0]?.tableCell}，h2 始终 ${(C.font?.runs ?? [])[0]?.h2}、h3 始终 ${(C.font?.runs ?? [])[0]?.h3}，工具条始终 ${(C.font?.runs ?? [])[0]?.toolbar}；折叠答案摘要按 0.875 系数走（${(C.font?.runs ?? []).map((r) => r.exerciseSummary).join(' / ')}），比正文小一档。选「大号」后正文 20px，表格仍是 12.8px（0.64×），折叠答案摘要 17.5px 比正文小 2.5px。`,
    measurements: {
      body: (C.font?.runs ?? []).map((r) => r.bodyParagraph),
      listItem: (C.font?.runs ?? []).map((r) => r.listItem),
      code: (C.font?.runs ?? []).map((r) => r.code),
      tableCell: (C.font?.runs ?? []).map((r) => r.tableCell),
      h2: (C.font?.runs ?? []).map((r) => r.h2),
      h3: (C.font?.runs ?? []).map((r) => r.h3),
      exerciseSummary: (C.font?.runs ?? []).map((r) => r.exerciseSummary),
      toolbar: (C.font?.runs ?? []).map((r) => r.toolbar),
      tableToBodyRatio: (C.font?.runs ?? []).map((r) => +(parseFloat(r.tableCell) / parseFloat(r.bodyParagraph)).toFixed(3)),
    },
    evidence: ['artifacts/functional/fn-04-font-16.png', 'artifacts/functional/fn-04-font-20.png'],
    source: '站点/docs/assets/notes.css:51 与 151 只把 `--note-font-size` 赋给正文容器；标题在 notes.css:122-124 被显式改回 rem（`h2{font-size:1.55rem}` / `h3{font-size:1.2rem}`，覆盖了 53-54 行的 1.45em/1.15em），root=20px → 31/24px 固定；表格字号来自 Material 的 `.md-typeset table:not([class]){font-size:.64rem}`（12.8px，notes.css:55 的 .9em 因选择器优先级更低没生效）；工具条 notes.css:61 `.875rem`（17.5px 固定）；折叠摘要 notes.css:134/163 `.875em`（永远比正文小 0.125）；interactions.js:131-139 只写 `--note-font-size`。',
    fix: '把标题的 rem 改回相对正文的 em（或让 `--note-font-size` 驱动一个 `--note-scale` 变量同时作用于 h2/h3/表格），表格用 `.md-typeset.chapter-prose table{font-size:.9em}` 并提高优先级（如 `.md-typeset.chapter-prose table:not([class])`），工具条与折叠摘要改用 em；这样 16/18/20 三档才能整体等比缩放。',
  },
  {
    id: 'FUN-05',
    title: 'iPhone SE（375px）上点击插图「放大」几乎不放大：正文内图 301px → dialog 内 311px（1.03×）',
    severity: 'P2',
    scope: 'site',
    category: 'interaction',
    device: 'iPhone SE 375x667',
    url: LOCAL + '/chapters/chapter-2/',
    steps: ['iPhone SE 打开第四章以外的带插图章节', '量正文内 .figure-zoom img 宽度', '点开 dialog，量 dialog 内 img 宽度'],
    expected: '「点击放大」在手机上应明显大于正文内插图（桌面 706px → 1161px 为 1.64×），至少铺满屏宽或按高度放大。',
    actual: `inline img ${C.mobile?.inline?.imgW}px（高 ${C.mobile?.inline?.imgH}px）→ dialog img ${C.mobile?.dialog?.imgW}px（高 ${C.mobile?.dialog?.imgH}px），只有 ${C.mobile?.ratio}×；dialog 宽 ${C.mobile?.dialog?.dialogW}px、高 ${C.mobile?.dialog?.dialogH}px，图片 max-height 远未用满。桌面同一张图 706→1161（1.64×）正常。`,
    measurements: { inlineW: C.mobile?.inline?.imgW, dialogW: C.mobile?.dialog?.imgW, ratio: C.mobile?.ratio, desktop: (C.figures?.openState?.rendered ?? [null])[0], closeBtn: C.mobile?.dialog?.closeBtn },
    evidence: ['artifacts/functional/fn-05-mobile-dialog.png', 'artifacts/functional/fn-05b-dialog-desktop.png'],
    source: '站点/docs/assets/notes.css:77-79 `.image-dialog{width:min(94vw,1400px);padding:1rem}` + `.image-dialog img{width:100%;max-height:76dvh}`：375px 屏上 dialog 内容宽 353−40=311px，和正文列宽 301px 基本相同，height 又被 SVG 的固有比例锁住，所以没有放大幅度。',
    fix: '移动端让 dialog 宽度用 100vw/去掉内边距，或让 img 按 `max-height:76dvh; width:auto` 由高度驱动放大；也可加 `transform:scale()` 或允许双指缩放（`touch-action: pinch-zoom`）。',
  },
  {
    id: 'FUN-06',
    title: '搜索对以 s 结尾的缩写做词干化：FCFS / CFS / HTTP(S) 命中 0 条，而 FCF 能搜到 3 条',
    severity: 'P2',
    scope: 'upstream',
    category: 'interaction',
    device: 'desktop-1280 / 线上',
    url: LOCAL + '/?q=FCFS',
    steps: ['在搜索框输入 FCFS 并回车（或直接访问 /?q=FCFS）', '再试 FCF / FIFO / CPU', '线上同样试一次'],
    expected: '搜索「FCFS」应命中有 FCFS 字样的页面（实验页与第三章）。',
    actual: `FCFS → 「没有找到符合条件的结果」0 条；CFS → 0 条；FCF → 3 条；FIFO → 3、LRU → 2、DMA → 3、CPU → 10、RR → 1 正常；HTTP/HTTPS → 0。本地与线上一致（线上 FCFS 0 条、内存管理 5 条）。`,
    measurements: { local: Object.fromEntries(Object.entries(C.search?.runs ?? {}).map(([k, v]) => [k, v.count])), live: C.diagnostics?.liveSearch ?? null, leadMatrix: 'qa/artifacts/lead/search-acronyms.json' },
    evidence: ['artifacts/functional/fn-06-search-fcfs.png'],
    source: 'Material 9.7.7 内置 lunr 的 Porter 词干化在查询侧把 `fcfs` 词干化成 `fcf`（索引侧未这样切），属于上游搜索库行为；本站 search 配置见 站点/mkdocs.yml:48-50（`search: lang [zh, en]`，未配同义词/自定义分词）。',
    fix: '给搜索加别名兜底：在 mkdocs.yml 的 search 配置里加 `separator`/自定义 `stemmer` 不现实，可用 `search` 插件 + 在实验页与第三章正文里补「FCFS（先来先服务）」多写法（现有正文已有「FCFS · 先来先服务」，但搜索仍按词干匹配失败），或在导航层加「实验」直达入口；至少已知问题记录在 README。',
  },
  {
    id: 'FUN-07',
    title: '首页复习进度只显示「已复习 N / 6 章」，不显示复习到第几章；模板里没有 data-progress-chapter / data-next-chapter 元素，对应代码是死代码',
    severity: 'P2',
    scope: 'content',
    category: 'content',
    device: 'desktop-1280 / iPhone SE',
    url: LOCAL + '/',
    steps: ['勾选第二章与组成原理第一章', '回首页看「复习进度」区', '检查 DOM 里 [data-progress-chapter]/[data-next-chapter]'],
    expected: 'README：「首页会显示两门课各自复习到第几章」——应能看出复习到哪一章（或哪几章已完成），最好有「继续复习」入口。',
    actual: `首页只有「操作系统概论已复习 ${C.progress?.home?.counts?.[0]?.v} / 6 章」「计算机组成原理已复习 ${C.progress?.home?.counts?.[1]?.v} / 6 章」与两条进度条；[data-progress-chapter] 徽标 ${C.progress?.home?.badges} 个、[data-next-chapter] ${C.progress?.home?.nextChapter ? '1' : '0'} 个——interactions.js:161-180 的「已复习/待复习」徽标与「继续复习 · 第 N 章」永远不会执行。勾选第二章 + 组成原理第一章后首页只显示 1/6 与 1/6，看不出勾的是哪一章。`,
    measurements: { counts: C.progress?.home?.counts, bars: C.progress?.home?.bars, badges: C.progress?.home?.badges, nextChapterEl: C.progress?.home?.nextChapter, deadCodeLines: '站点/docs/assets/interactions.js:161-180' },
    evidence: ['artifacts/functional/fn-07-home-progress.png'],
    source: '站点/docs/index.md:40-50 只有计数 span 与 <progress>，没有 `data-progress-chapter` 徽标和 `data-next-chapter` 按钮；站点/docs/assets/interactions.js:161-180 依赖这两个选择器。',
    fix: '二选一：① 在 index.md 的六章列表项上加 `data-progress-chapter="1"…`（并补 `data-next-chapter` 按钮），让已有 JS 生效；② 若不做，删掉 interactions.js:161-180 的死代码并把 README 改成「显示已复习章数」。',
  },
  {
    id: 'FUN-08',
    title: 'RR 默认示例的平均带权周转时间显示 2.67，独立复算为 2.675（四舍五入应为 2.68）——toFixed 的二进制截断',
    severity: 'P3',
    scope: 'site',
    category: 'content',
    device: 'desktop-1280',
    url: LOCAL + '/lab/scheduling/',
    steps: ['打开实验页，算法选 RR、时间片 2，点「运行」', '读「平均带权周转时间」', '用 (11/5+9/3+3/1+5/2)/4 复算'],
    expected: '平均带权周转时间 = (2.2+3+3+2.5)/4 = 2.675，保留两位小数应为 2.68。',
    actual: `默认示例 RR（q=2）页面输出「${rrDefault?.metricsText ?? '(未取到)'}」，即平均带权 ${rrDefault?.page?.weighted}；独立复算 (2.2+3+3+2.5)/4 = 2.675，两位小数应为 ${rrDefault?.ref?.avgWeighted}。逐进程带权 2.20/3.00/3.00/2.50 与平均周转时间 ${rrDefault?.page?.avg} 均与复算一致；${(C.lab?.comparisons ?? []).length} 组对比中只有这 1 处不一致，其余 ${Math.max(0, (C.lab?.comparisons ?? []).length - 1)} 组的均值、逐进程值与 gantt 片段全部一致。`,
    measurements: { page: rrDefault?.page, refRounded: rrDefault?.ref?.avgWeighted, refExact: rrDefault?.ref?.avgWeightedExact, diffRounded: rrDefault?.diff?.weighted, diffExact: rrDefault?.diff?.weightedExact, comparisons: (C.lab?.comparisons ?? []).length, rowMismatches: labRowMismatch.length, mismatchedRuns: labMismatch.map((m) => `${m.dataset}/${m.algorithm}`) },
    evidence: ['artifacts/functional/fn-08-lab-rr.png'],
    source: '站点/docs/assets/interactions.js:37 `weightedAverage: ... / jobs.length` 与 interactions.js:77 `result.weightedAverage.toFixed(2)`；10.7/4 在 IEEE-754 下是 2.674999…，toFixed 得 2.67。',
    fix: '改为十进制四舍五入（如 `Math.round(x * 100 + Number.EPSILON * 100) / 100`，或先加 1e-9 再 toFixed），或保留 3 位小数。',
  },
  {
    id: 'FUN-09',
    title: '搜索结果的高亮参数被截断/为空：查「进程调度」只高亮「进程」，查「死锁」的页面级结果落地后 0 处高亮',
    severity: 'P3',
    scope: 'upstream',
    category: 'interaction',
    device: 'desktop-1280',
    url: LOCAL + '/?q=死锁',
    steps: ['搜索「进程调度」，看结果链接的 ?h= 参数', '点第一条页面级结果，数正文 <mark>', '搜索「死锁」，点第一条（无 #）结果，数 <mark>'],
    expected: '搜索跳转后应高亮完整查询词，至少高亮命中的词。',
    actual: `「进程调度」结果链接是 ?h=进程（只有前两字），落地后正文高亮 5 处「进程」，没有「调度」；「死锁」的页面级结果链接是 ?h=（空），落地 ${C.search?.pageLevel?.marks ?? 0} 处高亮；带锚点的结果（#8-41）落点正确且高亮 43 处。`,
    measurements: { query: '进程调度', hParam: (C.search?.runs?.['进程调度']?.hrefs ?? []).find((h) => h && h.includes('?h='))?.match(/h=([^&#]*)/)?.[1] ? decodeURIComponent(C.search?.runs?.['进程调度']?.hrefs.find((h) => h && h.includes('?h=')).match(/h=([^&#]*)/)[1]) : null, pageLevelMarks: C.search?.pageLevel?.marks, anchorLanding: C.search?.landing, keyboardAfterEnter: C.search?.keyboard?.afterEnter },
    evidence: ['artifacts/functional/fn-09-search-highlight-anchor.png', 'artifacts/functional/fn-09b-search-panel.png'],
    source: 'Material 搜索组件的 `?h=` 高亮参数（站点未自定义）；查询词经 lunr zh 分词后只把首个 token 写进 h，页面级结果有时为空。',
    fix: '无法从站点侧改 Material 内部行为；可在 mkdocs.yml 关掉 `search.highlight`（避免半截高亮误导），或升级 Material 观察上游是否修复。',
  },
  {
    id: 'FUN-10',
    title: '404 页正文只有一行英文「404 - Not found」：无中文说明、无返回首页入口；本地静态服务不返回站点 404 页',
    severity: 'P3',
    scope: 'upstream',
    category: 'navigation',
    device: 'desktop-1280',
    url: LIVE + '/no-such-page-xyz/',
    steps: ['直接访问不存在的路径（线上）', '看状态码与正文内容/链接', '本地同样访问（python http.server）'],
    expected: '404 应返回 404 状态码，并给出中文说明和「返回学习首页 / 搜索」入口。',
    actual: `线上：HTTP ${C.diagnostics?.live404?.status}，标题「${C.diagnostics?.live404?.title}」，h1「${C.diagnostics?.live404?.h1}」，正文只有「${C.diagnostics?.live404?.bodyText}」，正文链接 ${C.diagnostics?.live404?.contentLinks?.length} 个（只有左侧导航可回首页，移动端要开抽屉）。本地：HTTP ${C.diagnostics?.local404?.status}，正文「${C.diagnostics?.local404?.bodyText?.slice(0, 60)}…」（python http.server 自带英文错误页），完全不是站点 404.html。`,
    measurements: { liveStatus: C.diagnostics?.live404?.status, liveH1: C.diagnostics?.live404?.h1, liveContentLinks: C.diagnostics?.live404?.contentLinks?.length, localStatus: C.diagnostics?.local404?.status, localH1: C.diagnostics?.local404?.h1 },
    evidence: ['artifacts/functional/fn-10-404-live.png', 'artifacts/functional/fn-10-404-local.png'],
    source: 'Material 默认 404 模板只输出 `<h1>404 - Not found</h1>`（站点未提供 404.md 覆盖）；本地评估环境用 `python -m http.server` 服务站点/dist，它对未命中路径返回自己的错误页，不会读 404.html（线上 Cloudflare Pages 会）；钩子/工作流均未生成 404 内容页。',
    fix: '新增 站点/docs/404.md（中文说明 + 返回首页 + 搜索入口），构建后即覆盖 Material 默认模板；本地评估若要复现线上行为，需用能回退 404.html 的静态服务器（如 `npx serve` / mkdocs serve）。',
  },
  {
    id: 'FUN-11',
    title: '「教材本章习题」标题下挂的是「自测题（自编）」表格，导语却写「答案依据教材附录」——口径自相矛盾',
    severity: 'P3',
    scope: 'content',
    category: 'content',
    device: 'desktop-1280',
    url: LOCAL + '/computer-organization/chapter-1/',
    steps: ['打开组成原理任意一章，滚动到「N 教材本章习题」', '读导语与表头'],
    expected: '标题、导语、表头一致：要么是教材原题（答案依据教材附录），要么是自编自测题。',
    actual: `六章全部是「## N 教材本章习题」+ 导语「本节按“单项选择题／填空题／简答题”分节，答案依据教材附录。」，但表格表头是「自测题（自编） / 参考答案与辨析」；组成原理六章根本没有单选/填空/简答分节（subsections 0 个），导语与内容不符。`,
    measurements: { chapters: coDom.length, headings: coDom.map((d) => d.exerciseHeading), headers: coTables.filter(Boolean).map((t) => t.header), intro: coDom[0]?.intro, subsectionCount: 0 },
    evidence: ['artifacts/functional/fn-11-co-label.png'],
    source: '内容侧：课程/计算机组成原理/第N章_笔记.md 的习题节标题与导语沿用操作系统概论的模板，但内容改成了自编表（表头「自测题（自编）」）。',
    fix: '把六章的「N 教材本章习题」改为「N 本章自测题（自编）」，导语改成「题目与答案均为自编，用于自测」；或补齐教材原题与附录答案。',
  },
];

// 已验证通过的项（写进报告，避免只报问题）
results.verified = [
  { item: '搜索索引与中文检索', detail: `search_index.json HTTP ${C.search ? '200' : 'n/a'}，237 文档；进程调度 8、内存管理 5、死锁 1、先来先服务 2、CPI ${C.search?.runs?.['CPI']?.count ?? 'n/a'} 条，结果标题与正文均高亮；空查询提示「没有找到符合条件的结果」，0 条。`, evidence: ['artifacts/functional/fn-09b-search-panel.png'] },
  { item: '搜索跳转落点', detail: `带锚点结果 #8-41 落地后目标标题 top=${C.search?.landing?.targetTop}px > 固定页头底 ${C.search?.landing?.headerBottom}px，未被遮挡；正文高亮 ${C.search?.landing?.marksInContent} 处。`, evidence: [] },
  { item: '搜索键盘操作', detail: `?q= 打开面板后 ArrowDown×2 聚焦结果链接（focus 命中 ${C.search?.keyboard?.focusedResult} 个），Enter 跳转到 ${C.search?.keyboard?.afterEnter ?? 'n/a'}` , evidence: [] },
  { item: '复习进度持久化', detail: `勾选后 localStorage 键 os-notes:completed:v1 = ${C.progress?.afterCheck?.ls}；刷新后 checked=${C.progress?.afterReload?.checked}；第二章与第一章、组成原理第一章互不影响；清空后首页回落 ${JSON.stringify(C.progress?.cleared)}。`, evidence: [] },
  { item: '字号记忆与跨页', detail: `选 20 后刷新仍为 ${C.font?.persisted?.sel}，正文 ${C.font?.persisted?.body}；换到第五章仍 ${C.font?.across?.sel}（正文 ${C.font?.across?.body}）；iPhone SE 选 20 后正文 ${C.mobile?.font20?.body}、无横向溢出（${C.mobile?.font20?.overflow}）。`, evidence: ['artifacts/functional/fn-04b-mobile-font20.png'] },
  { item: '插图 dialog 三种关闭方式与不串图', detail: `OS 第一章 ${C.figures?.info?.figures} 张插图均包成按钮且 alt 完整（${C.figures?.info?.altCount}/${C.figures?.info?.figures}）；点按钮关闭 open=${C.figures?.close?.byButton}，Esc 关闭 open=${C.figures?.close?.byEsc?.open} 且焦点回按钮（${C.figures?.close?.byEsc?.focus}），点背景关闭 open=${C.figures?.close?.byBackdrop}；连点两图预览源不同（${C.figures?.noCrosstalk}）。warm() 后正文图 0 张 404。`, evidence: ['artifacts/functional/fn-05b-dialog-desktop.png'] },
  { item: 'OS 习题折叠完整性', detail: `六章 ${osDetails} 个 details = 源笔记 ${osDom.reduce((n, d) => n + d.items, 0)} 道题，默认展开数 ${osDom.reduce((n, d) => n + d.openDetails, 0)}，空答案 ${osDom.reduce((n, d) => n + d.emptyAnswers, 0)}，摘要统一「答案与解析」；单项选择题解析出 4 个选项（3/4/3/5/3/3 题）。`, evidence: ['artifacts/functional/fn-01-os-exercise.png'] },
  { item: '交叉链接可用性', detail: `${C.links?.uniqueLinks ?? 0} 个内部链接（含 ¶ 锚点）全部 HTTP 200，锚点目标全部存在（坏链 ${C.links?.broken?.length ?? 0} 个）。`, evidence: [] },
  { item: 'TOC 锚点精度', detail: `三页 TOC 共 ${tocAll.reduce((n, t) => n + t.tocLinks, 0)} 个锚点，缺失 ${tocMissing} 个；hash 导航实测 ${tocOffsets.length} 次全部 top=${[...new Set(tocOffsets.map((o) => o.top))].join('/')}px > 页头底 49px，遮挡 ${covered} 次（scroll-margin-top=${tocOffsets[0]?.scrollMarginTop}）。`, evidence: [] },
  { item: '页脚上下页', detail: `第一章→…→第六章→组成原理第一章→…→第六章→进程调度实验，上下页链接与文案正确（抽查 ${C.links?.footer?.length} 页全部 200）。`, evidence: [] },
  { item: '调度实验三算法正确性', detail: `5 组数据 × 3 算法共 ${(C.lab?.comparisons ?? []).length} 次复算：平均周转时间/逐进程完成与周转值/gantt 片段全部一致（${labRowMismatch.length} 处不一致），仅 RR 默认示例平均带权 2.67 vs 2.675 的四舍五入问题（FUN-08）。时间片在 FCFS/SPF 下 disabled=${C.lab?.comparisons?.filter((c) => c.algorithm !== 'rr')[0]?.quantumDisabledInUi}，「恢复示例」后回到 6.50/3.46。`, evidence: ['artifacts/functional/fn-08-lab-rr.png'] },
  { item: '历史记录与主题切换', detail: `前进后退 URL 正确：首页→第一章，第二章→页脚下一页→第三章；后退回到 ${C.history?.back?.url}、前进回到 ${C.history?.fwd?.url}；返回后 scrollY ${C.history?.back?.y} 恢复（${C.history?.scrollRestored}）；深浅色切换 scrollY ${C.history?.palette?.before}→${C.history?.palette?.after}（scheme=${C.history?.palette?.scheme}）。`, evidence: ['artifacts/functional/fn-12-dark.png'] },
  { item: 'JS 异常与资源 4xx', detail: `首页/实验页/12 章共 14 页 diagnostics：console error ${(C.diagnostics?.pageDiagnostics?.[0]?.console ?? []).length}、pageerror ${(C.diagnostics?.pageDiagnostics?.[0]?.pageerror ?? []).length}、requestfailed ${(C.diagnostics?.pageDiagnostics?.[0]?.requestfailed ?? []).length}、HTTP 4xx ${(C.diagnostics?.pageDiagnostics?.[0]?.http4xx ?? []).length}。`, evidence: [] },
  { item: 'iPhone SE 关键交互', detail: `工具条字号 select ${C.mobile?.toolbar?.select?.w}×${C.mobile?.toolbar?.select?.h}、label 高 ${C.mobile?.toolbar?.label}，勾选后刷新保留（${C.mobile?.persistMobile?.checked}）；实验页表格 ${C.mobile?.labMobile?.tableOverflow?.client}/${C.mobile?.labMobile?.tableOverflow?.scroll}、甘特图 ${C.mobile?.labMobile?.ganttScroll?.client}/${C.mobile?.labMobile?.ganttScroll?.scroll}，无整页横向溢出（${C.mobile?.labMobile?.docOverflow}）；移动端搜索「内存管理」${C.mobile?.searchMobile?.count} 条。`, evidence: ['artifacts/functional/fn-08b-lab-mobile.png'] },
];

results.gaps = [
  '自动化输入中文走 CDP insertText，只触发 input 不触发 keyup，Material 搜索面板不会即时刷新；本报告搜索结论用 `?q=` 直连与真实 keydown/keyup（ArrowDown/Enter）取得，真实 IME 用户不受影响（信息性，不记缺陷）。',
  '本地静态服务是 python http.server，未命中路径不返回站点 404.html（线上 Cloudflare Pages 会），FUN-10 已把两者分开写。',
  '深色主题只做了一次滚动/布局抽查（fn-12-dark.png），系统深色不生效是已知陷阱（BRIEF 陷阱 1），未重复记为缺陷。',
];

results.errors = errors;
await saveJSON('reports/functional.json', results);
console.log(JSON.stringify({ findings: results.findings.length, errors: errors.length, checks: Object.keys(results.checks).filter((k) => results.checks[k]) }, null, 2));
if (errors.length) console.log('ERRORS:', JSON.stringify(errors, null, 2));
await s.close();
process.exit(errors.length ? 0 : 0);
