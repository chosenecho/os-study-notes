import assert from 'node:assert/strict';
import {createReadingStore, READING_KEY} from '../../docs/assets/javascripts/reading-state.mjs';
const data = new Map();
const storage = {getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value)};
const courses = [{id:'os', chapters:6}, {id:'cn', chapters:9}];
const store = createReadingStore(courses, storage, () => 1000);
assert.equal(store.visit('os-6'), true);
assert.deepEqual(store.get('os'), {chapter:6, at:1000});
assert.equal(store.visit('os-7'), false);
assert.equal(store.visit('unknown-1'), false);
assert.equal(store.visit('os-x'), false);
assert.equal(store.get('cn'), null);
data.set(READING_KEY, JSON.stringify({os:{chapter:2,at:10000000}, cn:{chapter:9,at:500}}));
assert.equal(store.get('os'), null);
assert.equal(store.get('cn').chapter, 9, 'Re-read storage so another tab is visible');
for (const raw of ['null', '[]', '{broken', '{"os":{"chapter":"2","at":500}}']) {
  data.set(READING_KEY, raw); assert.equal(store.get('os'), null);
}
const blocked = createReadingStore(courses, {getItem(){throw Error();},setItem(){throw Error();}});
assert.equal(blocked.visit('os-1'), false);
assert.equal(blocked.get('os'), null);
console.log('Reading state: valid targets, corrupt/future entries, cross-tab reads and denied storage passed.');
