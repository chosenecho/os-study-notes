// Reading a chapter should not download the exercise models or question bank.
const roots = document.querySelectorAll('[data-study-lab]');
if (roots.length) {
  const load = (retry = false) => import(retry ? `./labs.mjs?retry=${Date.now()}` : './labs.mjs');
  load().catch(() => {
    roots.forEach(root => {
      root.classList.add('study-lab');
      root.innerHTML = '<p role="alert">练习未能载入；正文中的模型说明和手算示例仍可阅读。</p><button class="md-button" type="button" data-lab-retry>重新加载练习</button>';
      root.querySelector('[data-lab-retry]').addEventListener('click', async event => {
        const button = event.currentTarget;
        button.disabled = true;
        button.textContent = '正在重试…';
        try {
          await load(true);
        } catch {
          button.disabled = false;
          button.textContent = '重新加载练习';
          root.querySelector('[role="alert"]').textContent = '练习仍未能载入，请检查网络后再试。';
        }
      });
    });
  });
}

if (document.querySelector('[data-scheduler]')) {
  const output = document.querySelector('.lab-results');
  const load = (retry = false) => import(retry ? './scheduler.mjs?retry=' + Date.now() : './scheduler.mjs');
  function failed() {
    output.replaceChildren();
    const message = document.createElement('p');
    message.setAttribute('role', 'alert');
    message.textContent = '调度实验未能载入，请检查网络后重试。';
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'md-button'; button.textContent = '重新加载调度实验';
    button.addEventListener('click', async () => {
      button.disabled = true;
      try { await load(true); } catch { failed(); }
    });
    output.append(message, button);
  }
  load().catch(failed);
}
