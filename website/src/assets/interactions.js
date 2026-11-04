import { schedule } from './scheduling.mjs';
"use strict";
(() => {
  /** Decimal rounding: 2.675 must print as 2.68, not 2.67. */
  function round2(value) {
    return Math.round(value * 100 + 1e-9) / 100;
  }

  function initScheduler() {
    const root = document.querySelector("[data-scheduler]");
    if (!root || root.dataset.ready) return;
    root.dataset.ready = "true";
    const form = root.querySelector("form");
    const output = root.querySelector(".lab-results");
    if (output) output.setAttribute("aria-live", "polite");
    const algorithm = form.elements.namedItem("algorithm");
    const quantum = form.elements.namedItem("quantum");
    const DEFAULT_QUANTUM = "2";
    // A stale/invalid quantum must never block a non-RR algorithm: the input is
    // disabled in those modes, so the visitor could not fix it.
    function resetQuantumIfInvalid() {
      const value = Number(quantum.value);
      if (!Number.isInteger(value) || value < 1 || value > 100) quantum.value = DEFAULT_QUANTUM;
    }
    function updateQuantum() {
      quantum.disabled = algorithm.value !== "rr";
      if (algorithm.value !== "rr") resetQuantumIfInvalid();
    }
    algorithm.addEventListener("change", updateQuantum);
    function run() {
      try {
        const data = new FormData(form);
        const processes = Array.from({ length: 4 }, (_, i) => ({ arrival: Number(data.get(`arrival-${i}`)), burst: Number(data.get(`burst-${i}`)) }));
        const quantumValue = algorithm.value === "rr" ? Number(quantum.value) : Number(DEFAULT_QUANTUM);
        const result = schedule(processes, algorithm.value, quantumValue);
        output.replaceChildren();
        const title = document.createElement("h2");
        title.textContent = "\u6267\u884C\u65F6\u95F4\u8F74";
        output.append(title);
        const chart = document.createElement("div");
        chart.className = "gantt";
        chart.setAttribute("aria-label", "\u6309\u65F6\u95F4\u987A\u5E8F\u6392\u5217\u7684\u6267\u884C\u7247\u6BB5\uFF0C\u957F\u5EA6\u4E0E\u8FD0\u884C\u65F6\u95F4\u6210\u6BD4\u4F8B");
        // Keep the bar proportional: blocks share a track whose minimum width leaves
        // ~44px per unit; the track scrolls inside .gantt instead of widening the page.
        const totalDuration = result.segments.reduce((n, segment) => n + (segment.end - segment.start), 0) || 1;
        const track = document.createElement("div");
        track.className = "gantt-track";
        track.style.minWidth = `${totalDuration * 44}px`;
        result.segments.forEach((segment) => {
          const block = document.createElement("div");
          block.className = `gantt-block process-${segment.order}`;
          block.style.flex = `0 0 ${((segment.end - segment.start) / totalDuration) * 100}%`;
          block.textContent = `${segment.id}
${segment.start}\u2013${segment.end}`;
          block.title = `${segment.id}\uFF1A${segment.start} \u81F3 ${segment.end}`;
          track.append(block);
        });
        chart.append(track);
        output.append(chart);
        const metrics = document.createElement("p");
        metrics.className = "lab-metrics";
        metrics.textContent = `\u5E73\u5747\u5468\u8F6C\u65F6\u95F4 ${round2(result.average).toFixed(2)}\u3000\xB7\u3000\u5E73\u5747\u5E26\u6743\u5468\u8F6C\u65F6\u95F4 ${round2(result.weightedAverage).toFixed(2)}`;
        output.append(metrics);
        const table = document.createElement("table");
        const head = table.createTHead().insertRow();
        ["\u8FDB\u7A0B", "\u5B8C\u6210\u65F6\u523B", "\u5468\u8F6C\u65F6\u95F4", "\u5E26\u6743\u5468\u8F6C\u65F6\u95F4"].forEach((label) => {
          const th = document.createElement("th");
          th.scope = "col";
          th.textContent = label;
          head.append(th);
        });
        const body = table.createTBody();
        result.results.forEach((p) => {
          const row = body.insertRow();
          [p.id, p.finish, p.turnaround, round2(p.weighted).toFixed(2)].forEach((value) => {
            row.insertCell().textContent = String(value);
          });
        });
        // Material only wraps tables that exist when the page initialises. Tables
        // created here must get the same scroll wrapper, otherwise the fourth
        // column pushes the whole mobile page sideways.
        const scrollwrap = document.createElement("div");
        scrollwrap.className = "md-typeset__scrollwrap";
        scrollwrap.tabIndex = 0;
        scrollwrap.setAttribute("role", "region");
        scrollwrap.setAttribute("aria-label", "\u53EF\u5DE6\u53F3\u6EDA\u52A8\u7684\u7ED3\u679C\u8868");
        const tablewrap = document.createElement("div");
        tablewrap.className = "md-typeset__table";
        tablewrap.append(table);
        scrollwrap.append(tablewrap);
        output.append(scrollwrap);
      } catch (error) {
        output.textContent = error instanceof Error ? error.message : "\u53C2\u6570\u6709\u8BEF";
      }
    }
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      run();
    });
    form.addEventListener("reset", () => {
      setTimeout(() => {
        updateQuantum();
        run();
      }, 0);
    });
    updateQuantum();
    run();
  }

  var storageKey = "os-notes:completed:v1";
  function readProgress() {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey) || "[]");
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
    for (const course of ["os", "co"]) {
      const prefix = course === "os" ? "" : "co-";
      const count = document.querySelector(`[data-progress-count="${course}"]`);
      if (count) count.textContent = String([1, 2, 3, 4, 5, 6].filter((n) => progress.includes(`${prefix}${n}`)).length);
      const progressBar = document.querySelector(`[data-study-progress="${course}"]`);
      if (progressBar) progressBar.value = Number(count?.textContent || 0);
    }
    const nextLink = document.querySelector("[data-next-chapter]");
    if (nextLink) {
      const next = ["1", "2", "3", "4", "5", "6"].find((id) => !progress.includes(id));
      const done = ["1", "2", "3", "4", "5", "6"].filter((id) => progress.includes(id)).length;
      if (next) {
        nextLink.href = nextLink.href.replace(/chapter-\d/, `chapter-${next}`);
        nextLink.querySelector("[data-next-label]").textContent = done ? `\u7EE7\u7EED\u590D\u4E60 \xB7 \u7B2C ${next} \u7AE0` : "\u5F00\u59CB\u7B2C 1 \u7AE0";
      } else nextLink.querySelector("[data-next-label]").textContent = "\u56DE\u987E\u7B2C\u4E00\u7AE0";
    }
  }
  function initNotes() {
    const fontKey = "os-notes:font-size:v1";
    let savedFont = "16";
    try {
      savedFont = localStorage.getItem(fontKey) || "16";
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
    const dialog = document.querySelector(".image-dialog");
    if (dialog && !dialog.dataset.ready) {
      dialog.dataset.ready = "true";
      dialog.querySelector("button").addEventListener("click", () => dialog.close());
      // Only a click on the backdrop (outside the dialog box) closes it; a click
      // on the dialog's own padding used to close the preview by accident.
      dialog.addEventListener("click", (event) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const outside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
        if (outside) dialog.close();
      });
      dialog.addEventListener("close", () => document.documentElement.classList.remove("dialog-open"));
      document.querySelectorAll(".md-content__inner img").forEach((img) => {
        if (img.closest("dialog")) return;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "figure-zoom";
        button.setAttribute("aria-label", `\u67E5\u770B\u539F\u56FE\uFF1A${img.alt}`);
        img.replaceWith(button);
        button.append(img);
        const hint = document.createElement("span");
        hint.className = "zoom-hint";
        hint.textContent = "\u67E5\u770B\u539F\u56FE";
        hint.setAttribute("aria-hidden", "true");
        button.append(hint);
        button.addEventListener("click", () => {
          const preview = dialog.querySelector("img");
          preview.src = img.currentSrc || img.src;
          preview.alt = img.alt;
          dialog.querySelector("p").textContent = img.alt;
          dialog.showModal();
          dialog.scrollTop = 0;
          dialog.scrollLeft = 0;
          document.documentElement.classList.add("dialog-open");
        });
      });
    }
  }

  /**
   * Material 的搜索只在 keyup 时读取输入框的值。中文输入法的候选词提交、
   * 粘贴、语音输入都只发 input 事件，于是结果面板会停在旧查询上。
   * 这里补一次合成的 keyup，让所有输入路径都能触发检索。
   */
  function initSearchInputFallback() {
    const input = document.querySelector(".md-search__input");
    if (!input || input.dataset.keyupFallback) return;
    input.dataset.keyupFallback = "true";
    let timer = 0;
    input.addEventListener("input", () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        input.dispatchEvent(new KeyboardEvent("keyup", { key: "Process", bubbles: true }));
      }, 220);
    });
  }

  /** 搜索面板收起时，结果滚动容器仍是一个 0 高度的 Tab 停靠点——移出 Tab 序列。 */
  function initSearchTabStop() {
    const toggle = document.getElementById("__search");
    const wrap = document.querySelector(".md-search__scrollwrap");
    if (!wrap) return;
    const sync = () => {
      wrap.tabIndex = toggle && toggle.checked ? 0 : -1;
    };
    if (toggle) toggle.addEventListener("change", sync);
    sync();
  }

  /** Wide tables get a keyboard entry point and a visible "you can scroll" hint. */
  function initTableScrollHints() {
    let timer = 0;
    function update() {
      document.querySelectorAll(".md-typeset__scrollwrap").forEach((wrap) => {
        const scrollable = wrap.scrollWidth > wrap.clientWidth + 2;
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
      if (event.key !== storageKey) return;
      renderProgress();
      const toolbar = document.querySelector(".study-toolbar");
      const checkbox = toolbar?.querySelector("[data-complete]");
      if (toolbar && checkbox) checkbox.checked = readProgress().includes(toolbar.dataset.chapter);
    });
  }

  /** Material renders the "back to top" button but its component never reveals it. */
  function initTopButton() {
    const top = document.querySelector(".md-top");
    if (!top) return;
    let scheduled = false;
    function sync() {
      scheduled = false;
      const show = window.scrollY > window.innerHeight * 1.5;
      top.hidden = !show;
      top.style.opacity = show ? "1" : "0";
      top.style.pointerEvents = show ? "auto" : "none";
    }
    window.addEventListener("scroll", () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(sync);
    }, { passive: true });
    sync();
  }

  /** Search panel: focus, clear button, per-result highlight param, acronym fallback. */
  function initSearchA11y() {
    const toggle = document.getElementById("__search");
    const input = document.querySelector(".md-search__input");
    const headerToggle = document.querySelector('.md-header label[for="__search"]');
    const output = document.querySelector(".md-search__output");
    if (!input || !output) return;

    if (toggle) {
      toggle.addEventListener("change", () => {
        if (toggle.checked) {
          window.setTimeout(() => input.focus(), 60);
          return;
        }
        // Closing: focus must land on a visible control that does not reopen the
        // panel (focusing the search input does). Prefer the header search toggle,
        // then the logo, then the skip link.
        window.setTimeout(() => {
          const logo = document.querySelector(".md-header__button.md-logo");
          const skip = document.querySelector(".md-skip");
          const candidates = [headerToggle, logo, skip, ...document.querySelectorAll(".md-header__button")];
          const target = candidates.find((el) => el && el.offsetParent !== null && el.getClientRects().length);
          if (target) target.focus();
        }, 50);
      });
    }

    // The clear button empties the field but the result list still shows the last query.
    document.querySelectorAll(".md-search__options button").forEach((button) => {
      button.addEventListener("click", () => {
        window.setTimeout(() => {
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new KeyboardEvent("keyup", { key: "Process", bubbles: true }));
        }, 0);
      });
    });

    // The page-level result link has an empty ?h=; reuse the current query so the
    // landing page highlights the term just like the section links do.
    output.addEventListener("click", (event) => {
      const link = event.target.closest("a");
      const query = input.value.trim();
      if (!link || !query) return;
      try {
        const url = new URL(link.href, location.href);
        if (!url.searchParams.get("h")) {
          url.searchParams.set("h", query);
          link.href = url.href;
        }
      } catch {
      }
    }, true);

    // Acronyms such as FCFS are tokenised away by the zh search pipeline; offer the
    // Chinese term instead of a dead end.
    const aliases = {
      FCFS: "先来先服务", SPF: "短进程优先", SJF: "短进程优先", RR: "时间片轮转",
      CPU: "处理器", DRAM: "动态随机存储器", ISA: "指令系统", DOS: "操作系统",
      PCB: "进程控制块", TLB: "快表", DMA: "直接存储器存取",
    };
    const meta = output.querySelector(".md-search-result__meta");
    if (!meta) return;
    const observer = new MutationObserver(() => {
      const query = input.value.trim().toUpperCase();
      const empty = /没有找到|No results/.test(meta.textContent || "");
      const existing = output.querySelector(".search-alias-hint");
      if (!empty || !aliases[query]) {
        if (existing) existing.remove();
        return;
      }
      if (existing && existing.dataset.query === query) return;
      if (existing) existing.remove();
      const hint = document.createElement("p");
      hint.className = "search-alias-hint";
      hint.dataset.query = query;
      hint.textContent = `没有找到「${input.value.trim()}」，试试「${aliases[query]}」`;
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = aliases[query];
      button.addEventListener("click", () => {
        input.value = aliases[query];
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new KeyboardEvent("keyup", { key: "Process", bubbles: true }));
      });
      hint.append(" ", button);
      meta.after(hint);
    });
    observer.observe(output, { childList: true, subtree: true, characterData: true });
  }

  /** Drawer: keyboard toggle, Esc, focus containment, background scroll lock. */
  function initDrawerA11y() {
    const sidebar = document.querySelector(".md-sidebar--primary");
    const label = document.querySelector('.md-header label[for="__drawer"]');
    if (!sidebar) return;
    const box = () => document.getElementById("__drawer");
    const wide = window.matchMedia("(min-width: 76.25em)");
    function sync() {
      const toggle = box();
      if (!toggle) return;
      const drawer = !wide.matches;
      const open = toggle.checked;
      document.documentElement.classList.toggle("drawer-open", drawer && open);
      if (!drawer) {
        sidebar.removeAttribute("inert");
        sidebar.removeAttribute("aria-hidden");
        return;
      }
      if (open) {
        sidebar.removeAttribute("inert");
        sidebar.removeAttribute("aria-hidden");
      } else {
        sidebar.setAttribute("inert", "");
        sidebar.setAttribute("aria-hidden", "true");
      }
    }
    document.addEventListener("change", (event) => {
      if (event.target && event.target.id === "__drawer") sync();
    });
    if (typeof wide.addEventListener === "function") wide.addEventListener("change", sync);
    sync();
    if (label) {
      label.setAttribute("tabindex", "0");
      label.setAttribute("role", "button");
      label.setAttribute("aria-label", "打开导航");
      label.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        const before = box()?.checked ?? false;
        // The focused <label> also gets the browser's own activation on Enter in
        // Chromium; deferring our write guarantees the intended final state.
        window.setTimeout(() => {
          const toggle = box();
          if (!toggle) return;
          toggle.checked = !before;
          toggle.dispatchEvent(new Event("change", { bubbles: true }));
        }, 0);
      });
    }
    label?.addEventListener("click", () => {
      // Native label activation toggles the checkbox exactly once; keep the
      // drawer lock/aria state in sync with it.
      window.setTimeout(sync, 0);
    });
    document.addEventListener("keydown", (event) => {
      const toggle = box();
      if (event.key !== "Escape" || !toggle || !toggle.checked) return;
      toggle.checked = false;
      toggle.dispatchEvent(new Event("change", { bubbles: true }));
      if (label) label.focus();
    });
  }

  /** The modal dialog has a single focusable child; keep Tab inside it. */
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
  initScheduler();
  initSearchInputFallback();
  initSearchTabStop();
  initTableScrollHints();
  initMathScrollHints();
  initPrintAnswers();
  initCrossTabProgress();
  initTopButton();
  initSearchA11y();
  initDrawerA11y();
  initDialogFocus();
  initStorageGuard();
  initPaletteKeys();
})();
