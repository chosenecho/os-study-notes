import { schedule } from './scheduling.mjs';

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


initScheduler();
