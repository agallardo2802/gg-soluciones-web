/* ──────────────────────────────────────────────────────────
   i18n.js — Switch de idioma ES/EN para GG Soluciones
   Recorre los nodos de texto y atributos traducibles y los
   reemplaza usando el diccionario de translations.js.
   Persiste la elección en localStorage. Default: ES.
   ────────────────────────────────────────────────────────── */
(function () {
  const T = window.GGS_TRANSLATIONS || {};
  const STORAGE = 'ggs_lang';
  let lang = localStorage.getItem(STORAGE) || 'es';

  const ATTRS = ['placeholder', 'alt', 'title', 'aria-label'];

  function norm(s) { return s.replace(/\s+/g, ' ').trim(); }

  function applyTextNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    const nodes = [];
    while (walker.nextNode()) {
      const n = walker.currentNode;
      // saltar texto dentro de script/style
      const p = n.parentNode;
      if (!p) continue;
      const tag = p.nodeName;
      if (tag === 'SCRIPT' || tag === 'STYLE') continue;
      nodes.push(n);
    }
    nodes.forEach(n => {
      // Restaurar español: independiente del diccionario (el texto ya está en inglés)
      if (lang === 'es') {
        if (n._ggsEs !== undefined) n.nodeValue = n._ggsEs;
        return;
      }
      // Traducir a inglés
      const key = norm(n.nodeValue);
      if (!key) return;
      const en = T[key];
      if (en === undefined) return;
      if (n._ggsEs === undefined) n._ggsEs = n.nodeValue;
      const lead = n.nodeValue.match(/^\s*/)[0];
      const trail = n.nodeValue.match(/\s*$/)[0];
      n.nodeValue = lead + en + trail;
    });
  }

  function applyAttrs(root) {
    ATTRS.forEach(attr => {
      root.querySelectorAll('[' + attr + ']').forEach(el => {
        const store = '_ggsEs_' + attr;
        if (lang === 'es') {
          if (el[store] !== undefined) el.setAttribute(attr, el[store]);
          return;
        }
        const key = norm(el.getAttribute(attr));
        const en = T[key];
        if (en === undefined) return;
        if (el[store] === undefined) el[store] = el.getAttribute(attr);
        el.setAttribute(attr, en);
      });
    });
  }

  function apply() {
    applyTextNodes(document.body);
    applyAttrs(document.body);
    document.documentElement.setAttribute('lang', lang);
    document.querySelectorAll('.lang-toggle .lang-opt').forEach(el => {
      el.classList.toggle('active', el.dataset.lang === lang);
    });
  }

  function setLang(l) {
    lang = l;
    localStorage.setItem(STORAGE, l);
    apply();
  }
  window.GGS_setLang = setLang;

  function buildToggle() {
    // Insertar el switch en cada nav (desktop) junto al theme-toggle
    document.querySelectorAll('nav.nav').forEach(nav => {
      if (nav.querySelector('.lang-toggle')) return;
      const wrap = document.createElement('div');
      wrap.className = 'lang-toggle';
      wrap.innerHTML =
        '<button class="lang-opt" data-lang="es" type="button" aria-label="Español">ES</button>' +
        '<span class="lang-sep">|</span>' +
        '<button class="lang-opt" data-lang="en" type="button" aria-label="English">EN</button>';
      const themeBtn = nav.querySelector('.theme-toggle');
      if (themeBtn) nav.insertBefore(wrap, themeBtn);
      else nav.insertBefore(wrap, nav.firstChild);
    });
    document.addEventListener('click', e => {
      const opt = e.target.closest('.lang-opt');
      if (opt) setLang(opt.dataset.lang);
    });
  }

  function init() {
    buildToggle();
    apply();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
