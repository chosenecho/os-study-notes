/** The build injects config/courses.json on every page. */
export function getCourses(root = document) {
  const element = root.getElementById('study-courses');
  if (!element) throw new Error('Missing study course registry');
  return JSON.parse(element.textContent);
}
