// Store only question IDs and answers; derive scores from the current question bank.
export const QUIZ_STORAGE_KEY = 'studynote:quiz:v1';

export function createQuizStore(questions, storage, now = Date.now) {
  const byId = new Map(questions.map(q => [String(q.id), q]));
  const signature = JSON.stringify(questions.map(q => [q.id, q.prompt, q.options, q.answer]));
  let hash = 2166136261;
  for (const char of signature) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  const bank = String(hash);
  let state = {version: 2, bank, course: 'all', sessions: {}, records: {}, history: []};
  let available = true;
  const validCourse = course => course === 'all' || questions.some(q => q.course === course);
  const matches = (q, course) => course === 'all' || q.course === course;
  const validAnswer = (id, value) => Number.isInteger(value) && value >= 0 && value < byId.get(id)?.options.length;
  try {
    const raw = JSON.parse(storage.getItem(QUIZ_STORAGE_KEY) || 'null');
    if (raw?.version === 2 && raw.bank === bank) {
      if (validCourse(raw.course)) state.course = raw.course;
      for (const [course, session] of Object.entries(raw.sessions || {})) {
        if (!validCourse(course) || !Array.isArray(session?.ids) || !session.ids.length) continue;
        const ids = session.ids.map(String);
        if (new Set(ids).size !== ids.length || ids.some(id => !byId.has(id) || !matches(byId.get(id), course))) continue;
        if (!Number.isInteger(session.index) || session.index < 0 || session.index > ids.length) continue;
        const answers = {};
        let valid = true;
        for (let i = 0; i < ids.length; i++) {
          const value = session.answers?.[ids[i]];
          if (i < session.index && !validAnswer(ids[i], value)) valid = false;
          if (i > session.index && value !== undefined) valid = false;
          if (value !== undefined) {
            if (!validAnswer(ids[i], value)) valid = false;
            else answers[ids[i]] = value;
          }
        }
        if (valid) state.sessions[course] = {ids, index: session.index, answers, mode: session.mode === 'missed' ? 'missed' : 'all'};
      }
      for (const [id, record] of Object.entries(raw.records || {})) {
        if (!byId.has(id) || !validAnswer(id, record?.lastAnswer)) continue;
        if (!Number.isSafeInteger(record.attempts) || record.attempts < 1 || !Number.isSafeInteger(record.correctCount) || record.correctCount < 0 || record.correctCount > record.attempts) continue;
        state.records[id] = {lastAnswer: record.lastAnswer, attempts: record.attempts, correctCount: record.correctCount, updatedAt: Number.isFinite(record.updatedAt) ? record.updatedAt : 0};
      }
      state.history = Array.isArray(raw.history) ? raw.history.filter(row => validCourse(row?.course) && Number.isInteger(row.total) && row.total > 0 && Number.isInteger(row.correct) && row.correct >= 0 && row.correct <= row.total && Number.isFinite(row.at)).slice(-20) : [];
    }
  } catch { /* Invalid JSON and blocked storage start a usable in-memory session. */ }

  function save() {
    try { storage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(state)); available = true; }
    catch { available = false; }
  }
  function missedIds(course) {
    return questions.filter(q => matches(q, course) && state.records[String(q.id)] && state.records[String(q.id)].lastAnswer !== q.answer).map(q => String(q.id));
  }
  function start(course, mode = 'all') {
    if (!validCourse(course)) course = 'all';
    const ids = mode === 'missed' ? missedIds(course) : questions.filter(q => matches(q, course)).map(q => String(q.id));
    if (!ids.length) return false;
    state.course = course;
    state.sessions[course] = {ids, index: 0, answers: {}, mode};
    save();
    return true;
  }
  function session(course = state.course) {
    if (!validCourse(course)) course = 'all';
    state.course = course;
    if (!state.sessions[course]) start(course);
    const current = state.sessions[course];
    const queue = current.ids.map(id => byId.get(id));
    const answered = Object.keys(current.answers).length;
    const correct = queue.filter(q => current.answers[String(q.id)] === q.answer).length;
    const missed = queue.filter(q => current.answers[String(q.id)] !== undefined && current.answers[String(q.id)] !== q.answer);
    save();
    return {...current, answers: {...current.answers}, queue, answered, correct, missed};
  }
  function answer(course, value) {
    const current = state.sessions[course];
    if (!current || current.index >= current.ids.length) return false;
    const id = current.ids[current.index];
    if (current.answers[id] !== undefined || !validAnswer(id, value)) return false;
    current.answers[id] = value;
    const previous = state.records[id];
    state.records[id] = {lastAnswer: value, attempts: (previous?.attempts || 0) + 1, correctCount: (previous?.correctCount || 0) + Number(value === byId.get(id).answer), updatedAt: now()};
    save();
    return true;
  }
  function next(course) {
    const current = state.sessions[course];
    if (!current || current.index >= current.ids.length || current.answers[current.ids[current.index]] === undefined) return false;
    current.index++;
    if (current.index === current.ids.length) {
      const correct = current.ids.filter(id => current.answers[id] === byId.get(id).answer).length;
      state.history.push({course, total: current.ids.length, correct, at: now()});
      state.history = state.history.slice(-20);
    }
    save();
    return true;
  }
  function stats(course = state.course) {
    const records = Object.entries(state.records).filter(([id]) => matches(byId.get(id), course)).map(([, record]) => record);
    return {attempted: records.reduce((n, r) => n + r.attempts, 0), correct: records.reduce((n, r) => n + r.correctCount, 0), missed: missedIds(course).length, last: state.history.filter(row => row.course === course).at(-1) || null};
  }
  function retryRound(course) {
    const current = state.sessions[course];
    const ids = current?.ids.filter(id => validAnswer(id, current.answers[id]) && current.answers[id] !== byId.get(id).answer) || [];
    if (!ids.length) return false;
    state.course = course;
    state.sessions[course] = {ids, index: 0, answers: {}, mode: 'missed'};
    save();
    return true;
  }
  function clear() {
    state = {version: 2, bank, course: state.course, sessions: {}, records: {}, history: []};
    try { storage.removeItem(QUIZ_STORAGE_KEY); } catch { available = false; }
  }
  return {get course() { return state.course; }, get available() { return available; }, session, start, answer, next, stats, retryRound, clear};
}
