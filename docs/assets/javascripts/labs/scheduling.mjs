/** 单 CPU 调度；返回连续执行片段和每个进程的统计值。 */
export function schedule(processes, algorithm = 'fcfs', quantum = 2) {
  if (!['fcfs', 'spf', 'rr'].includes(algorithm)) throw new Error('未知算法');
  if (!Number.isInteger(quantum) || quantum < 1 || quantum > 100) throw new Error('时间片应为 1～100 的整数');
  if (!processes.length || processes.length > 20) throw new Error('进程数量应为 1～20');
  const jobs = processes.map((p, i) => {
    if (!Number.isInteger(p.arrival) || p.arrival < 0 || p.arrival > 100 || !Number.isInteger(p.burst) || p.burst < 1 || p.burst > 100) throw new Error('到达时刻应为 0～100、服务时间应为 1～100 的整数');
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
      segments.push({ id: '空闲', start: time, end, order: -1 });
      time = end;
      enqueue();
    }
    if (algorithm === 'spf') ready.sort((a, b) => a.burst - b.burst || a.arrival - b.arrival || a.order - b.order);
    const job = ready.shift();
    const duration = algorithm === 'rr' ? Math.min(quantum, job.remaining) : job.remaining;
    segments.push({ id: job.id, start: time, end: time + duration, order: job.order });
    time += duration;
    job.remaining -= duration;
    enqueue();
    if (job.remaining) ready.push(job); else job.finish = time;
  }
  const results = jobs.map(p => ({ ...p, turnaround: p.finish - p.arrival, weighted: (p.finish - p.arrival) / p.burst }));
  return { segments, results, average: results.reduce((n, p) => n + p.turnaround, 0) / jobs.length, weightedAverage: results.reduce((n, p) => n + p.weighted, 0) / jobs.length };
}
