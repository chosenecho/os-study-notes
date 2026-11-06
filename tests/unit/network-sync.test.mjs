import assert from 'node:assert/strict';
import fs from 'node:fs';
import {cidr,semaphore} from '../../docs/assets/javascripts/labs/labs-core.mjs';

// Independent BigInt masks cover every prefix, including both unsigned extremes.
const dotted=n=>[24n,16n,8n,0n].map(s=>String((n>>s)&255n)).join('.');
let cases=0;
for(const value of [0n,1n,0x0a172d43n,0x80000000n,0xfffffffen,0xffffffffn]){
  for(let prefix=0;prefix<=32;prefix++){
    const mask=(0xffffffffn<<BigInt(32-prefix))&0xffffffffn;
    const first=value&mask,last=first|(~mask&0xffffffffn);
    const result=cidr(dotted(value)+'/'+prefix);
    assert.equal(result.network,dotted(first));
    assert.equal(result.last,dotted(last));
    assert.equal(result.mask,dotted(mask));
    assert.equal(result.count,Number(last-first+1n));
    assert.equal(result.usable,prefix<=30?Number(last-first-1n):null);
    cases++;
  }
}
const r=cidr('10.23.45.67/20',['0.0.0.0/0','10.0.0.0/8','10.23.32.0/20','192.0.2.0/24']);
assert.equal(r.route,'10.23.32.0/20');
assert.equal(cidr('192.0.2.4/24',['10.0.0.0/8']).route,null);
for(const bad of ['256.0.0.1/24','1.2.3/24','1.2.3.4/33','-1.2.3.4/8','1.2.3.4/2.5'])assert.throws(()=>cidr(bad));
assert.throws(()=>cidr('10.0.0.1/8',['10.1.0.0/8']),/起点/);
assert.throws(()=>cidr('10.0.0.1/8',Array(21).fill('0.0.0.0/0')));

const example=semaphore(1,['P0:P','P1:P','P0:V','P1:V']);
assert.deepEqual(example.steps.map(s=>s.value),[0,-1,0,1]);
assert.deepEqual(example.steps.map(s=>s.queue),[[],['P1'],[],[]]);
assert.equal(example.steps[2].wake,'P1');
// Initial zero, multiple waiters, FIFO wake-up and cross-process V are legal.
const queued=semaphore(0,['P0:P','P1:P','P2:V','P3:V']);
assert.deepEqual(queued.steps.map(s=>s.wake),[null,null,'P0','P1']);
assert.equal(queued.value,0);
assert.throws(()=>semaphore(0,['P0:P','P0:V']),/仍阻塞/);
assert.throws(()=>semaphore(1,['P6:P']));
assert.throws(()=>semaphore(-1,['P0:P']));
assert.throws(()=>semaphore(1,[]));
// Enumerate valid atomic traces; queue size is -S when S is negative.
function traces(initial,events,depth){
  const state=events.length?semaphore(initial,events):{value:initial,queue:[]};
  assert.equal(state.queue.length,Math.max(0,-state.value));
  assert.equal(new Set(state.queue).size,state.queue.length);
  const p=events.filter(x=>x.endsWith(':P')).length,v=events.length-p;
  assert.equal(state.value,initial-p+v);
  cases++;
  if(!depth)return;
  for(let process=0;process<3;process++){
    if(state.queue.includes('P'+process))continue;
    for(const op of ['P','V'])traces(initial,[...events,'P'+process+':'+op],depth-1);
  }
}
for(const initial of [0,1,2])traces(initial,[],5);
const pv=fs.readFileSync('docs/labs/semaphore.md','utf8');
const ip=fs.readFileSync('docs/labs/cidr.md','utf8');
assert(pv.includes('P0:P、P1:P、P0:V、P1:V'));
assert(pv.includes('最终 S=1'));
for(const value of [r.network,r.last,r.mask,String(r.count),String(r.usable)])assert(ip.includes(value),value);
console.log('PV invariants, FIFO/blocked callers, CIDR BigInt oracle and published examples: '+cases+' cases passed.');
