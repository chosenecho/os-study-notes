// Check the published handwritten examples against the actual interactive models.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {schedule} from '../../docs/assets/javascripts/labs/scheduling.mjs';
import {paging, banker, address, cache, complement} from '../../docs/assets/javascripts/labs/labs-core.mjs';

const note = name => fs.readFileSync(new URL('../../docs/labs/' + name + '.md', import.meta.url), 'utf8');
const includes = (name, text) => assert(note(name).includes(text), name + ': ' + text);
const jobs = [{arrival: 0, burst: 5}, {arrival: 1, burst: 3}, {arrival: 2, burst: 1}, {arrival: 4, burst: 2}];
const scheduled = schedule(jobs, 'fcfs');
for (const p of scheduled.results) {
  const weighted = p.turnaround % p.burst ? p.turnaround + '/' + p.burst : String(p.weighted);
  includes('scheduling', '| ' + [p.id, p.arrival, p.burst, p.finish, p.turnaround, weighted].join(' | ') + ' |');
}
includes('scheduling', '**' + scheduled.average + ' ms**');
includes('scheduling', scheduled.weightedAverage.toFixed(4));
const allocation = [[1, 0], [0, 1], [1, 0]], maximum = [[2, 1], [2, 1], [1, 2]];
const safe = banker([1, 1], allocation, maximum);
for (let i = 0; i < 3; i++) includes('banker',
  '| P' + i + ' | (' + allocation[i] + ') | (' + maximum[i] + ') | (' + safe.need[i] + ') |');
includes('banker', safe.order.map(i => 'P' + i).join(' → '));
includes('banker', 'Work=(' + safe.finalWork + ')');
const unsafe = banker([1, 1], allocation, maximum, {process: 1, resources: [1, 0]});
assert.equal(unsafe.safe, false);
includes('banker', 'Work 变为 (' + unsafe.initialWork + ')');
const refs = [2, 3, 4, 2, 5, 3, 6];
const policies = ['fifo', 'lru', 'opt'].map(a => paging(refs, 3, a));
for (let i = 0; i < refs.length; i++) includes('paging', '| ' + [i + 1, refs[i],
  ...policies.map(p => p.steps[i].frames.map(n => n ?? '-').join(','))].join(' | ') + ' |');
for (const [i, label] of ['FIFO', 'LRU', 'OPT'].entries()) {
  assert.match(note('paging'), new RegExp(label + ' 共(?:缺页)? \\*\\*' + policies[i].faults + ' 次'));
}
const translated = address(2500, 1024, [5, 2, 7, null]);
includes('address', '2500 = ' + translated.page + ' × 1024 + ' + translated.offset);
includes('address', '**' + translated.physical + '**');
const cached = cache([0, 4, 16, 64, 0, 16], 4, 16);
for (const s of cached.steps) includes('cache',
  '| ' + s.value + ' | ' + s.block + ' | ' + s.line + ' / ' + s.tag + ' | ' + (s.hit ? '命中' : '不命中') + ' |');
includes('cache', '**' + cached.misses + ' 次不命中、' + cached.hits + ' 次命中**');
const overflow = complement(100, 40, 8, 'add'), carry = complement(-1, 1, 8, 'add');
for (const bits of [overflow.a, overflow.b, overflow.bits, carry.a, carry.b]) includes('complement', bits);
includes('complement', '**' + String(overflow.signed).replace('-', '−'));
assert.equal(overflow.overflow, true);
assert.equal(carry.overflow, false);
assert.equal(carry.signed, 0);
assert.equal(parseInt(carry.a, 2) + parseInt(carry.b, 2), 256);
console.log('Six published static examples agree with the interactive models.');
