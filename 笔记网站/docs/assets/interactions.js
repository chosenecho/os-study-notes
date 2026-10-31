"use strict";
(() => {
  // 笔记网站/src/scripts/scheduling.mjs
  function schedule(processes, algorithm = "fcfs", quantum = 2) {
    if (!["fcfs", "spf", "rr"].includes(algorithm)) throw new Error("\u672A\u77E5\u7B97\u6CD5");
    if (!Number.isInteger(quantum) || quantum < 1 || quantum > 100) throw new Error("\u65F6\u95F4\u7247\u5E94\u4E3A 1\uFF5E100 \u7684\u6574\u6570");
    if (!processes.length || processes.length > 20) throw new Error("\u8FDB\u7A0B\u6570\u91CF\u5E94\u4E3A 1\uFF5E20");
    const jobs = processes.map((p, i) => {
      if (!Number.isInteger(p.arrival) || p.arrival < 0 || p.arrival > 100 || !Number.isInteger(p.burst) || p.burst < 1 || p.burst > 100) throw new Error("\u5230\u8FBE\u65F6\u523B\u5E94\u4E3A 0\uFF5E100\u3001\u670D\u52A1\u65F6\u95F4\u5E94\u4E3A 1\uFF5E100 \u7684\u6574\u6570");
      return { ...p, id: `P${i + 1}`, order: i, remaining: p.burst, finish: 0 };
    });
    const pending = [...jobs].sort((a, b) => a.arrival - b.arrival || a.order - b.order);
    const ready = [], segments = [];
    let time = 0, next = 0;
    function enqueue() {
      while (next < pending.length && pending[next].arrival <= time) ready.push(pending[next++]);
    }
    while (next < pending.length || ready.length) {
      enqueue();
      if (!ready.length) {
        const end = pending[next].arrival;
        segments.push({ id: "\u7A7A\u95F2", start: time, end, order: -1 });
        time = end;
        enqueue();
      }
      if (algorithm === "spf") ready.sort((a, b) => a.burst - b.burst || a.arrival - b.arrival || a.order - b.order);
      const job = ready.shift();
      const duration = algorithm === "rr" ? Math.min(quantum, job.remaining) : job.remaining;
      segments.push({ id: job.id, start: time, end: time + duration, order: job.order });
      time += duration;
      job.remaining -= duration;
      enqueue();
      if (job.remaining) ready.push(job);
      else job.finish = time;
    }
    const results = jobs.map((p) => ({ ...p, turnaround: p.finish - p.arrival, weighted: (p.finish - p.arrival) / p.burst }));
    return { segments, results, average: results.reduce((n, p) => n + p.turnaround, 0) / jobs.length, weightedAverage: results.reduce((n, p) => n + p.weighted, 0) / jobs.length };
  }

  // 笔记网站/src/scripts/scheduler.ts
  function initScheduler() {
    const root = document.querySelector("[data-scheduler]");
    if (!root || root.dataset.ready) return;
    root.dataset.ready = "true";
    const form = root.querySelector("form");
    const output = root.querySelector(".lab-results");
    const algorithm = form.elements.namedItem("algorithm");
    const quantum = form.elements.namedItem("quantum");
    function updateQuantum() {
      quantum.disabled = algorithm.value !== "rr";
    }
    algorithm.addEventListener("change", updateQuantum);
    function run() {
      try {
        const data = new FormData(form);
        const processes = Array.from({ length: 4 }, (_, i) => ({ arrival: Number(data.get(`arrival-${i}`)), burst: Number(data.get(`burst-${i}`)) }));
        const result = schedule(processes, algorithm.value, Number(quantum.value));
        output.replaceChildren();
        const title = document.createElement("h2");
        title.textContent = "\u6267\u884C\u65F6\u95F4\u8F74";
        output.append(title);
        const chart = document.createElement("div");
        chart.className = "gantt";
        chart.setAttribute("aria-label", "\u6309\u65F6\u95F4\u987A\u5E8F\u6392\u5217\u7684\u6267\u884C\u7247\u6BB5\uFF0C\u957F\u5EA6\u4E0E\u8FD0\u884C\u65F6\u95F4\u6210\u6BD4\u4F8B");
        result.segments.forEach((segment) => {
          const block = document.createElement("div");
          block.className = `gantt-block process-${segment.order}`;
          block.style.flexGrow = String(segment.end - segment.start);
          block.textContent = `${segment.id}
${segment.start}\u2013${segment.end}`;
          block.title = `${segment.id}\uFF1A${segment.start} \u81F3 ${segment.end}`;
          chart.append(block);
        });
        output.append(chart);
        const metrics = document.createElement("p");
        metrics.className = "lab-metrics";
        metrics.textContent = `\u5E73\u5747\u5468\u8F6C\u65F6\u95F4 ${result.average.toFixed(2)}\u3000\xB7\u3000\u5E73\u5747\u5E26\u6743\u5468\u8F6C\u65F6\u95F4 ${result.weightedAverage.toFixed(2)}`;
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
          [p.id, p.finish, p.turnaround, p.weighted.toFixed(2)].forEach((value) => {
            row.insertCell().textContent = String(value);
          });
        });
        output.append(table);
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

  // 笔记网站/migration-entry.ts
  var storageKey = "os-notes:completed:v1";
  function readProgress() {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey) || "[]");
      return Array.isArray(value) ? value.filter((v) => typeof v === "string") : [];
    } catch {
      return [];
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
      fontSelect.value = savedFont;
      fontSelect.addEventListener("change", () => {
        document.documentElement.style.setProperty("--note-font-size", `${fontSelect.value}px`);
        try {
          localStorage.setItem(fontKey, fontSelect.value);
        } catch {
        }
      });
      const id = toolbar.dataset.chapter;
      const checkbox = toolbar.querySelector("[data-complete]");
      checkbox.checked = readProgress().includes(id);
      checkbox.addEventListener("change", () => {
        const progress2 = new Set(readProgress());
        checkbox.checked ? progress2.add(id) : progress2.delete(id);
        const status = toolbar.querySelector(".save-status");
        try {
          localStorage.setItem(storageKey, JSON.stringify([...progress2]));
          status.textContent = "\u8FDB\u5EA6\u5DF2\u4FDD\u5B58\u5728\u6B64\u6D4F\u89C8\u5668";
        } catch {
          status.textContent = "\u6D4F\u89C8\u5668\u672A\u5141\u8BB8\u4FDD\u5B58\u8FDB\u5EA6";
        }
      });
    }
    const progress = readProgress();
    document.querySelectorAll("[data-progress-chapter]").forEach((badge) => {
      const completed = progress.includes(badge.dataset.progressChapter);
      badge.textContent = completed ? "\u5DF2\u590D\u4E60" : "\u5F85\u590D\u4E60";
      badge.dataset.completed = String(completed);
    });
    const count = document.querySelector("[data-progress-count]");
    if (count) count.textContent = String(["1", "2", "3"].filter((id) => progress.includes(id)).length);
    const progressBar = document.querySelector("[data-study-progress]");
    if (progressBar) progressBar.value = Number(count?.textContent || 0);
    const nextLink = document.querySelector("[data-next-chapter]");
    if (nextLink) {
      const next = ["1", "2", "3"].find((id) => !progress.includes(id));
      if (next) {
        nextLink.href = nextLink.href.replace(/chapter-\d/, `chapter-${next}`);
        nextLink.querySelector("[data-next-label]").textContent = progress.length ? `\u7EE7\u7EED\u590D\u4E60 \xB7 \u7B2C ${next} \u7AE0` : "\u5F00\u59CB\u7B2C\u4E00\u7AE0";
      } else nextLink.querySelector("[data-next-label]").textContent = "\u56DE\u987E\u7B2C\u4E00\u7AE0";
    }
    const dialog = document.querySelector(".image-dialog");
    if (!dialog || dialog.dataset.ready) return;
    dialog.dataset.ready = "true";
    dialog.querySelector("button").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
    document.querySelectorAll(".md-content__inner img").forEach((img) => {
      if (img.closest("dialog")) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "figure-zoom";
      button.setAttribute("aria-label", `\u653E\u5927\u63D2\u56FE\uFF1A${img.alt}`);
      img.replaceWith(button);
      button.append(img);
      const hint = document.createElement("span");
      hint.className = "zoom-hint";
      hint.textContent = "\u70B9\u51FB\u653E\u5927";
      hint.setAttribute("aria-hidden", "true");
      button.append(hint);
      button.addEventListener("click", () => {
        const preview = dialog.querySelector("img");
        preview.src = img.currentSrc || img.src;
        preview.alt = img.alt;
        dialog.querySelector("p").textContent = img.alt;
        dialog.showModal();
      });
    });
  }
  initNotes();
  initScheduler();
})();
