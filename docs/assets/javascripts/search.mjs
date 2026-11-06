const root = document.querySelector('[data-study-search]');
if (root) {
  const input = root.querySelector('.md-search__input');
  const form = root.querySelector('form');
  const toggle = document.getElementById('__search');
  const meta = root.querySelector('.md-search-result__meta');
  const list = root.querySelector('.md-search-result__list');
  const recovery = root.querySelector('[data-search-recovery]');
  const retry = recovery.querySelector('button');
  const config = JSON.parse(document.getElementById('__config').textContent);
  const base = new URL(config.base, location.href);
  const originalTrigger = document.querySelector('.md-header label[for="__search"]');
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = originalTrigger.className;
  trigger.setAttribute('aria-label', '打开搜索');
  trigger.setAttribute('aria-controls', 'study-search-panel');
  trigger.append(...originalTrigger.childNodes);
  originalTrigger.replaceWith(trigger);
  let worker = null, controller = null, ready = false, loading = false, failed = false, generation = 0, timer = 0, queryTimeout = 0;
  const pendingQueries = [];
  const aliases = {FCFS: '先来先服务', SPF: '短进程优先', SJF: '短进程优先', RR: '时间片轮转', CPU: '处理器', DRAM: '动态随机存储器', ISA: '指令系统', DOS: '操作系统', PCB: '进程控制块', TLB: '快表', DMA: '直接存储器存取'};
  let documents = [];
  let lastQuery = '';
  let returnOnClose = false;

  function sync() {
    trigger.setAttribute('aria-expanded', String(toggle.checked));
    trigger.setAttribute('aria-label', toggle.checked ? '关闭搜索' : '打开搜索');
    root.querySelector('.md-search__scrollwrap').tabIndex = toggle.checked ? 0 : -1;
    if (toggle.checked) load();
    else if (returnOnClose && trigger.getClientRects().length) trigger.focus({preventScroll: true});
    returnOnClose = false;
  }
  function setOpen(open, restore = false) {
    const drawer = document.getElementById('__drawer');
    if (open && drawer?.checked) {
      drawer.checked = false;
      drawer.dispatchEvent(new Event('change', {bubbles: true}));
    }
    returnOnClose = restore;
    toggle.checked = open;
    toggle.dispatchEvent(new Event('change', {bubbles: true}));
  }
  function fail(message) {
    window.clearTimeout(queryTimeout);
    controller?.abort();
    worker?.terminate();
    worker = null;
    loading = ready = false;
    failed = true;
    pendingQueries.length = 0;
    list.replaceChildren();
    root.removeAttribute('aria-busy');
    input.removeAttribute('aria-busy');
    meta.textContent = message;
    recovery.hidden = false;
    retry.disabled = false;
    retry.hidden = false;
    retry.textContent = '重新加载搜索';
  }
  const share = root.querySelector('[data-md-component="search-share"]');
  function updateShare() {
    const url = new URL(location.href);
    url.searchParams.delete('h');
    url.searchParams.set('q', input.value.trim());
    share.href = url.href;
  }
  share.addEventListener('click', async event => {
    event.preventDefault();
    try { await navigator.clipboard.writeText(share.href); }
    catch { meta.textContent = '浏览器未允许复制，请手动复制：' + share.href; }
  });
  input.addEventListener('input', updateShare);
  input.value = new URL(location.href).searchParams.get('q') || '';
  updateShare();
  function query() {
    updateShare();
    if (!ready || !worker) return;
    lastQuery = input.value.trim();
    recovery.hidden = true;
    root.querySelector('.search-alias-hint')?.remove();
    window.clearTimeout(queryTimeout);
    if (!lastQuery) { input.removeAttribute('aria-busy'); list.replaceChildren(); meta.textContent = '输入章节名或概念开始搜索'; return; }
    input.setAttribute('aria-busy', 'true');
    meta.textContent = '正在搜索…';
    pendingQueries.push(lastQuery);
    worker.postMessage({type: 2, data: lastQuery});
    queryTimeout = window.setTimeout(() => fail('搜索未能完成，请重新加载搜索或浏览课程目录。'), 4000);
  }
  function safeMarkup(html) {
    const parsed = new DOMParser().parseFromString(String(html), 'text/html');
    function copy(node) {
      if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent);
      const fragment = document.createDocumentFragment();
      for (const child of node.childNodes) fragment.append(copy(child));
      if (node.nodeName === 'MARK') { const mark = document.createElement('mark'); mark.append(fragment); return mark; }
      return fragment;
    }
    return copy(parsed.body);
  }
  // Rescue terms absent from the worker index using the same downloaded data.
  function fallbackResults() {
    const parts = lastQuery.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
    if (!parts.length) return [];
    const matches = [];
    for (const doc of documents) {
      const content = (doc.title + ' ' + doc.text).toLowerCase();
      let score = parts.filter(part => doc.title.toLowerCase().includes(part)).length * 20;
      const found = parts.every(part => {
        if (content.includes(part)) { score += 100 + part.length; return true; }
        if (!/^[\p{Script=Han}]{3,}$/u.test(part)) return false;
        const grams = [...new Set(Array.from(part).slice(1).map((char, i) => part[i] + char))];
        const hits = grams.filter(gram => content.includes(gram)).length;
        score += hits;
        return hits >= Math.ceil(grams.length * .6);
      });
      if (found) matches.push({doc, score});
    }
    matches.sort((a, b) => b.score - a.score);
    const groups = new Map();
    const escape = value => String(value).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
    for (const {doc} of matches) {
      const key = doc.location.split('#')[0];
      if (!groups.has(key)) groups.set(key, []);
      const group = groups.get(key);
      if (group.length >= 3) continue;
      const plain = doc.text.replace(/\s+/g, ' ');
      const offset = Math.max(0, plain.toLowerCase().indexOf(parts[0]) - 50);
      group.push({...doc, title: escape(doc.title), text: escape(plain.slice(offset, offset + 220))});
    }
    return [...groups.values()];
  }
  function render(items) {
    if (!items.length) items = fallbackResults();
    input.removeAttribute('aria-busy');
    recovery.hidden = true;
    const fragment = document.createDocumentFragment();
    for (const group of items) {
      const row = document.createElement('li');
      row.className = 'md-search-result__item';
      for (const [i, doc] of group.entries()) {
        const url = new URL(doc.location, base);
        if (url.origin !== base.origin) continue;
        url.searchParams.set('h', lastQuery);
        const link = document.createElement('a');
        link.className = 'md-search-result__link';
        link.href = url.href;
        const article = document.createElement('article');
        article.className = 'md-search-result__article md-typeset';
        const title = document.createElement(i ? 'h3' : 'h2');
        title.append(safeMarkup(doc.title));
        article.append(title);
        if (doc.text) { const snippet = document.createElement('p'); snippet.append(safeMarkup(doc.text)); article.append(snippet); }
        link.append(article);
        row.append(link);
      }
      fragment.append(row);
    }
    list.replaceChildren(fragment);
    meta.textContent = items.length ? `${items.length} 个符合条件的结果` : '没有找到符合条件的结果，请换个关键词或查看课程目录';
    if (!items.length) { recovery.hidden = false; retry.hidden = true; }
    const alias = aliases[lastQuery.toUpperCase()];
    if (!items.length && alias) {
      const hint = document.createElement('p');
      hint.className = 'search-alias-hint';
      hint.textContent = '试试中文词：';
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = alias;
      button.addEventListener('click', () => { input.value = alias; query(); input.focus(); });
      hint.append(button); meta.after(hint);
    }
  }
  async function load(force = false) {
    if (ready || loading || (failed && !force)) return;
    failed = false;
    loading = true;
    recovery.hidden = true;
    retry.hidden = false;
    root.setAttribute('aria-busy', 'true');
    meta.textContent = '正在加载搜索引擎…';
    controller = new AbortController();
    const token = ++generation;
    const timeout = window.setTimeout(() => { if (token === generation && !ready) fail('搜索加载超时，请重试或浏览课程目录。'); }, 4000);
    try {
      const response = await fetch(new URL('search/search_index.json', base), {signal: controller.signal, cache: force ? 'reload' : 'default'});
      if (!response.ok) throw Error('search index request failed');
      const data = await response.json();
      if (!Array.isArray(data.docs) || !data.config) throw Error('invalid search index');
      if (token !== generation || !loading) return;
      const plain = html => new DOMParser().parseFromString(String(html), 'text/html').body.textContent;
      documents = data.docs.map(doc => ({...doc, title: plain(doc.title), text: plain(doc.text)}));
      worker = new Worker(new URL(config.search, location.href));
      worker.onerror = event => { event.preventDefault(); window.clearTimeout(timeout); if (token === generation) fail('搜索引擎未能载入，请重试或浏览课程目录。'); };
      worker.onmessage = event => {
        if (token !== generation) return;
        if (event.data.type === 1) {
          window.clearTimeout(timeout);
          loading = false; ready = true;
          root.removeAttribute('aria-busy');
          meta.textContent = '输入章节名或概念开始搜索';
          query();
        } else if (event.data.type === 3) {
          const completed = pendingQueries.shift();
          if (completed !== input.value.trim()) return;
          window.clearTimeout(queryTimeout);
          lastQuery = completed;
          render(event.data.data.items || []);
        }
      };
      worker.postMessage({type: 0, data: {...data, options: {suggest: false}}});
    } catch {
      window.clearTimeout(timeout);
      if (token === generation && loading) fail('搜索索引加载失败，请重试或浏览课程目录。');
    }
  }
  trigger.addEventListener('click', () => { setOpen(!toggle.checked, toggle.checked); if (toggle.checked) input.focus(); });
  toggle.addEventListener('change', sync);
  input.addEventListener('focus', () => { if (!toggle.checked) setOpen(true); else load(); });
  input.addEventListener('input', event => { window.clearTimeout(timer); if (event.isComposing) return; timer = window.setTimeout(() => { if (!ready) load(); else query(); }, 150); });
  input.addEventListener('compositionend', () => { window.clearTimeout(timer); if (!ready) load(); else query(); });
  retry.addEventListener('click', () => { retry.disabled = true; retry.textContent = '正在重试…'; load(true); });
  form.addEventListener('submit', event => { event.preventDefault(); query(); });
  form.addEventListener('reset', () => { window.setTimeout(() => { query(); input.focus(); }, 0); });
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); setOpen(false, true); }
  });
  root.querySelectorAll('label[for="__search"]').forEach(label => label.addEventListener('click', () => { returnOnClose = true; }));
  root.addEventListener('focusout', event => {
    if (event.relatedTarget) {
      if (!root.contains(event.relatedTarget) && toggle.checked) setOpen(false);
    } else window.setTimeout(() => { if (!root.contains(document.activeElement) && toggle.checked) setOpen(false); }, 0);
  });
  document.addEventListener('focusin', event => {
    if (toggle.checked && event.target !== trigger && !root.contains(event.target)) setOpen(false);
  });
  document.addEventListener('keydown', event => {
    if (!['/', 's', 'f'].includes(event.key) || event.ctrlKey || event.metaKey || event.altKey || event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
    event.preventDefault(); setOpen(true); input.focus();
  });
  if (input.value) { setOpen(true); input.focus(); } else sync();
  // Highlight destination text without eagerly downloading the search index.
  const content = document.querySelector('.md-content__inner');
  const highlight = new URL(location.href).searchParams.get('h') || '';
  if (content && highlight.length <= 100 && config.features?.includes('search.highlight')) {
    const terms = [...new Set(highlight.match(/[\p{L}\p{N}]+/gu) || [])].sort((a, b) => b.length - a.length);
    if (terms.length) {
      const pattern = new RegExp(terms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'giu');
      const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT, {acceptNode(node) {
        return node.parentElement.closest('script,style,pre,code,mark,textarea,button,select,dialog,.arithmatex,.katex,.study-toolbar,[data-study-lab],.headerlink') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }});
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      for (const node of nodes) {
        const matches = [...node.textContent.matchAll(pattern)];
        if (!matches.length) continue;
        const fragment = document.createDocumentFragment();
        let offset = 0;
        for (const match of matches) {
          fragment.append(node.textContent.slice(offset, match.index));
          const mark = document.createElement('mark'); mark.textContent = match[0]; fragment.append(mark);
          offset = match.index + match[0].length;
        }
        fragment.append(node.textContent.slice(offset)); node.replaceWith(fragment);
      }
    }
  }
}
