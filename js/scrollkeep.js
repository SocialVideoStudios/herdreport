/* Back/forward returns to the exact spot you left.
   The scroll position is saved with each history entry and put back once the page has
   rendered enough content to reach it (episodes, reviews and blog posts load after the page). */
(function () {
  if (!('scrollRestoration' in history)) return;
  history.scrollRestoration = 'manual';
  var KEY = '__hrY';

  // Keep our saved position when page code calls replaceState.
  var rep = history.replaceState.bind(history);
  history.replaceState = function (st, t, u) {
    var s = st && typeof st === 'object' ? Object.assign({}, st) : {};
    if (s[KEY] == null) s[KEY] = window.scrollY;
    return rep(s, t, u);
  };
  var save = function () {
    var s = Object.assign({}, history.state || {});
    s[KEY] = window.scrollY;
    try { rep(s, ''); } catch (e) {}
  };
  var tmr = 0;
  addEventListener('scroll', function () { clearTimeout(tmr); tmr = setTimeout(save, 120); }, { passive: true });
  addEventListener('pagehide', save);
  // Save the spot right before following a link or opening a new hash view.
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('a[href]')) save(); }, true);

  var stopAt = 0, target = null;
  var jump = function (y) {
    var el = document.documentElement, old = el.style.scrollBehavior;
    el.style.scrollBehavior = 'auto'; window.scrollTo(0, y); el.style.scrollBehavior = old;
  };
  var cancel = function () { target = null; };
  ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(function (ev) { addEventListener(ev, cancel, { passive: true }); });
  function loop() {
    if (target == null) return;
    var max = document.documentElement.scrollHeight - innerHeight;
    if (Math.abs(window.scrollY - target) > 1 && max >= target - 1) jump(target);
    else if (max < target - 1) jump(max);
    if (performance.now() < stopAt) requestAnimationFrame(loop); else target = null;
  }
  function restore() {
    var y = history.state && history.state[KEY];
    if (typeof y !== 'number' || y <= 0) return false;
    target = y; stopAt = performance.now() + 2500; requestAnimationFrame(loop);
    return true;
  }
  window.HRScroll = { restoring: function () { return target != null; } };

  var nav = (performance.getEntriesByType && performance.getEntriesByType('navigation')[0]) || {};
  if (nav.type === 'back_forward' || nav.type === 'reload') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', restore); else restore();
  }
  addEventListener('popstate', function () { setTimeout(restore, 0); });
  addEventListener('pageshow', function (e) { if (e.persisted) restore(); });
})();
