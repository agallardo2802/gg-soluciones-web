/* gate.js — Puerta de acceso por código para documentos confidenciales.
   ⚠️ Disuasivo, NO seguridad real: el contenido viaja al navegador.
   Para seguridad real usar Cloudflare Access u otra protección de servidor.

   Cada página define antes de cargar este script:
   window.GGS_GATE = { key: 'ggs_gate_xxx', hash: '<sha256 del código>', title: '...' };
*/
(function () {
  var cfg = window.GGS_GATE;
  if (!cfg || !cfg.hash) return;

  // Tema (compartido) para que el overlay respete claro/oscuro
  document.documentElement.setAttribute('data-theme', localStorage.getItem('theme') || 'dark');

  // Si ya validó en esta sesión, no molestar
  if (sessionStorage.getItem(cfg.key) === '1') return;

  // Ocultar el contenido hasta validar
  var style = document.createElement('style');
  style.textContent = 'body > *:not(#gateOverlay){filter:blur(8px);pointer-events:none;user-select:none;}' +
    '#gateOverlay{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:24px;' +
    'background:radial-gradient(900px 500px at 20% 10%,rgba(47,128,237,.28),transparent 60%),linear-gradient(135deg,#0a1628,#0f2748 55%,#1a4fa0);}' +
    '#gateOverlay .gbox{width:100%;max-width:400px;background:rgba(255,255,255,.08);backdrop-filter:blur(20px);' +
    'border:1px solid rgba(255,255,255,.18);border-radius:20px;padding:40px 34px;box-shadow:0 30px 80px rgba(0,0,0,.45);text-align:center;font-family:Inter,system-ui,sans-serif;}' +
    '#gateOverlay img{height:60px;margin-bottom:14px;}' +
    '#gateOverlay h3{color:#fff;font-size:1.1rem;margin:0 0 4px;font-family:"Space Grotesk",Inter,sans-serif;}' +
    '#gateOverlay p{color:rgba(255,255,255,.6);font-size:.82rem;margin:0 0 22px;}' +
    '#gateOverlay input{width:100%;padding:13px 14px;border:1px solid rgba(255,255,255,.18);border-radius:12px;background:rgba(255,255,255,.07);' +
    'color:#fff;font-size:.95rem;box-sizing:border-box;text-align:center;letter-spacing:.05em;margin-bottom:12px;}' +
    '#gateOverlay input:focus{outline:none;border-color:#60a5fa;box-shadow:0 0 0 4px rgba(96,165,250,.18);}' +
    '#gateOverlay button{width:100%;padding:13px;border:none;border-radius:12px;background:linear-gradient(120deg,#2f80ed,#1a4fa0);' +
    'color:#fff;font-weight:700;font-size:1rem;cursor:pointer;font-family:Inter,sans-serif;}' +
    '#gateOverlay .gerr{color:#ff9a9a;font-size:.82rem;min-height:18px;margin-top:10px;}';
  document.head.appendChild(style);

  var ov = document.createElement('div');
  ov.id = 'gateOverlay';
  ov.innerHTML = '<div class="gbox">' +
    '<img src="logo.png" alt="GG Soluciones" />' +
    '<h3>Documento confidencial</h3>' +
    '<p>' + (cfg.title || 'Ingresá el código de acceso para ver esta propuesta.') + '</p>' +
    '<input type="password" id="gateInput" placeholder="Código de acceso" autocomplete="off" />' +
    '<button id="gateBtn" type="button">Acceder</button>' +
    '<div class="gerr" id="gateErr"></div>' +
    '</div>';

  function mount() {
    document.body.appendChild(ov);
    document.getElementById('gateInput').focus();
  }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);

  async function sha256(s) {
    var b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
    return Array.from(new Uint8Array(b)).map(function (x) { return x.toString(16).padStart(2, '0'); }).join('');
  }

  async function check() {
    var v = (document.getElementById('gateInput').value || '').trim();
    if (!v) return;
    try {
      var h = await sha256(v);
      if (h === cfg.hash) {
        sessionStorage.setItem(cfg.key, '1');
        ov.remove(); style.remove();
      } else {
        document.getElementById('gateErr').textContent = 'Código incorrecto.';
        document.getElementById('gateInput').value = '';
        document.getElementById('gateInput').focus();
      }
    } catch (e) {
      document.getElementById('gateErr').textContent = 'Error al validar. Reintentá.';
    }
  }

  document.addEventListener('click', function (e) { if (e.target && e.target.id === 'gateBtn') check(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target && e.target.id === 'gateInput') check(); });
})();
