import assert from 'node:assert/strict';
import { schedule } from '../src/scripts/scheduling.mjs';

// 教材笔记的 FCFS 核算例。
const sample = schedule([{ arrival: 0, burst: 3 }, { arrival: 1, burst: 2 }]);
assert.deepEqual(sample.results.map(p => [p.finish, p.turnaround, p.weighted]), [[3, 3, 1], [5, 4, 2]]);
assert.equal(sample.average, 3.5);

// SPF 不抢占当前运行者，并只从已经到达的进程中选择。
const jobs = [{ arrival: 0, burst: 5 }, { arrival: 1, burst: 3 }, { arrival: 2, burst: 1 }, { arrival: 4, burst: 2 }];
assert.deepEqual(schedule(jobs, 'spf').segments.map(s => s.id), ['P1', 'P3', 'P4', 'P2']);
assert.equal(schedule(jobs, 'fcfs').average, 6.5);
assert.equal(schedule(jobs, 'spf').average, 5.75);

// 时间片边界的新到达者应排在刚耗尽时间片的进程之前。
const rr = schedule([{ arrival: 0, burst: 4 }, { arrival: 2, burst: 1 }], 'rr', 2);
assert.deepEqual(rr.segments.map(s => [s.id, s.start, s.end]), [['P1', 0, 2], ['P2', 2, 3], ['P1', 3, 5]]);
const idle = schedule([{ arrival: 3, burst: 1 }, { arrival: 6, burst: 2 }]);
assert.deepEqual(idle.segments.map(s => s.id), ['空闲', 'P1', '空闲', 'P2']);
for (const algorithm of ['fcfs', 'spf', 'rr']) {
  const result = schedule(jobs, algorithm, 2);
  jobs.forEach((job, i) => {
    assert.equal(result.segments.filter(s => s.order === i).reduce((sum, s) => sum + s.end - s.start, 0), job.burst);
    assert.ok(result.results[i].turnaround >= job.burst);
  });
}
assert.throws(() => schedule([{ arrival: 0, burst: 0 }]));
assert.throws(() => schedule(jobs, 'rr', 0));
console.log('调度核算通过：FCFS、SPF、RR、边界到达、CPU 空闲、总服务时间与输入校验。');
