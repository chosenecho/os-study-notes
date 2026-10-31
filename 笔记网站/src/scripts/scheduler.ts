import { schedule } from './scheduling.mjs';

export function initScheduler() {
  const root = document.querySelector<HTMLElement>('[data-scheduler]');
  if (!root || root.dataset.ready) return;
  root.dataset.ready = 'true';
  const form = root.querySelector('form')!;
  const output = root.querySelector<HTMLElement>('.lab-results')!;
  const algorithm = form.elements.namedItem('algorithm') as HTMLSelectElement;
  const quantum = form.elements.namedItem('quantum') as HTMLInputElement;
  function updateQuantum() { quantum.disabled = algorithm.value !== 'rr'; }
  algorithm.addEventListener('change', updateQuantum);
  function run() {
    try {
      const data = new FormData(form);
      const processes = Array.from({ length: 4 }, (_, i) => ({ arrival: Number(data.get(`arrival-${i}`)), burst: Number(data.get(`burst-${i}`)) }));
      const result = schedule(processes, algorithm.value, Number(quantum.value));
      output.replaceChildren();
      const title = document.createElement('h2');
      title.textContent = '执行时间轴';
      output.append(title);
      const chart = document.createElement('div');
      chart.className = 'gantt';
      chart.setAttribute('aria-label', '按时间顺序排列的执行片段，长度与运行时间成比例');
      result.segments.forEach(segment => {
        const block = document.createElement('div');
        block.className = `gantt-block process-${segment.order}`;
        block.style.flexGrow = String(segment.end - segment.start);
        block.textContent = `${segment.id}\n${segment.start}–${segment.end}`;
        block.title = `${segment.id}：${segment.start} 至 ${segment.end}`;
        chart.append(block);
      });
      output.append(chart);
      const metrics = document.createElement('p');
      metrics.className = 'lab-metrics';
      metrics.textContent = `平均周转时间 ${result.average.toFixed(2)}　·　平均带权周转时间 ${result.weightedAverage.toFixed(2)}`;
      output.append(metrics);
      const table = document.createElement('table');
      const head = table.createTHead().insertRow();
      ['进程', '完成时刻', '周转时间', '带权周转时间'].forEach(label => { const th = document.createElement('th'); th.scope = 'col'; th.textContent = label; head.append(th); });
      const body = table.createTBody();
      result.results.forEach(p => {
        const row = body.insertRow();
        [p.id, p.finish, p.turnaround, p.weighted.toFixed(2)].forEach(value => { row.insertCell().textContent = String(value); });
      });
      output.append(table);
    } catch (error) { output.textContent = error instanceof Error ? error.message : '参数有误'; }
  }
  form.addEventListener('submit', event => { event.preventDefault(); run(); });
  form.addEventListener('reset', () => { setTimeout(() => { updateQuantum(); run(); }, 0); });
  updateQuantum();
  run();
}
