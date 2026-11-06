import {getCourses} from "./course-catalog.mjs";
import {createReadingStore, READING_KEY} from "./reading-state.mjs";

"use strict";
(() => {
  const storageKey = "studynote:completed:v1";
  let reading;
  try { reading = createReadingStore(getCourses(), localStorage); } catch {}
  function renderRecent() {
    document.querySelectorAll("[data-recent-chapter]").forEach(link => {
      const course = getCourses().find(c => c.id === link.dataset.recentChapter);
      const recent = reading?.get(course?.id);
      link.hidden = !recent;
      if (!recent) { link.removeAttribute("href"); return; }
      const base = new URL(document.querySelector('[data-next-chapter="' + course.id + '-"]').href);
      base.pathname = base.pathname.replace(/chapter-\d+/, 'chapter-' + String(recent.chapter).padStart(2, '0'));
      link.href = base.href;
      link.textContent = '返回最近阅读 · 第 ' + recent.chapter + ' 章';
    });
  }
  function readPreference(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  function readProgress() {
    try {
      const value = JSON.parse(readPreference(storageKey) || "[]");
      return Array.isArray(value) ? value.filter((v) => typeof v === "string") : [];
    } catch {
      return [];
    }
  }

  /** Repaint every progress indicator; called on load and when another tab saves. */
  function renderProgress() {
    const progress = readProgress();
    document.querySelectorAll("[data-progress-chapter]").forEach((badge) => {
      const completed = progress.includes(badge.dataset.progressChapter);
      badge.textContent = completed ? "\u5DF2\u590D\u4E60" : "\u5F85\u590D\u4E60";
      badge.dataset.completed = String(completed);
    });
    for (const {id: course, chapters} of getCourses()) {
      const prefix = course + "-";
      const count = document.querySelector(`[data-progress-count="${course}"]`);
      if (count) count.textContent = String(Array.from({length: chapters}, (_, i) => i + 1).filter((n) => progress.includes(`${prefix}${n}`)).length);
      const progressBar = document.querySelector(`[data-study-progress="${course}"]`);
      if (progressBar) progressBar.value = Number(count?.textContent || 0);
    }
    document.querySelectorAll("[data-next-chapter]").forEach((nextLink) => {
      const prefix = nextLink.dataset.nextChapter;
      const course = getCourses().find(c => c.id + "-" === prefix);
      if (!course) return;
      const ids = Array.from({length: course.chapters}, (_, i) => String(i + 1));
      const next = ids.find((id) => !progress.includes(prefix + id));
      const done = ids.filter((id) => progress.includes(prefix + id)).length;
      if (next) {
        nextLink.href = nextLink.href.replace(/chapter-\d+/, `chapter-${next.padStart(2, "0")}`);
        nextLink.querySelector("[data-next-label]").textContent = done ? `\u7EE7\u7EED\u590D\u4E60 \xB7 \u7B2C ${next} \u7AE0` : "\u5F00\u59CB\u7B2C 1 \u7AE0";
      } else {
        nextLink.href = nextLink.href.replace(/chapter-\d+/, "chapter-01");
        nextLink.querySelector("[data-next-label]").textContent = "\u56DE\u987E\u7B2C\u4E00\u7AE0";
      }
    });
  }
  function initNotes() {
    const fontKey = "studynote:font-size:v1";
    let savedFont = "16";
    try {
      savedFont = readPreference(fontKey) || "16";
    } catch {
    }
    if (!["16", "18", "20"].includes(savedFont)) savedFont = "16";
    document.documentElement.style.setProperty("--note-font-size", `${savedFont}px`);
    const toolbar = document.querySelector(".study-toolbar");
    if (toolbar && !toolbar.dataset.ready) {
      toolbar.dataset.ready = "true";
      document.querySelector(".md-content__inner")?.classList.add("chapter-prose");
      const fontSelect = toolbar.querySelector("[data-reading-size]");
      const status = toolbar.querySelector(".save-status");
      fontSelect.value = savedFont;
      fontSelect.addEventListener("change", () => {
        // Resizing the text moves every paragraph below the viewport top. Keep
        // the paragraph the reader was looking at in place.
        const anchor = [...document.querySelectorAll(".md-content__inner h2, .md-content__inner h3, .md-content__inner p")]
          .find((el) => el.getBoundingClientRect().bottom > 80);
        const before = anchor ? anchor.getBoundingClientRect().top : 0;
        document.documentElement.style.setProperty("--note-font-size", `${fontSelect.value}px`);
        if (anchor) {
          const after = anchor.getBoundingClientRect().top;
          window.scrollBy(0, after - before);
        }
        try {
          localStorage.setItem(fontKey, fontSelect.value);
          if (window.__storageBlocked && status) status.textContent = "浏览器未允许保存，字号只在本次会话有效";
        } catch {
          if (status) status.textContent = "字号已调整，但浏览器未允许记住";
        }
      });
      const id = toolbar.dataset.chapter;
      if (!reading?.visit(id) || window.__storageBlocked) status.textContent = "浏览器未允许保存，最近阅读位置仅在本次会话有效";
      const checkbox = toolbar.querySelector("[data-complete]");
      checkbox.checked = readProgress().includes(id);
      checkbox.addEventListener("change", () => {
        const progress2 = new Set(readProgress());
        checkbox.checked ? progress2.add(id) : progress2.delete(id);
        try {
          localStorage.setItem(storageKey, JSON.stringify([...progress2]));
          status.textContent = window.__storageBlocked
            ? "浏览器未允许保存，进度只在本次会话有效"
            : "\u8FDB\u5EA6\u5DF2\u4FDD\u5B58\u5728\u6B64\u6D4F\u89C8\u5668";
        } catch {
          status.textContent = "\u6D4F\u89C8\u5668\u672A\u5141\u8BB8\u4FDD\u5B58\u8FDB\u5EA6";
        }
      });
    }
    renderProgress();
    renderRecent();
    const dialog = document.querySelector(".image-dialog");
    if (dialog && !dialog.dataset.ready) {
      dialog.dataset.ready = "true";
      dialog.querySelector(".close-dialog").addEventListener("click", () => dialog.close());
      const viewport = dialog.querySelector(".image-viewport");
      const fit = dialog.querySelector(".image-fit");
      function fitImage(original = false) {
        dialog.dataset.original = String(original);
        fit.setAttribute("aria-pressed", String(original));
        fit.textContent = original ? "适应屏幕" : "查看原图";
        viewport.scrollTo(0, 0);
      }
      fit.addEventListener("click", () => fitImage(dialog.dataset.original !== "true"));
      // Only a click on the backdrop (outside the dialog box) closes it; a click
      // on the dialog's own padding used to close the preview by accident.
      dialog.addEventListener("click", (event) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const outside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
        if (outside) dialog.close();
      });
      dialog.addEventListener("close", () => document.documentElement.classList.remove("dialog-open"));
      document.querySelectorAll(".figure-zoom").forEach((button) => {
        const img = button.querySelector("img");
        button.setAttribute("aria-haspopup", "dialog");
        button.addEventListener("click", (event) => {
          event.preventDefault();
          const preview = dialog.querySelector("img");
          preview.src = img.currentSrc || img.src;
          preview.alt = img.alt;
          dialog.querySelector("p").textContent = img.alt;
          dialog.showModal();
          fitImage();
          dialog.scrollTop = 0;
          dialog.scrollLeft = 0;
          document.documentElement.classList.add("dialog-open");
        });
      });
    }
  }

  /** Wide tables get a keyboard entry point and a visible "you can scroll" hint. */
  function initTableScrollHints() {
    let timer = 0;
    function update() {
      document.querySelectorAll(".md-typeset__scrollwrap").forEach((wrap) => {
        const scrollable = wrap.scrollWidth > wrap.clientWidth + 2;
        wrap.classList.toggle("is-long-table", (wrap.querySelector("table")?.rows.length || 0) > 10);
        wrap.classList.toggle("is-scrollable", scrollable);
        if (!scrollable) {
          const stale = wrap.previousElementSibling;
          if (stale && stale.classList.contains("table-scroll-hint")) stale.remove();
          return;
        }
        if (!wrap.hasAttribute("tabindex")) {
          wrap.tabIndex = 0;
          wrap.setAttribute("role", "region");
          wrap.setAttribute("aria-label", "可横向滚动的表格");
        }
        const previous = wrap.previousElementSibling;
        if (!previous || !previous.classList.contains("table-scroll-hint")) {
          const hint = document.createElement("p");
          hint.className = "table-scroll-hint";
          hint.textContent = "表格较宽，可左右滑动查看";
          wrap.parentElement.insertBefore(hint, wrap);
        }
      });

      // Long code lines scroll inside <pre><code>; same affordance for keyboards and touch.
      document.querySelectorAll(".md-typeset pre > code").forEach((code) => {
        const block = code.closest(".highlight") || code.parentElement;
        const scrollable = code.scrollWidth > code.clientWidth + 2;
        if (!scrollable) {
          const stale = block?.nextElementSibling;
          if (stale && stale.classList.contains("code-scroll-hint")) stale.remove();
          return;
        }
        if (!code.hasAttribute("tabindex")) {
          code.tabIndex = 0;
          code.setAttribute("aria-label", "可横向滚动的代码块");
        }
        if (block && !(block.nextElementSibling && block.nextElementSibling.classList.contains("code-scroll-hint"))) {
          const hint = document.createElement("p");
          hint.className = "table-scroll-hint code-scroll-hint";
          hint.textContent = "代码行较长，可左右滑动查看";
          block.after(hint);
        }
      });
    }
    update();
    // Table widths depend on fonts and images; re-check once everything settles.
    window.addEventListener("load", update, { once: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(update).catch(() => {});
    window.setTimeout(update, 800);
    window.addEventListener("resize", () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(update, 150);
    });
  }

  /** Print: open every folded answer, then restore the screen state afterwards. */
  function initPrintAnswers() {
    const selector = "details.exercise-answer";
    window.addEventListener("beforeprint", () => {
      document.querySelectorAll(`${selector}:not([open])`).forEach((details) => {
        details.dataset.printClosed = "1";
        details.open = true;
      });
    });
    window.addEventListener("afterprint", () => {
      document.querySelectorAll(`${selector}[data-print-closed]`).forEach((details) => {
        details.open = false;
        delete details.dataset.printClosed;
      });
    });
  }

  /** Wide display formulas get the same swipe/keyboard affordance as wide tables. */
  function initMathScrollHints() {
    let timer = 0;
    function update() {
      document.querySelectorAll(".katex-display").forEach((display) => {
        const scrollable = display.scrollWidth > display.clientWidth + 2;
        display.classList.toggle("is-scrollable", scrollable);
        if (!scrollable) {
          const stale = display.previousElementSibling;
          if (stale && stale.classList.contains("math-scroll-hint")) stale.remove();
          return;
        }
        if (!display.hasAttribute("tabindex")) {
          display.tabIndex = 0;
          display.setAttribute("role", "region");
          display.setAttribute("aria-label", "可横向滚动的公式");
        }
        const previous = display.previousElementSibling;
        if (!previous || !previous.classList.contains("math-scroll-hint")) {
          const hint = document.createElement("p");
          hint.className = "table-scroll-hint math-scroll-hint";
          hint.textContent = "公式较宽，可左右滑动查看";
          display.parentElement.insertBefore(hint, display);
        }
      });
    }
    update();
    window.addEventListener("load", update, { once: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(update).catch(() => {});
    window.setTimeout(update, 800);
    window.addEventListener("resize", () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(update, 150);
    });
  }

  /** Keep a second tab in sync after the review checkbox changes elsewhere. */
  function initCrossTabProgress() {
    window.addEventListener("storage", (event) => {
      if (event.key === READING_KEY || event.key === null) renderRecent();
      if (event.key !== storageKey && event.key !== null) return;
      renderProgress();
      const toolbar = document.querySelector(".study-toolbar");
      const checkbox = toolbar?.querySelector("[data-complete]");
      if (toolbar && checkbox) checkbox.checked = readProgress().includes(toolbar.dataset.chapter);
    });
  }

  /** Drawer: keyboard toggle, Esc, focus containment, background scroll lock. */
  function initDrawerA11y() {
    const sidebar = document.querySelector(".md-sidebar--primary");
    const label = document.querySelector('.md-header label[for="__drawer"]');
    if (!sidebar || !label) return;
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = label.className;
    trigger.dataset.drawerToggle = "";
    sidebar.id ||= "study-navigation";
    trigger.setAttribute("aria-controls", sidebar.id);
    trigger.append(...label.childNodes);
    label.replaceWith(trigger);
    const box = () => document.getElementById("__drawer");
    const wide = window.matchMedia("(min-width: 76.25em)");
    const background = [...document.querySelectorAll(".md-content, .md-sidebar--secondary, .md-footer, .md-tabs")];
    const originalInert = new Map(background.map(el => [el, el.hasAttribute("inert")]));
    function sync() {
      const toggle = box();
      if (!toggle) return;
      const drawer = !wide.matches;
      if (!drawer) toggle.checked = false;
      const open = drawer && toggle.checked;
      const restoreFocus = drawer && !open && trigger.getAttribute("aria-expanded") === "true";
      trigger.setAttribute("aria-expanded", String(open));
      trigger.setAttribute("aria-label", open ? "关闭导航" : "打开导航");
      document.documentElement.classList.toggle("drawer-open", open);
      sidebar.toggleAttribute("inert", drawer && !open);
      if (drawer && !open) sidebar.setAttribute("aria-hidden", "true");
      else sidebar.removeAttribute("aria-hidden");
      for (const el of background) el.toggleAttribute("inert", open || originalInert.get(el));
      if (restoreFocus) trigger.focus({preventScroll: true});
    }
    document.addEventListener("change", (event) => {
      if (event.target && event.target.id === "__drawer") sync();
    });
    if (typeof wide.addEventListener === "function") wide.addEventListener("change", sync);
    sync();
    trigger.addEventListener("click", () => {
      const toggle = box();
      if (!toggle) return;
      const search = document.getElementById("__search");
      if (!toggle.checked && search?.checked) {
        search.checked = false;
        search.dispatchEvent(new Event("change", {bubbles: true}));
      }
      toggle.checked = !toggle.checked;
      toggle.dispatchEvent(new Event("change", { bubbles: true }));
      if (toggle.checked) sidebar.querySelector("a[href]")?.focus();
    });
    document.addEventListener("keydown", (event) => {
      const toggle = box();
      if (!toggle?.checked || wide.matches) return;
      if (event.key === "Escape") {
        event.preventDefault();
        toggle.checked = false;
        toggle.dispatchEvent(new Event("change", { bubbles: true }));
        trigger.focus();
      } else if (event.key === "Tab") {
        const controls = [trigger, ...sidebar.querySelectorAll('a[href], button, input, select, [tabindex="0"]')]
          .filter(el => el.getClientRects().length && !el.closest("[inert]"));
        const index = controls.indexOf(document.activeElement);
        if (index < 0 || (event.shiftKey && index === 0) || (!event.shiftKey && index === controls.length - 1)) {
          event.preventDefault();
          controls[event.shiftKey ? controls.length - 1 : 0]?.focus();
        }
      }
    });
  }

  /** Keep keyboard navigation inside the native modal, including the scroll region. */
  function initDialogFocus() {
    const dialog = document.querySelector(".image-dialog");
    if (!dialog) return;
    dialog.setAttribute("tabindex", "0");
    dialog.addEventListener("keydown", (event) => {
      if (event.key !== "Tab") return;
      const focusables = [dialog, ...dialog.querySelectorAll("button, a[href], input, [tabindex]:not([tabindex='-1'])")];
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  /** When the browser blocks storage, keep the palette from throwing on click. */
  function initStorageGuard() {
    let broken = false;
    try {
      void window.localStorage;
    } catch {
      broken = true;
    }
    if (!broken) return;
    const memory = new Map();
    const safe = {
      getItem: (key) => (memory.has(key) ? memory.get(key) : null),
      setItem: (key, value) => memory.set(key, String(value)),
      removeItem: (key) => memory.delete(key),
      clear: () => memory.clear(),
      key: (index) => [...memory.keys()][index] ?? null,
      get length() {
        return memory.size;
      },
    };
    try {
      Object.defineProperty(window, "localStorage", { configurable: true, get: () => safe });
    } catch {
    }
  }

  /** Space is the expected toggle for a switch; the palette radio only reacts to arrows. */
  function initPaletteKeys() {
    const options = [...document.querySelectorAll(".md-header .md-option")];
    if (options.length < 2) return;
    options.forEach((input, index) => {
      input.addEventListener("keydown", (event) => {
        if (event.key !== " ") return;
        event.preventDefault();
        const next = options[(index + 1) % options.length];
        next.checked = true;
        next.dispatchEvent(new Event("change", { bubbles: true }));
      });
    });
  }

  initNotes();
  initTableScrollHints();
  initMathScrollHints();
  initPrintAnswers();
  initCrossTabProgress();
  initDrawerA11y();
  initDialogFocus();
  initStorageGuard();
  initPaletteKeys();
  document.querySelectorAll(".headerlink").forEach(link => {
    link.setAttribute("aria-label", "链接到：" + link.parentElement.textContent.replace(/¶$/, "").trim());
  });
  const searchEntry = document.querySelector("[data-study-search-entry]");
  if (searchEntry) {
    const target = new URL(searchEntry.href);
    target.search = location.search;
    target.hash = location.hash;
    location.replace(target.href);
  }
})();
