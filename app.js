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

  // ── INTAKE FORM → WhatsApp ──
  function bindIntake() {
    var form = document.getElementById('intakeForm');
    if (!form) return;
    var PHONE = '5493885120704';
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = form.elements;
      function v(n) { return (f[n] && f[n].value || '').trim(); }
      var nombre = v('nombre');
      if (!nombre || !v('descripcion')) {
        var err = document.getElementById('intakeError');
        if (err) err.textContent = 'Completá al menos tu nombre y la descripción.';
        return;
      }
      var L = [
        '*Nueva consulta — GG Soluciones*',
        '',
        '*Tipo de proyecto:* ' + (v('tipo') || '—'),
        '*Idea / proyecto:* ' + (v('proyecto') || '—'),
        '',
        '*Qué necesita resolver:*',
        v('descripcion'),
        '',
        '*Objetivo esperado:* ' + (v('objetivo') || '—'),
        '*A quién impacta:* ' + (v('usuarios') || '—'),
        '*Sistemas/herramientas actuales:* ' + (v('sistemas') || '—'),
        '*Plazo deseado:* ' + (v('plazo') || '—'),
        '*Presupuesto estimado:* ' + (v('presupuesto') || '—'),
        '',
        '*Contacto*',
        'Nombre: ' + nombre,
        'Organización: ' + (v('organizacion') || '—'),
        'Email: ' + (v('email') || '—'),
        'Teléfono: ' + (v('telefono') || '—')
      ];
      var mensaje = L.join('\n');

      // 0) Registrar el lead en dataLayer (GTM → conversión)
      try { (window.GGS_track || function(){})({ event: 'generate_lead', form: 'intake', tipo_proyecto: v('tipo') || 'no_indicado' }); } catch (e) {}

      // 1) Enviar copia por email (Formsubmit AJAX, en segundo plano)
      try {
        fetch('https://formsubmit.co/ajax/agallardo2802@gmail.com', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            _subject: 'Nueva consulta web — ' + nombre,
            _template: 'table',
            _captcha: 'false',
            Tipo: v('tipo'), Proyecto: v('proyecto'), Necesidad: v('descripcion'),
            Objetivo: v('objetivo'), Impacta: v('usuarios'), Sistemas: v('sistemas'),
            Plazo: v('plazo'), Presupuesto: v('presupuesto'),
            Nombre: nombre, Organizacion: v('organizacion'), Email: v('email'), Telefono: v('telefono')
          })
        }).catch(function(){ /* si falla el email, igual se envía por WhatsApp */ });
      } catch (e) {}

      // 2) Abrir WhatsApp con el mensaje redactado (gesto del usuario)
      var url = 'https://wa.me/' + PHONE + '?text=' + encodeURIComponent(mensaje);
      window.open(url, '_blank', 'noopener');

      var ok = document.getElementById('intakeError');
      if (ok) { ok.style.color = 'var(--accent)'; ok.textContent = '¡Gracias! Te abrimos WhatsApp y nos llega una copia por email.'; }
    });
  }

  // ── TRACKING (dataLayer para GTM) ──
  function track(obj) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(obj);
  }
  function bindTracking() {
    // Click en cualquier botón/enlace de WhatsApp
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href*="wa.me"]');
      if (a) {
        track({ event: 'whatsapp_click', link_text: (a.textContent || '').trim().slice(0, 60), page: location.pathname });
      }
      var lang = e.target.closest('.lang-opt');
      if (lang) track({ event: 'lang_change', lang: lang.dataset.lang });
      var th = e.target.closest('#themeBtn');
      if (th) track({ event: 'theme_toggle' });
    });
  }
  // exponer para que bindIntake registre el lead
  window.GGS_track = track;

  // ── MODAL ──
  function bindModal() {
    function open(id) { var m = document.getElementById(id); if (m) { m.classList.add('open'); document.body.style.overflow = 'hidden'; } }
    function closeAll() { document.querySelectorAll('.modal-overlay.open').forEach(function (m) { m.classList.remove('open'); }); document.body.style.overflow = ''; }
    document.addEventListener('click', function (e) {
      var t = e.target.closest('[data-modal-open]');
      if (t) { e.preventDefault(); open(t.getAttribute('data-modal-open')); return; }
      if (e.target.closest('[data-modal-close]')) { closeAll(); return; }
      if (e.target.classList && e.target.classList.contains('modal-overlay')) { closeAll(); }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); });
  }

  function init() { bindTheme(); bindReveal(); bindGallery(); bindMobileNav(); bindIntake(); bindTracking(); bindModal(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
