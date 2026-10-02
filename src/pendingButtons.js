// Global "button keeps spinning while its action runs".
//
// Every network request is counted. When a button is clicked and that click starts a request
// (save, generate, export, checkout, delete...), the button shows a spinner and stays locked until
// every request it started has finished. Buttons that only navigate or toggle UI never start a
// request, so they never spin.
const SKIP = '[role="tab"],[role="radio"],.nav-item,.chip,.menu-btn,.side-collapse,.side-close,.os-tabs button,.seg button,.side-meter,[data-no-spin]';
const MAX_MS = 60000;   // never spin forever
const SETTLE_MS = 180;  // bridge sequential requests (save -> refresh)

let started = 0;
let inflight = 0;
const idleWaiters = new Set();

export function installPendingButtons() {
  if (typeof window === 'undefined' || window.__fnPendingInstalled) return;
  window.__fnPendingInstalled = true;

  const nativeFetch = window.fetch.bind(window);
  window.fetch = (...args) => {
    started += 1; inflight += 1;
    const done = () => {
      inflight -= 1;
      if (inflight <= 0) { inflight = 0; idleWaiters.forEach((fn) => fn()); }
    };
    let p;
    try { p = nativeFetch(...args); } catch (e) { done(); throw e; }
    p.then(done, done);
    return p;
  };

  document.addEventListener('click', (ev) => {
    const btn = ev.target instanceof Element ? ev.target.closest('button') : null;
    if (!btn || btn.disabled || btn.matches(SKIP) || btn.classList.contains('is-pending')) return;
    const before = started;

    // Let the click handler run first, then see whether it started any request.
    setTimeout(() => {
      if (started === before || !btn.isConnected) return;
      btn.classList.add('is-pending');
      btn.setAttribute('aria-busy', 'true');
      let settleTimer = 0;
      let finished = false;

      const finish = () => {
        if (finished) return;
        finished = true;
        idleWaiters.delete(check);
        clearTimeout(settleTimer); clearTimeout(killTimer);
        btn.classList.remove('is-pending');
        btn.removeAttribute('aria-busy');
      };
      const check = () => {
        clearTimeout(settleTimer);
        if (inflight === 0) settleTimer = setTimeout(() => { if (inflight === 0) finish(); }, SETTLE_MS);
      };
      const killTimer = setTimeout(finish, MAX_MS);
      idleWaiters.add(check);
      check();
    }, 0);
  }, true);
}
