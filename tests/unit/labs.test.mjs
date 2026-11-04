import assert from 'node:assert/strict';
import {integer,sequence,matrix,paging,banker,address,cache,complement} from '../../website/src/assets/labs-core.mjs';
import {questions} from '../../website/src/assets/quiz-bank.mjs';
let cases=0;
function check(fn){fn();cases++;}
check(()=>{const r=[7,0,1,2,0,3,0,4,2,3,0,3,2];assert.equal(paging(r,3,'fifo').faults,10);assert.equal(paging(r,3,'lru').faults,9);assert.equal(paging(r,3,'opt').faults,7);});
check(()=>{const r=[1,2,3,4,1,2,5,1,2,3,4,5];assert.equal(paging(r,3,'fifo').faults,9);assert.equal(paging(r,4,'fifo').faults,10);assert.equal(paging([0,0,0],1,'lru').faults,1);});
const alloc=matrix('0 1 0\n2 0 0\n3 0 2\n2 1 1\n0 0 2'), max=matrix('7 5 3\n3 2 2\n9 0 2\n2 2 2\n4 3 3');
check(()=>{const r=banker([3,3,2],alloc,max);assert.equal(r.safe,true);assert.deepEqual(r.order,[1,3,0,2,4]);assert.deepEqual(r.finalWork,[10,5,7]);});
check(()=>{assert.equal(banker([3,3,2],alloc,max,{process:1,resources:[1,0,2]}).safe,true);assert.equal(banker([3,3,2],alloc,max,{process:4,resources:[3,3,0]}).safe,false);assert.match(banker([3,3,2],alloc,max,{process:1,resources:[2,0,0]}).blocked,/Need/);assert.match(banker([3,3,2],alloc,max,{process:0,resources:[0,0,3]}).blocked,/Available/);assert.deepEqual(alloc[1],[2,0,0]);});
check(()=>{assert.equal(address(2500,1024,[5,2,7,null]).physical,7620);assert.equal(address(3072,1024,[5,2,7,null]).status,'缺页');assert.equal(address(4096,1024,[5,2,7,null]).status,'越界');assert.equal(address(1023,1024,[0]).physical,1023);});
check(()=>{const r=cache([0,4,16,64,0,16],4,16);assert.equal(r.misses,4);assert.equal(r.hits,2);assert.equal(r.steps[3].line,0);assert.equal(r.steps[3].tag,1);assert.equal(r.steps[1].offset,4);assert.equal(r.steps[1].hit,true);});
check(()=>{assert.deepEqual([complement(100,40,8,'add').signed,complement(100,40,8,'add').overflow],[-116,true]);assert.equal(complement(-128,-128,8,'sub').signed,0);assert.equal(complement(-128,-128,8,'sub').overflow,false);assert.equal(complement(-128,1,8,'sub').signed,127);});
for(const width of [4,8]){
 const min=-(2**(width-1)), max=2**(width-1)-1,mod=2**width;
 for(let a=min;a<=max;a++)for(let b=min;b<=max;b++)for(const op of ['add','sub'])check(()=>{const real=op==='add'?a+b:a-b,r=complement(a,b,width,op);const raw=((real%mod)+mod)%mod;assert.equal(parseInt(r.bits,2),raw);assert.equal(r.overflow,real<min||real>max);assert.equal(r.signed,raw>max?raw-mod:raw);});
}
// An independent queue/list reference checks both online eviction policies.
let seed=271828;const rand=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
for(let trial=0;trial<150;trial++){const refs=Array.from({length:12},()=>rand(6)),count=1+rand(4);for(const algorithm of ['fifo','lru'])check(()=>{const queue=[];let faults=0;for(const p of refs){const pos=queue.indexOf(p);if(pos<0){faults++;if(queue.length===count)queue.shift();queue.push(p);}else if(algorithm==='lru'){queue.splice(pos,1);queue.push(p);}}assert.equal(paging(refs,count,algorithm).faults,faults);});}
// Exhaustive short-sequence search verifies OPT, rather than reusing its rule.
function optimum(refs,count,i=0,frames=[]){if(i===refs.length)return 0;const p=refs[i];if(frames.includes(p))return optimum(refs,count,i+1,frames);if(frames.length<count)return 1+optimum(refs,count,i+1,[...frames,p]);return 1+Math.min(...frames.map((_,j)=>optimum(refs,count,i+1,frames.map((v,k)=>j===k?p:v))));}
for(let t=0;t<80;t++)check(()=>{const refs=Array.from({length:8},()=>rand(5)),count=1+rand(3);assert.equal(paging(refs,count,'opt').faults,optimum(refs,count));});
check(()=>{for(const fn of [()=>sequence(''),()=>sequence('1 -2'),()=>sequence('1.5'),()=>integer('',0,8,'x'),()=>matrix('1 2\n3'),()=>banker([1],[[2]],[[1]]),()=>cache([0],3,16),()=>complement(128,0,8,'add'),()=>paging([1],0,'fifo')])assert.throws(fn);});
check(()=>{assert.equal(questions.length,24);assert.equal(new Set(questions.map(q=>q.id)).size,24);for(const course of ['os','co'])for(let chapter=1;chapter<=6;chapter++)assert.equal(questions.filter(q=>q.course===course&&q.chapter===chapter).length,2);for(const q of questions){assert(q.answer>=0&&q.answer<q.options.length);assert(q.explanation.length>20);}});
console.log(JSON.stringify({status:'passed',cases,questionCount:questions.length,chapterCoverage:12,complementExhaustiveWidths:[4,8],onlinePolicyRandomTrials:150,optBruteForceTrials:80}));
