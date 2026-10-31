const storageKey = 'os-notes:completed:v1';
function readProgress(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return Array.isArray(value) ? value.filter(v => typeof v === 'string') : [];
  } catch { return []; }
}
export function initNotes() {
  const fontKey = 'os-notes:font-size:v1';
  let savedFont = '16';
  try { savedFont = localStorage.getItem(fontKey) || '16'; } catch {}
  if (!['16', '18', '20'].includes(savedFont)) savedFont = '16';
  document.documentElement.style.setProperty('--note-font-size', `${savedFont}px`);
  const toolbar = document.querySelector<HTMLElement>('.study-toolbar');
  if (toolbar && !toolbar.dataset.ready) {
    toolbar.dataset.ready = 'true';
    document.querySelector('.sl-markdown-content')?.classList.add('chapter-prose');
    const fontSelect = toolbar.querySelector<HTMLSelectElement>('[data-reading-size]')!;
    fontSelect.value = savedFont;
    fontSelect.addEventListener('change', () => {
      document.documentElement.style.setProperty('--note-font-size', `${fontSelect.value}px`);
      try { localStorage.setItem(fontKey, fontSelect.value); } catch {}
    });
    const id = toolbar.dataset.chapter!;
    const checkbox = toolbar.querySelector<HTMLInputElement>('[data-complete]')!;
    checkbox.checked = readProgress().includes(id);
    checkbox.addEventListener('change', () => {
      const progress = new Set(readProgress());
      checkbox.checked ? progress.add(id) : progress.delete(id);
      const status = toolbar.querySelector<HTMLElement>('.save-status')!;
      try { localStorage.setItem(storageKey, JSON.stringify([...progress])); status.textContent = '进度已保存在此浏览器'; }
      catch { status.textContent = '浏览器未允许保存进度'; }
    });
  }
  const progress = readProgress();
  document.querySelectorAll<HTMLElement>('[data-progress-chapter]').forEach(badge => {
    const completed = progress.includes(badge.dataset.progressChapter!);
    badge.textContent = completed ? '已复习' : '待复习';
    badge.dataset.completed = String(completed);
  });
  const count = document.querySelector<HTMLElement>('[data-progress-count]');
  if (count) count.textContent = String(['1', '2', '3'].filter(id => progress.includes(id)).length);
  const progressBar = document.querySelector<HTMLProgressElement>('[data-study-progress]');
  if (progressBar) progressBar.value = Number(count?.textContent || 0);
  const nextLink = document.querySelector<HTMLAnchorElement>('[data-next-chapter]');
  if (nextLink) {
    const next = ['1', '2', '3'].find(id => !progress.includes(id));
    if (next) {
      nextLink.href = nextLink.href.replace(/chapter-\d/, `chapter-${next}`);
      nextLink.querySelector('[data-next-label]')!.textContent = progress.length ? `继续复习 · 第 ${next} 章` : '开始第一章';
    } else nextLink.querySelector('[data-next-label]')!.textContent = '回顾第一章';
  }

  const dialog = document.querySelector<HTMLDialogElement>('.image-dialog');
  if (!dialog || dialog.dataset.ready) return;
  dialog.dataset.ready = 'true';
  dialog.querySelector('button')!.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  document.querySelectorAll<HTMLImageElement>('.sl-markdown-content img').forEach(img => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'figure-zoom';
    button.setAttribute('aria-label', `放大插图：${img.alt}`);
    img.replaceWith(button);
    button.append(img);
    const hint = document.createElement('span');
    hint.className = 'zoom-hint';
    hint.textContent = '点击放大';
    hint.setAttribute('aria-hidden', 'true');
    button.append(hint);
    button.addEventListener('click', () => {
      const preview = dialog.querySelector('img')!;
      preview.src = img.currentSrc || img.src;
      preview.alt = img.alt;
      dialog.querySelector('p')!.textContent = img.alt;
      dialog.showModal();
    });
  });
}
