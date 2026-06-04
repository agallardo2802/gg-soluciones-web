/* app.js — comportamiento compartido: tema, reveal, galería, nav mobile.
   El idioma lo maneja i18n.js (cargado aparte). */
(function () {
  // ── TEMA (default dark, compartido por localStorage) ──
  var saved = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);

  function bindTheme() {
    var btn = document.getElementById('themeBtn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      var next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
    });
  }

  // ── REVEAL on scroll ──
  function bindReveal() {
    var els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.15 });
    els.forEach(function (el, i) { el.style.transitionDelay = (i % 3) * 0.08 + 's'; io.observe(el); });
  }

  // ── DRAG gallery ──
  function bindGallery() {
    document.querySelectorAll('.gallery').forEach(function (g) {
      var down = false, startX, scrollLeft;
      g.addEventListener('mousedown', function (e) { down = true; g.classList.add('dragging'); startX = e.pageX - g.offsetLeft; scrollLeft = g.scrollLeft; });
      g.addEventListener('mouseleave', function () { down = false; g.classList.remove('dragging'); });
      g.addEventListener('mouseup', function () { down = false; g.classList.remove('dragging'); });
      g.addEventListener('mousemove', function (e) { if (!down) return; e.preventDefault(); var x = e.pageX - g.offsetLeft; g.scrollLeft = scrollLeft - (x - startX) * 1.5; });
    });
  }

  // ── MOBILE NAV ──
  function bindMobileNav() {
    var t = document.getElementById('navToggle');
    var m = document.getElementById('navMobile');
    if (!t || !m) return;
    t.addEventListener('click', function () { m.classList.toggle('open'); });
    m.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { m.classList.remove('open'); }); });
  }

  function init() { bindTheme(); bindReveal(); bindGallery(); bindMobileNav(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
