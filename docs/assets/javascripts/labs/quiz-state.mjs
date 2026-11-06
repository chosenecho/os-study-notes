// Answers persist option identities; the public API accepts current canonical indices.
export const QUIZ_STORAGE_KEY = 'studynote:quiz:v1';

export function createQuizStore(questions, storage, now = Date.now, {random = Math.random} = {}) {
  const byId = new Map(questions.map(q => [String(q.id), q]));
  const optionIds = q => q.optionIds || q.options.map((_, i) => String(q.id) + ':' + i);
  const correctId = q => optionIds(q)[q.answer];
  const revision = q => q.revision === undefined
    ? JSON.stringify([q.prompt, q.options, q.answer]) : String(q.revision) + ':' + correctId(q);
  const revisions = Object.fromEntries(questions.map(q => [q.id, revision(q)]));
  const signature = JSON.stringify(questions.map(q => [q.id, q.prompt, q.options, q.answer]));
  let hash = 2166136261;
  for (const char of signature) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  const bank = String(hash);
  const empty = course => ({version:3, revisions, course, settings:{}, sessions:{}, records:{}, history:[]});
  let state = empty('all'), available = true, preserveOriginal = false, notice = '';
  const validCourse = course => course === 'all' || questions.some(q => q.course === course);
  const matches = (q, course) => course === 'all' || q.course === course;
  const validIndex = (id, value) => Number.isInteger(value) && value >= 0 && value < byId.get(id)?.options.length;
  const validId = (id, value) => typeof value === 'string' && optionIds(byId.get(id)).includes(value);
  const settingsFor = (course, value = {}) => ({
    chapter: Number.isInteger(value.chapter) && questions.some(q => matches(q,course) && q.chapter === value.chapter) ? value.chapter : 'all',
    count: value.count === 10 ? 10 : 'all', shuffle: value.shuffle === true
  });
  const shuffle = values => {
    const copy = [...values];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.max(0, Math.min(0.999999999, random())) * (i + 1));
      [copy[i],copy[j]] = [copy[j],copy[i]];
    }
    return copy;
  };
  function ordersFor(ids) {
    const offset = Math.floor(random() * 4);
    return Object.fromEntries(ids.map((id,i) => {
      const q = byId.get(id), answer = correctId(q);
      const order = shuffle(optionIds(q).filter(option => option !== answer));
      order.splice((offset + i) % q.options.length, 0, answer);
      return [id,order];
    }));
  }
  try {
    const raw = JSON.parse(storage.getItem(QUIZ_STORAGE_KEY) || 'null');
    // This exact deployed v2 bank used IDs 1..60 and the first three options.
    // Do not interpret arbitrary unknown signatures as compatible.
    const publishedLegacy = raw?.version === 2 && raw.bank === '429383842';
    const legacy = raw?.version === 2 && (raw.bank === bank || publishedLegacy);
    const supported = legacy || raw?.version === 3;
    if (supported) {
      const compatible = id => byId.has(id) && (legacy
        ? (!publishedLegacy || (Number(id) >= 1 && Number(id) <= 60 && byId.get(id).legacyRevision === 1))
        : raw.revisions?.[id] === revisions[id]);
      const decode = (id, value) => legacy
        ? (validIndex(id,value) && (!publishedLegacy || value < 3) ? optionIds(byId.get(id))[value] : null)
        : (validId(id,value) ? value : null);
      if (validCourse(raw.course)) state.course = raw.course;
      for (const [course, value] of Object.entries(raw.settings || {})) {
        if (validCourse(course)) state.settings[course] = settingsFor(course,value);
      }
      for (const [id, record] of Object.entries(raw.records || {})) {
        if (!compatible(id)) { notice = '题库中实质修订或移除的题目已单独重置，其余记录保留。'; continue; }
        const lastAnswer = decode(id,record?.lastAnswer);
        if (lastAnswer === null || !Number.isSafeInteger(record.attempts) || record.attempts < 1 ||
            !Number.isSafeInteger(record.correctCount) || record.correctCount < 0 || record.correctCount > record.attempts) continue;
        state.records[id] = {lastAnswer,attempts:record.attempts,correctCount:record.correctCount,updatedAt:Number.isFinite(record.updatedAt)?record.updatedAt:0};
      }
      for (const [course, session] of Object.entries(raw.sessions || {})) {
        if (!validCourse(course) || !Array.isArray(session?.ids) || !session.ids.length) continue;
        const ids = session.ids.map(String);
        if (new Set(ids).size !== ids.length || ids.some(id => !compatible(id) || !matches(byId.get(id),course))) continue;
        if (!Number.isInteger(session.index) || session.index < 0 || session.index > ids.length) continue;
        const answers = {}, orders = {};
        let valid = true;
        for (const [i,id] of ids.entries()) {
          const value = session.answers?.[id];
          if (i < session.index && value === undefined) valid = false;
          if (i > session.index && value !== undefined) valid = false;
          if (value !== undefined) {
            const answer = decode(id,value);
            if (answer === null) valid = false; else answers[id] = answer;
          }
          const options = optionIds(byId.get(id));
          const saved = legacy ? options : session.orders?.[id];
          if (!Array.isArray(saved) || new Set(saved).size !== saved.length || saved.some(option => !options.includes(option))) valid = false;
          else orders[id] = [...saved, ...options.filter(option => !saved.includes(option))];
        }
        if (valid) state.sessions[course] = {ids,index:session.index,answers,orders,mode:session.mode === 'missed'?'missed':'all',settings:settingsFor(course,session.settings)};
      }
      state.history = Array.isArray(raw.history) ? raw.history.filter(row => validCourse(row?.course) &&
        Number.isInteger(row.total) && row.total > 0 && Number.isInteger(row.correct) && row.correct >= 0 &&
        row.correct <= row.total && Number.isFinite(row.at)).slice(-20).map(row => ({course:row.course,total:row.total,correct:row.correct,at:row.at})) : [];
      if (legacy) notice = '旧版自测记录已迁移；已作答内容和历史成绩保留，新题组选项会重新分布。';
    } else if (raw) {
      // Back up before the first new session can overwrite an unknown schema.
      try {
        storage.setItem(QUIZ_STORAGE_KEY + ':unrecognized', JSON.stringify(raw));
        notice = '无法确认旧记录的题目版本，原始记录已另存于本浏览器备份键，当前使用新会话。';
      } catch {
        available = false;
        preserveOriginal = true;
        notice = '无法确认旧记录版本且浏览器不允许备份；本次仅使用临时会话，原始记录不覆盖。';
      }
    }
  } catch { /* Corrupt JSON or storage denial leaves a usable in-memory store. */ }
  function save() {
    if (preserveOriginal) return;
    try { storage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(state)); available = true; }
    catch { available = false; }
  }
  function missedIds(course) {
    return questions.filter(q => matches(q,course) && state.records[q.id] &&
      state.records[q.id].lastAnswer !== correctId(q)).map(q => String(q.id));
  }
  function start(course, mode = 'all', settings = state.settings[course]) {
    if (!validCourse(course)) course = 'all';
    settings = settingsFor(course,settings);
    let ids = mode === 'missed' ? missedIds(course) : questions.filter(q => matches(q,course)).map(q => String(q.id));
    ids = ids.filter(id => settings.chapter === 'all' || byId.get(id).chapter === settings.chapter);
    if (settings.shuffle) ids = shuffle(ids);
    if (settings.count !== 'all') ids = ids.slice(0,settings.count);
    if (!ids.length) return false;
    state.course = course;
    state.settings[course] = settings;
    state.sessions[course] = {ids,index:0,answers:{},orders:ordersFor(ids),mode,settings};
    save(); return true;
  }
  function session(course = state.course) {
    if (!validCourse(course)) course = 'all';
    state.course = course;
    if (!state.sessions[course]) start(course);
    const current = state.sessions[course], queue = current.ids.map(id => byId.get(id));
    const answers = Object.fromEntries(Object.entries(current.answers).map(([id,value]) => [id,optionIds(byId.get(id)).indexOf(value)]));
    const orders = Object.fromEntries(current.ids.map(id => [id,current.orders[id].map(value => optionIds(byId.get(id)).indexOf(value))]));
    const correct = queue.filter(q => current.answers[q.id] === correctId(q)).length;
    const missed = queue.filter(q => current.answers[q.id] !== undefined && current.answers[q.id] !== correctId(q));
    save();
    return {...current,settings:{...current.settings},ids:[...current.ids],answers,orders,queue,answered:Object.keys(answers).length,correct,missed};
  }
  function answer(course, value) {
    const current = state.sessions[course];
    if (!current || current.index >= current.ids.length) return false;
    const id = current.ids[current.index], q = byId.get(id);
    if (current.answers[id] !== undefined || !validIndex(id,value)) return false;
    current.answers[id] = optionIds(q)[value];
    const previous = state.records[id];
    state.records[id] = {lastAnswer:current.answers[id],attempts:(previous?.attempts||0)+1,
      correctCount:(previous?.correctCount||0)+Number(value===q.answer),updatedAt:now()};
    save(); return true;
  }
  function next(course) {
    const current = state.sessions[course];
    if (!current || current.index >= current.ids.length || current.answers[current.ids[current.index]] === undefined) return false;
    current.index++;
    if (current.index === current.ids.length) {
      const correct = current.ids.filter(id => current.answers[id] === correctId(byId.get(id))).length;
      state.history.push({course,total:current.ids.length,correct,at:now()}); state.history = state.history.slice(-20);
    }
    save(); return true;
  }
  function stats(course = state.course) {
    const records = Object.entries(state.records).filter(([id]) => matches(byId.get(id),course)).map(([,r]) => r);
    return {attempted:records.reduce((n,r)=>n+r.attempts,0),correct:records.reduce((n,r)=>n+r.correctCount,0),
      missed:missedIds(course).length,last:state.history.filter(r=>r.course===course).at(-1)||null};
  }
  function retryRound(course) {
    const current = state.sessions[course], ids = current?.ids.filter(id => current.answers[id] !== undefined &&
      current.answers[id] !== correctId(byId.get(id))) || [];
    if (!ids.length) return false;
    state.course = course;
    state.sessions[course] = {ids,index:0,answers:{},orders:ordersFor(ids),mode:'missed',settings:current.settings};
    save(); return true;
  }
  function clear() {
    state = empty(state.course); notice = ''; preserveOriginal = false;
    try {
      storage.removeItem(QUIZ_STORAGE_KEY);
      storage.removeItem(QUIZ_STORAGE_KEY + ':unrecognized');
    } catch { available = false; }
  }
  return {get course(){return state.course;},get available(){return available;},get notice(){return notice;},session,start,answer,next,stats,retryRound,clear};
}
