// Reading history is independent of completion checkboxes and font preferences.
export const READING_KEY = 'studynote:reading:v1';
export function createReadingStore(courses, storage, now = Date.now) {
  const valid = (course, row) => Number.isInteger(row?.chapter) && row.chapter >= 1 &&
    row.chapter <= course.chapters && Number.isFinite(row.at) && row.at >= 0 && row.at <= now() + 300000;
  function read() {
    try {
      const raw = JSON.parse(storage.getItem(READING_KEY) || '{}');
      return Object.fromEntries(courses.filter(c => valid(c, raw?.[c.id])).map(c => [c.id, raw[c.id]]));
    } catch { return {}; }
  }
  return {
    get: course => read()[course] || null,
    visit(id) {
      const course = courses.find(c => id.startsWith(c.id + '-'));
      const chapter = Number(id.slice((course?.id.length || 0) + 1));
      const row = {chapter, at: now()};
      if (!course || !valid(course, row)) return false;
      try { storage.setItem(READING_KEY, JSON.stringify({...read(), [course.id]: row})); return true; }
      catch { return false; }
    }
  };
}
