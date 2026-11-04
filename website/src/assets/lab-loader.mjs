// Reading a chapter should not download the exercise models or question bank.
const roots = document.querySelectorAll('[data-study-lab]');
if (roots.length) {
  import('./labs.mjs').catch(() => {
    roots.forEach(root => { root.textContent = '练习未能载入，请刷新页面后再试。正文中的模型说明和手算示例仍可阅读。'; });
  });
}
