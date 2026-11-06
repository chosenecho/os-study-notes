import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createQuizStore,QUIZ_STORAGE_KEY} from '../../docs/assets/javascripts/labs/quiz-state.mjs';
import {questions} from '../../docs/assets/javascripts/labs/quiz-bank.mjs';
const fixture = fs.readFileSync(new URL('../fixtures/quiz-v2.json',import.meta.url),'utf8');
const data = new Map([[QUIZ_STORAGE_KEY,fixture]]);
const storage = {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
let seed = 42;
const random = () => ((seed = (Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
const create = (bank=questions) => createQuizStore(bank,storage,()=>1793937600000,{random});
let store = create();
assert.match(store.notice,/迁移/);
assert.equal(store.stats('os').attempted,12);
assert.equal(store.stats('os').correct,11);
assert.equal(store.stats('os').missed,1);
assert.equal(store.stats('mm').attempted,1);
assert.equal(store.session('os').index,12);
assert.equal(store.session('mm').answered,1);
assert.equal(store.stats('os').last.total,12);
const migrated = data.get(QUIZ_STORAGE_KEY);
const unknown = JSON.stringify({version:99,bank:'unknown',important:'retain'});
data.set(QUIZ_STORAGE_KEY,unknown);
const fresh=create(); fresh.session('os');
assert.equal(data.get(QUIZ_STORAGE_KEY+':unrecognized'),unknown);
const denied=createQuizStore(questions,{getItem:()=>unknown,setItem(){throw Error('denied');},removeItem(){} });
denied.session('os');
assert.equal(denied.available,false);
assert.match(denied.notice,/不覆盖/);
data.set(QUIZ_STORAGE_KEY,migrated);
store = create();
assert.equal(store.stats('os').attempted,12);
assert.equal(store.session('mm').answered,1);
store.start('os','all',{chapter:2,count:10,shuffle:true});
let session = store.session('os');
assert.equal(session.queue.length,2,'A short chapter round reports its actual available count');
assert(session.queue.every(q=>q.chapter===2));
const order = session.ids, options = session.orders;
store = create();
assert.deepEqual(store.session('os').ids,order);
assert.deepEqual(store.session('os').orders,options,'Reload preserves option positions');
store.start('all','all',{count:10,shuffle:true});
assert.equal(store.session().queue.length,10);
assert.notDeepEqual(store.session().ids,questions.slice(0,10).map(q=>String(q.id)));
for (const q of questions) {
  assert.equal(q.options.length,4);
  assert.equal(new Set(q.optionIds).size,q.options.length);
  assert.equal(q.optionIds.length,q.options.length);
}
// Reordering canonical data must retain the meaning of a saved answer.
data.set(QUIZ_STORAGE_KEY,migrated);
const reordered = questions.map(q=>{
  const indices=q.options.map((_,i)=>i).reverse();
  return {...q,options:indices.map(i=>q.options[i]),optionIds:indices.map(i=>q.optionIds[i]),answer:indices.indexOf(q.answer)};
});
store = create(reordered);
assert.equal(store.stats('os').attempted,12);
assert.equal(store.stats('os').missed,1);
assert.equal(store.session('mm').answered,1);
// A substantive revision resets only the changed question, retaining old history.
data.set(QUIZ_STORAGE_KEY,migrated);
store = create(questions.map(q=>q.id===1?{...q,revision:2}:q));
assert.equal(store.stats('os').attempted,11);
assert.equal(store.stats('os').last.total,12);
assert.equal(store.stats('mm').attempted,1);
data.clear(); store = create();
const displayed = Array(questions[0].options.length).fill(0);
for(let trial=0;trial<100;trial++){
  store.start('all');
  const round=store.session();
  for(const q of round.queue) displayed[round.orders[q.id].indexOf(q.answer)]++;
}
assert(Math.max(...displayed)-Math.min(...displayed)<=100,'Actual displayed correct positions are balanced');
const fixedA = store.session().queue.filter(q=>store.session().orders[q.id][0]===q.answer).length;
assert(fixedA<questions.length/2,'Always choosing displayed A cannot exploit the canonical bias');
fs.mkdirSync('artifacts/p1-p2',{recursive:true});
fs.writeFileSync('artifacts/p1-p2/quiz-distribution.json',JSON.stringify({trials:100,displayed,questions:questions.length},null,2));
console.log('Quiz migration: deployed v2 scores/notebook, stable option identities, partial revisions, chapter/short/shuffled rounds and display distribution passed.');
