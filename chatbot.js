/* ──────────────────────────────────────────────────────────
   chatbot.js — Suni, el asistente de GG Soluciones.

   Robot con chullo andino que responde sobre el sitio, la
   historia de la consultora y los proyectos realizados.

   Arquitectura: recuperación local, sin backend.
   El dominio es cerrado (el contenido del propio sitio), así
   que una base curada + scoring por relevancia responde mejor
   que un LLM, sin API key expuesta en el cliente, sin costo
   por token y sin riesgo de inventar datos de la trayectoria.

   El motor está detrás de resolve(): si algún día se enchufa
   un modelo remoto, es la única pieza que cambia.
   ────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var BOT_NAME = 'Suni';
  var WHATSAPP = '5493885120704';
  var STORAGE_LANG = 'ggs_lang';
  var STORAGE_SEEN = 'ggs_bot_seen';

  // localStorage lanza excepción en modo privado y en orígenes
  // opacos. Nunca debe tumbar el asistente.
  function readStore(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function writeStore(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* preferencia no persistida */ }
  }

  function lang() { return readStore(STORAGE_LANG) === 'en' ? 'en' : 'es'; }

  var WA = 'https://wa.me/' + WHATSAPP;
  var waLink = {
    es: '<a href="' + WA + '" target="_blank" rel="noopener">escribinos por WhatsApp</a>',
    en: '<a href="' + WA + '" target="_blank" rel="noopener">message us on WhatsApp</a>'
  };

  /* ─────────────────────────────────────────────
     Mascota — robot con chullo
     ───────────────────────────────────────────── */

  var svgSeq = 0;

  // Colores literales, no variables CSS: el SVG se clona en el
  // lanzador y en la cabecera, y un custom property que no resuelva
  // deja todo el chullo en negro. La paleta andina es fija de todos
  // modos — no depende del tema claro/oscuro.
  var C = {
    terracota: '#c1440e',
    ocre:      '#e8a33d',
    arena:     '#f4ead8',
    verde:     '#6f8f6a',
    morado:    '#8c4a6b',
    visor:     '#12233f',
    ojo:       '#7fd7ff'
  };

  function mascot() {
    var uid = 'ggsbot-g' + (++svgSeq);
    return '' +
    '<svg class="ggsbot-mascot" viewBox="0 0 100 92" role="img" aria-hidden="true" focusable="false">' +
      '<defs>' +
        '<linearGradient id="' + uid + '-metal" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#7fb0ee"/><stop offset="1" stop-color="#2f5fa8"/>' +
        '</linearGradient>' +
        '<clipPath id="' + uid + '-cap">' +
          '<path d="M20 51 C20 10 80 10 80 51 Z"/>' +
        '</clipPath>' +
      '</defs>' +

      '<g class="ggsbot-body">' +

        // ── Cabeza ──
        '<rect x="24" y="36" width="52" height="50" rx="15" fill="url(#' + uid + '-metal)"/>' +
        '<rect x="30" y="46" width="40" height="28" rx="12" fill="' + C.visor + '"/>' +
        '<circle class="ggsbot-eye" cx="42" cy="59" r="5.2" fill="' + C.ojo + '"/>' +
        '<circle class="ggsbot-eye" cx="58" cy="59" r="5.2" fill="' + C.ojo + '"/>' +
        '<path d="M45 67 q5 4 10 0" stroke="' + C.ojo + '" stroke-width="2" ' +
              'stroke-linecap="round" fill="none" opacity=".75"/>' +

        // ── Orejeras, por delante de la cabeza ──
        '<g>' +
          '<path d="M18 49 h12 v19 a6 6 0 0 1 -12 0 Z" fill="' + C.terracota + '"/>' +
          '<path d="M70 49 h12 v19 a6 6 0 0 1 -12 0 Z" fill="' + C.terracota + '"/>' +
          '<rect x="18" y="56" width="12" height="3.5" fill="' + C.arena + '"/>' +
          '<rect x="70" y="56" width="12" height="3.5" fill="' + C.arena + '"/>' +
          '<rect x="18" y="61" width="12" height="2.5" fill="' + C.ocre + '"/>' +
          '<rect x="70" y="61" width="12" height="2.5" fill="' + C.ocre + '"/>' +
          '<path d="M24 74 v9 M21 73 l-2.5 8 M27 73 l2.5 8" stroke="' + C.ocre + '" ' +
                'stroke-width="2.2" stroke-linecap="round" fill="none"/>' +
          '<path d="M76 74 v9 M73 73 l-2.5 8 M79 73 l2.5 8" stroke="' + C.ocre + '" ' +
                'stroke-width="2.2" stroke-linecap="round" fill="none"/>' +
        '</g>' +

        // ── Chullo: bandas andinas recortadas por la cúpula ──
        '<g clip-path="url(#' + uid + '-cap)">' +
          '<rect x="14" y="18" width="72" height="10" fill="' + C.morado + '"/>' +
          '<rect x="14" y="28" width="72" height="6"  fill="' + C.ocre + '"/>' +
          '<rect x="14" y="34" width="72" height="7"  fill="' + C.arena + '"/>' +
          '<path d="M14 40 l6 -5 l6 5 l6 -5 l6 5 l6 -5 l6 5 l6 -5 l6 5 l6 -5 l6 5 l6 -5 l6 5" ' +
                'stroke="' + C.terracota + '" stroke-width="2.4" fill="none"/>' +
          '<rect x="14" y="41" width="72" height="10" fill="' + C.verde + '"/>' +
        '</g>' +
        // Ribete que apoya sobre la cabeza
        '<rect x="19" y="47" width="62" height="6" rx="3" fill="' + C.terracota + '"/>' +

        // ── Pompón ──
        '<g class="ggsbot-pompom">' +
          '<circle cx="50" cy="14" r="7" fill="' + C.ocre + '"/>' +
          '<circle cx="47.5" cy="11.5" r="2.5" fill="' + C.arena + '" opacity=".6"/>' +
        '</g>' +
      '</g>' +
    '</svg>';
  }

  /* ─────────────────────────────────────────────
     Base de conocimiento
     Todo lo de acá sale del contenido publicado en
     el sitio. Si un dato no está en la web, el bot
     no lo afirma: deriva al contacto.
     ───────────────────────────────────────────── */

  var KB = [
    {
      id: 'saludo',
      k: 'hola buenas buenos dias tardes noches hey saludos ke onda hello hi hey there good morning',
      p: ['hola', 'buenas', 'hello', 'buen dia', 'buenas tardes', 'buenos dias'],
      a: {
        es: '¡Hola! Soy <strong>' + BOT_NAME + '</strong>, el asistente de GG Soluciones. Te puedo contar sobre los servicios, los proyectos que hicimos y cómo trabajamos. ¿Por dónde arrancamos?',
        en: 'Hi! I\'m <strong>' + BOT_NAME + '</strong>, the GG Soluciones assistant. I can tell you about our services, the projects we delivered and how we work. Where should we start?'
      },
      chips: ['servicios', 'proyectos', 'empresa']
    },
    {
      id: 'bot',
      k: 'quien sos vos bot robot asistente chatbot llamas nombre gorro chullo sombrero jujuy who are you your name hat bot assistant',
      p: ['quien sos', 'quien eres', 'como te llamas', 'que sos', 'who are you', 'your name'],
      a: {
        es: 'Soy <strong>' + BOT_NAME + '</strong>, un asistente del sitio de GG Soluciones. Uso chullo porque somos de Jujuy y eso no se negocia. 🧣<br><br>No soy un modelo de IA: respondo con información curada del propio sitio, así que si algo no lo tengo, te lo digo en vez de inventarlo.',
        en: 'I\'m <strong>' + BOT_NAME + '</strong>, the assistant on the GG Soluciones site. I wear an Andean <em>chullo</em> because we\'re from Jujuy and that\'s non-negotiable. 🧣<br><br>I\'m not an AI model: I answer from curated site content, so if I don\'t have something I\'ll say so rather than make it up.'
      },
      chips: ['empresa', 'servicios', 'contacto']
    },
    {
      id: 'empresa',
      k: 'gg soluciones empresa consultora quienes somos sobre nosotros que es hacen dedican compania company about who we are what is',
      p: ['que es gg soluciones', 'quienes son', 'sobre la empresa', 'about you', 'what is gg'],
      a: {
        es: '<strong>GG Soluciones</strong> es una consultora de tecnología de Jujuy con más de 10 años de trabajo en el sector público y privado.<br><br>No solo desarrollamos software: resolvemos problemas estructurales. Miramos el ecosistema completo — costos, RRHH, procesos, tecnología y organización — antes de proponer nada.',
        en: '<strong>GG Soluciones</strong> is a technology consultancy from Jujuy, Argentina, with over 10 years of work across the public and private sectors.<br><br>We don\'t just build software: we solve structural problems. We look at the whole ecosystem — cost, staffing, processes, technology and organisation — before proposing anything.'
      },
      chips: ['servicios', 'metricas', 'clientes']
    },
    {
      id: 'alejandro',
      k: 'alejandro gallardo fundador founder director tecnologia cto arquitecto quien lidera lidera equipo persona detras cv curriculum experiencia',
      p: ['quien es alejandro', 'quien lo dirige', 'quien esta detras', 'who is alejandro', 'the founder'],
      a: {
        es: '<strong>Alejandro Gallardo</strong> es fundador y líder técnico de GG Soluciones, con más de 12 años en tecnología. Viene del código (.NET/C#) y evolucionó hacia arquitectura de sistemas y dirección técnica.<br><br>Podés ver su <a href="alejandro-gallardo-cv.html">CV completo acá</a>.',
        en: '<strong>Alejandro Gallardo</strong> is the founder and technical lead of GG Soluciones, with 12+ years in technology. He started in code (.NET/C#) and grew into systems architecture and technical leadership.<br><br>You can see his <a href="alejandro-gallardo-cv.html">full CV here</a>.'
      },
      chips: ['proyectos', 'stack', 'contacto']
    },
    {
      id: 'historia',
      k: 'historia trayectoria cuando empezaron fundada antiguedad hace cuanto tiempo years anos experiencia desde recorrido history founded since how long',
      p: ['desde cuando', 'hace cuanto', 'cuando empezaron', 'how long have you', 'since when'],
      a: {
        es: 'Más de <strong>10 años</strong> trabajando en proyectos IT complejos, con foco en organismos públicos y empresas de Jujuy.<br><br>El recorrido pasó por Registro Civil, Ministerio de Salud, Ministerio de Hacienda, Dirección Provincial de Inmuebles y el sector privado.',
        en: 'Over <strong>10 years</strong> delivering complex IT projects, focused on public agencies and companies in Jujuy.<br><br>The track record spans the Civil Registry, the Ministry of Health, the Ministry of Finance, the Provincial Property Office and the private sector.'
      },
      chips: ['clientes', 'proyectos', 'metricas']
    },
    {
      id: 'metricas',
      k: 'numeros metricas resultados cifras cuantos proyectos ahorro impacto ciudadanos millones logros numbers metrics results savings impact achievements',
      p: ['que numeros', 'cuantos proyectos', 'que resultados', 'your numbers', 'how many projects'],
      a: {
        es: 'Los números publicados del recorrido:<ul>' +
            '<li><strong>+10 años</strong> en proyectos IT complejos</li>' +
            '<li><strong>+$20M</strong> en ahorro y nuevos ingresos para organismos</li>' +
            '<li><strong>+16 proyectos</strong> entregados</li>' +
            '<li><strong>+600K ciudadanos</strong> con acceso a trámites digitalizados</li></ul>',
        en: 'The published track record:<ul>' +
            '<li><strong>10+ years</strong> on complex IT projects</li>' +
            '<li><strong>+$20M</strong> in savings and new revenue for public agencies</li>' +
            '<li><strong>16+ projects</strong> delivered</li>' +
            '<li><strong>600K+ citizens</strong> with access to digitalised procedures</li></ul>'
      },
      chips: ['proyectos', 'clientes', 'contacto']
    },
    {
      id: 'servicios',
      k: 'servicio ofrecen hacen soluciones areas rubros que puedo contratar catalogo oferta service offer provide what do you do',
      p: ['que servicios', 'que ofrecen', 'que hacen', 'what services', 'what do you offer'],
      a: {
        es: 'Seis frentes, desde un proyecto puntual hasta la dirección tecnológica completa:<ul>' +
            '<li><strong>Agentes IA</strong> — un rol dentro de tu equipo, no un chatbot</li>' +
            '<li><strong>Consultoría IT</strong> — diagnóstico, roadmap, arquitectura y gobierno</li>' +
            '<li><strong>Transformación</strong> — modernización, automatización e integración</li>' +
            '<li><strong>Capacitación IA</strong> — formación de equipos internos</li>' +
            '<li><strong>Datos & BI</strong> — Power BI, KPIs y gobernanza de datos</li>' +
            '<li><strong>Desarrollo a medida</strong> — TDD, SOLID, Clean Architecture</li></ul>',
        en: 'Six fronts, from a single project to full technology leadership:<ul>' +
            '<li><strong>AI Agents</strong> — a role inside your team, not a chatbot</li>' +
            '<li><strong>IT Consulting</strong> — assessment, roadmap, architecture and governance</li>' +
            '<li><strong>Transformation</strong> — modernisation, automation and integration</li>' +
            '<li><strong>AI Training</strong> — upskilling internal teams</li>' +
            '<li><strong>Data & BI</strong> — Power BI, KPIs and data governance</li>' +
            '<li><strong>Custom development</strong> — TDD, SOLID, Clean Architecture</li></ul>'
      },
      chips: ['agentes', 'consultoria', 'capacitacion']
    },
    {
      id: 'agentes',
      k: 'agente ia inteligencia artificial llm claude openai orquestador sdd c4 n8n nucleo dev equipo completo hibrido guild agent ai artificial intelligence',
      p: ['agentes ia', 'agentes de ia', 'ai agents', 'que es un agente'],
      a: {
        es: '<strong>Agentes IA</strong>: sistemas especializados que cubren el ciclo completo — producto, diseño, desarrollo, testing, DevOps, datos y seguridad. Cada agente tiene un rol, un contexto y estándares definidos.<br><br>Metodología <strong>Spec-Driven Development + C4 Model</strong>. Tres planes: Núcleo Dev, Equipo Completo e Híbrido + N8N.<br><br><a href="agentes.html">Ver la página de Agentes IA</a>',
        en: '<strong>AI Agents</strong>: specialised systems covering the full cycle — product, design, development, testing, DevOps, data and security. Each agent has a role, a context and defined standards.<br><br>Methodology: <strong>Spec-Driven Development + C4 Model</strong>. Three plans: Dev Core, Full Team and Hybrid + N8N.<br><br><a href="agentes.html">See the AI Agents page</a>'
      },
      chips: ['precios', 'stack', 'contacto']
    },
    {
      id: 'consultoria',
      k: 'consultoria consultor organismo provincial plan mensual base operativa gestion evolucion direccion estrategica it externa sla roadmap gobierno consulting monthly plans',
      p: ['consultoria it', 'planes de consultoria', 'it consulting', 'servicio mensual'],
      a: {
        es: '<strong>Consultoría IT</strong> pensada para organismos que necesitan capacidad técnica sin ampliar estructura interna. Tres niveles según madurez:<ul>' +
            '<li><strong>Base Operativa</strong> — ordenar la operación IT</li>' +
            '<li><strong>Gestión y Evolución</strong> — mejorar, escalar y ejecutar proyectos</li>' +
            '<li><strong>Dirección Estratégica IT</strong> — dirección IT externa</li></ul>' +
            'Todo queda documentado y es propiedad del organismo: sin lock-in.<br><br><a href="consultoria.html">Ver los planes</a>',
        en: '<strong>IT Consulting</strong> built for public agencies that need technical capacity without growing headcount. Three tiers by maturity:<ul>' +
            '<li><strong>Operational Base</strong> — get IT operations in order</li>' +
            '<li><strong>Management & Growth</strong> — improve, scale and deliver projects</li>' +
            '<li><strong>Strategic IT Leadership</strong> — outsourced IT direction</li></ul>' +
            'Everything is documented and owned by the agency: no vendor lock-in.<br><br><a href="consultoria.html">See the plans</a>'
      },
      chips: ['precios', 'metodologia', 'contacto']
    },
    {
      id: 'capacitacion',
      k: 'capacitacion curso formacion entrenamiento programa adopcion clases modulos certificacion alumnos participantes nivel inicial intermedio avanzado training course workshop',
      p: ['capacitacion', 'cursos', 'formacion', 'training', 'courses'],
      a: {
        es: '<strong>Programa de Adopción de IA</strong>: no es un curso de herramientas, es adopción operativa. Tres niveles independientes, grupos de hasta 15 personas, 8 clases cada uno.<ul>' +
            '<li><strong>Introducción a IA Aplicada</strong> — ARS 4.000.000</li>' +
            '<li><strong>Automatización y Procesos con IA</strong> — ARS 6.000.000</li>' +
            '<li><strong>Gobierno, Seguridad y Arquitectura IA</strong> — ARS 6.000.000</li></ul>' +
            'Cada programa incluye evaluación intermedia, final y certificación.<br><br><a href="capacitacion.html">Ver los programas</a>',
        en: '<strong>AI Adoption Programme</strong>: not a tools course — operational adoption. Three independent levels, groups of up to 15, 8 sessions each.<ul>' +
            '<li><strong>Applied AI Foundations</strong> — ARS 4,000,000</li>' +
            '<li><strong>Automation & Processes with AI</strong> — ARS 6,000,000</li>' +
            '<li><strong>AI Governance, Security & Architecture</strong> — ARS 6,000,000</li></ul>' +
            'Each programme includes a mid-term assessment, a final one and certification.<br><br><a href="capacitacion.html">See the programmes</a>'
      },
      chips: ['precios', 'agentes', 'contacto']
    },
    {
      id: 'transformacion',
      k: 'transformacion tecnologica modernizacion automatizacion integracion sistemas islas arquitectura estrategia legacy erp api transformation modernisation integration',
      p: ['transformacion tecnologica', 'modernizacion', 'digital transformation'],
      a: {
        es: '<strong>Transformación tecnológica</strong>: desarrollo a medida, arquitectura y estrategia, automatización e IA, Datos & BI, integración de sistemas y formación de equipos.<br><br>Siempre análisis y diseño antes de código. El presupuesto se define después de entender el problema real.<br><br><a href="transformacion-tecnologica.html">Ver los seis frentes</a>',
        en: '<strong>Technology transformation</strong>: custom development, architecture and strategy, automation and AI, Data & BI, systems integration and team enablement.<br><br>Always analysis and design before code. Pricing is defined after understanding the real problem.<br><br><a href="transformacion-tecnologica.html">See the six fronts</a>'
      },
      chips: ['metodologia', 'proyectos', 'contacto']
    },
    {
      id: 'datos',
      k: 'datos data bi business intelligence power dashboard tablero kpi reporte etl elt pipeline gobernanza metrica reporting analytics',
      p: ['datos y bi', 'power bi', 'dashboards', 'data and bi'],
      a: {
        es: '<strong>Datos & BI</strong>: dashboards en Power BI, pipelines ETL/ELT, definición de KPIs y gobernanza de datos orientada a decisiones reales — no a reportes que nadie mira.',
        en: '<strong>Data & BI</strong>: Power BI dashboards, ETL/ELT pipelines, KPI definition and data governance aimed at real decisions — not reports nobody reads.'
      },
      chips: ['servicios', 'proyectos', 'contacto']
    },
    {
      id: 'desarrollo',
      k: 'desarrollo software medida sistema portal api integracion aplicacion web programacion tdd solid clean architecture development custom build app',
      p: ['desarrollo a medida', 'hacen software', 'custom development', 'desarrollan'],
      a: {
        es: '<strong>Desarrollo a medida</strong>: sistemas, portales, APIs e integraciones con estándares enterprise — TDD, SOLID y Clean Architecture.<br><br>Entrega por etapas, incremental, con documentación y transferencia al equipo del cliente.<br><br>El presupuesto se define después de entender el problema real, nunca antes.',
        en: '<strong>Custom development</strong>: systems, portals, APIs and integrations with enterprise standards — TDD, SOLID and Clean Architecture.<br><br>Staged, incremental delivery with documentation and handover to the client team.<br><br>Pricing is defined after understanding the real problem, never before.'
      },
      chips: ['stack', 'metodologia', 'proyectos']
    },
    {
      id: 'proyectos',
      k: 'proyecto trabajo realizado hicieron portfolio casos referencia ejemplo experiencia obras project work done portfolio case studies examples',
      p: ['que proyectos', 'que hicieron', 'casos de exito', 'what projects', 'your work'],
      a: {
        es: 'Proyectos de referencia de más de 10 años:<ul>' +
            '<li><strong>Sistema de Actas Digitales</strong> — Registro Civil, trazabilidad completa</li>' +
            '<li><strong>Informatización clínica</strong> — salud, con foco en interoperabilidad</li>' +
            '<li><strong>Nodo de datos personales</strong> — arquitectura interoperable y segura</li>' +
            '<li><strong>Documentación de inmuebles</strong> — flujos de aprobación y reporting</li></ul>' +
            '¿Sobre cuál querés que profundice?',
        en: 'Reference projects from over 10 years:<ul>' +
            '<li><strong>Digital Records System</strong> — Civil Registry, full traceability</li>' +
            '<li><strong>Clinical digitalisation</strong> — health, focused on interoperability</li>' +
            '<li><strong>Personal data node</strong> — interoperable, secure architecture</li>' +
            '<li><strong>Property documentation</strong> — approval flows and reporting</li></ul>' +
            'Which one would you like me to expand on?'
      },
      chips: ['actas', 'salud', 'clientes']
    },
    {
      id: 'actas',
      k: 'acta partida registro civil rc digitales ocr integrador tramite documento certificado nacimiento records civil registry digital deeds',
      p: ['actas digitales', 'registro civil', 'rc actas', 'civil registry'],
      a: {
        es: '<strong>RC Actas Digitales</strong> — plataforma integral para el Registro Civil de Jujuy. Centraliza solicitud, seguimiento, validación y entrega de partidas, con asignación de trámites, pagos, usuarios y roles, monitoreo operativo y revisión documental asistida por OCR.<br><br>Incluye un portal gobernado para integradores externos: accesos, credenciales, consumo de APIs, auditoría y reportes.',
        en: '<strong>RC Actas Digitales</strong> — an end-to-end platform for the Civil Registry of Jujuy. It centralises request, tracking, validation and delivery of records, with case assignment, payments, users and roles, operational monitoring and OCR-assisted document review.<br><br>It includes a governed portal for external integrators: access, credentials, API consumption, auditing and reporting.'
      },
      chips: ['proyectos', 'clientes', 'contacto']
    },
    {
      id: 'salud',
      k: 'salud clinica historia hospital paciente medico ministerio mas interoperabilidad covid health clinical patient record hospital',
      p: ['informatizacion clinica', 'ministerio de salud', 'historia clinica', 'health project'],
      a: {
        es: '<strong>Informatización clínica</strong> para el Ministerio de Salud de Jujuy: gestión y digitalización de procesos y registros médicos con foco en interoperabilidad.<br><br>Incluyó la historia clínica digital de alcance provincial, sistemas de gestión de pacientes y monitoreo COVID-19, e integración con sistemas nacionales críticos.',
        en: '<strong>Clinical digitalisation</strong> for the Ministry of Health of Jujuy: managing and digitalising medical processes and records with a focus on interoperability.<br><br>It covered a province-wide digital health record, patient management and COVID-19 monitoring systems, and integration with critical national systems.'
      },
      chips: ['proyectos', 'clientes', 'contacto']
    },
    {
      id: 'inmuebles',
      k: 'inmueble dpi direccion provincial propiedad catastro documentacion aprobacion expediente property real estate land registry',
      p: ['inmuebles', 'dpi', 'documentacion de inmuebles', 'property documentation'],
      a: {
        es: '<strong>Documentación de inmuebles</strong> para la Dirección Provincial de Inmuebles: digitalización de documentación, flujos de aprobación y reporting para el área.',
        en: '<strong>Property documentation</strong> for the Provincial Property Office: document digitalisation, approval workflows and reporting for the area.'
      },
      chips: ['proyectos', 'clientes', 'contacto']
    },
    {
      id: 'nodo-datos',
      k: 'nodo dato personal interoperable seguro gubernamental conforme normativa arquitectura persona relacion node personal data interoperable government',
      p: ['nodo de datos', 'datos personales', 'personal data node'],
      a: {
        es: '<strong>Nodo de datos personales</strong>: arquitectura interoperable y segura, conforme a requerimientos gubernamentales. Modela personas y sus relaciones, y expone APIs consumidas por empresas y reparticiones públicas.',
        en: '<strong>Personal data node</strong>: an interoperable, secure architecture compliant with government requirements. It models people and their relationships, and exposes APIs consumed by companies and public agencies.'
      },
      chips: ['actas', 'proyectos', 'contacto']
    },
    {
      id: 'clientes',
      k: 'cliente organismo trabajaron con quien confian referencia institucion ciden ministerio hacienda hotel luna daniela cuatro client customers who worked with',
      p: ['con quien trabajaron', 'quienes son sus clientes', 'your clients', 'clientes'],
      a: {
        es: 'Organismos y empresas del sector público y privado de Jujuy:<ul>' +
            '<li>CIDEN</li><li>Ministerio de Salud de Jujuy</li><li>Ministerio de Hacienda de Jujuy</li>' +
            '<li>Registro Civil de Jujuy</li><li>Dirección Provincial de Inmuebles</li>' +
            '<li>Hotel Luna Daniela</li><li>El Cuatro Jujuy</li></ul>',
        en: 'Public and private organisations across Jujuy:<ul>' +
            '<li>CIDEN</li><li>Ministry of Health of Jujuy</li><li>Ministry of Finance of Jujuy</li>' +
            '<li>Civil Registry of Jujuy</li><li>Provincial Property Office</li>' +
            '<li>Hotel Luna Daniela</li><li>El Cuatro Jujuy</li></ul>'
      },
      chips: ['proyectos', 'metricas', 'contacto']
    },
    {
      id: 'metodologia',
      k: 'metodologia como trabajan proceso etapa fase relevamiento analisis diseno ejecucion entrega incremental transferencia documentacion methodology how do you work process steps',
      p: ['como trabajan', 'cual es el proceso', 'metodologia', 'how do you work', 'your process'],
      a: {
        es: 'Ordenamos la iniciativa antes de construir, en tres etapas:<ul>' +
            '<li><strong>Relevamiento</strong> — procesos, RRHH, costos, tecnología existente y objetivos reales</li>' +
            '<li><strong>Análisis y diseño</strong> — arquitectura, roadmap, priorización y riesgos</li>' +
            '<li><strong>Ejecución y entrega</strong> — desarrollo por etapas, documentación y transferencia</li></ul>' +
            'Reduce riesgo, enfoca la inversión y mejora la adopción.',
        en: 'We put the initiative in order before building, in three stages:<ul>' +
            '<li><strong>Discovery</strong> — processes, staffing, cost, existing technology and real goals</li>' +
            '<li><strong>Analysis and design</strong> — architecture, roadmap, prioritisation and risks</li>' +
            '<li><strong>Delivery</strong> — staged development, documentation and handover</li></ul>' +
            'It reduces risk, focuses the investment and improves adoption.'
      },
      chips: ['diagnostico', 'precios', 'contacto']
    },
    {
      id: 'diagnostico',
      k: 'diagnostico gratis gratuito sin costo cargo primera reunion inicial relevamiento evaluacion compromiso free first meeting assessment no cost',
      p: ['es gratis', 'sin cargo', 'primera reunion', 'free consultation', 'diagnostico'],
      a: {
        es: 'Sí: <strong>el diagnóstico inicial es sin costo</strong>. La primera reunión se dedica a entender tu situación real, y te decimos con honestidad si podemos ayudarte o no.<br><br>Para arrancar, ' + waLink.es + '.',
        en: 'Yes: <strong>the initial assessment is free</strong>. The first meeting is dedicated to understanding your actual situation, and we\'ll tell you honestly whether we can help.<br><br>To get started, ' + waLink.en + '.'
      },
      chips: ['contacto', 'metodologia', 'precios']
    },
    {
      id: 'precios',
      k: 'precio costo cuanto sale vale tarifa presupuesto cotizacion honorario plata pagar arancel inversion price cost how much budget quote fees',
      p: ['cuanto cuesta', 'cuanto sale', 'que precio', 'how much', 'pricing', 'presupuesto'],
      a: {
        es: 'Depende del servicio:<ul>' +
            '<li><strong>Capacitación</strong> — precio publicado: ARS 4.000.000 el nivel inicial, ARS 6.000.000 los otros dos</li>' +
            '<li><strong>Consultoría</strong> — se define según el organismo, el alcance real y la modalidad de contratación</li>' +
            '<li><strong>Agentes IA</strong> — precio fijo por implementación; el uso del modelo va aparte y lo pagás al proveedor</li>' +
            '<li><strong>Desarrollo</strong> — se presupuesta después de entender el problema, nunca antes</li></ul>',
        en: 'It depends on the service:<ul>' +
            '<li><strong>Training</strong> — published: ARS 4,000,000 for the entry level, ARS 6,000,000 for the other two</li>' +
            '<li><strong>Consulting</strong> — defined by the agency, the real scope and the contracting model</li>' +
            '<li><strong>AI Agents</strong> — fixed implementation fee; model usage is billed separately by the provider</li>' +
            '<li><strong>Development</strong> — quoted after understanding the problem, never before</li></ul>'
      },
      chips: ['diagnostico', 'capacitacion', 'contacto']
    },
    {
      id: 'stack',
      k: 'stack tecnologia herramienta lenguaje framework net azure cloud react power bi docker sql ollama rag llm tecnica technology tools languages',
      p: ['que tecnologias', 'que stack', 'con que trabajan', 'tech stack', 'technologies'],
      a: {
        es: 'El stack principal:<ul>' +
            '<li><strong>Backend</strong> — .NET 8, C#, Clean Architecture, CQRS, microservicios, API Gateway</li>' +
            '<li><strong>Cloud</strong> — Microsoft Azure (Functions, Blob Storage, DevOps)</li>' +
            '<li><strong>IA</strong> — agentes LLM, RAG on-premise, Ollama, ChromaDB, gobernanza con human-in-the-loop</li>' +
            '<li><strong>Datos</strong> — Power BI, SQL Server, Data Warehouse</li>' +
            '<li><strong>Frontend</strong> — React, Next.js</li></ul>',
        en: 'The core stack:<ul>' +
            '<li><strong>Backend</strong> — .NET 8, C#, Clean Architecture, CQRS, microservices, API Gateway</li>' +
            '<li><strong>Cloud</strong> — Microsoft Azure (Functions, Blob Storage, DevOps)</li>' +
            '<li><strong>AI</strong> — LLM agents, on-premise RAG, Ollama, ChromaDB, human-in-the-loop governance</li>' +
            '<li><strong>Data</strong> — Power BI, SQL Server, Data Warehouse</li>' +
            '<li><strong>Frontend</strong> — React, Next.js</li></ul>'
      },
      chips: ['agentes', 'desarrollo', 'contacto']
    },
    {
      id: 'problemas',
      k: 'problema dolor resuelven escala lento inestable manual desorden continuidad informacion decidir isla integran direccion tecnica problem pain solve issues',
      p: ['que problemas resuelven', 'que dolores', 'what problems', 'what do you solve'],
      a: {
        es: 'Los dolores típicos de organizaciones con alta complejidad operativa:<ul>' +
            '<li>Sistemas que no escalan</li><li>Procesos manuales desordenados</li>' +
            '<li>Sistemas sin continuidad — los conoce una sola persona</li>' +
            '<li>Falta de información para decidir</li><li>Sistemas que no se integran</li>' +
            '<li>Decisiones tecnológicas sin criterio ni roadmap</li></ul>',
        en: 'The typical pain points of operationally complex organisations:<ul>' +
            '<li>Systems that don\'t scale</li><li>Disorganised manual processes</li>' +
            '<li>Systems with no continuity — only one person understands them</li>' +
            '<li>No information to decide with</li><li>Systems that don\'t integrate</li>' +
            '<li>Technology decisions with no criteria or roadmap</li></ul>'
      },
      chips: ['servicios', 'metodologia', 'diagnostico']
    },
    {
      id: 'ubicacion',
      k: 'donde estan ubicacion oficina ciudad jujuy salvador argentina remoto distancia zona atienden viajan afuera pais where located office remote country',
      p: ['donde estan', 'donde quedan', 'trabajan remoto', 'where are you', 'location'],
      a: {
        es: 'Estamos en <strong>San Salvador de Jujuy, Argentina</strong>. Trabajamos con organismos y empresas de la provincia, y también en remoto — el lema es <em>"De Jujuy al mundo"</em>.',
        en: 'We\'re based in <strong>San Salvador de Jujuy, Argentina</strong>. We work with organisations across the province and remotely too — our motto is <em>"From Jujuy to the World"</em>.'
      },
      chips: ['contacto', 'empresa', 'clientes']
    },
    {
      id: 'contacto',
      k: 'contacto contactar comunicar hablar escribir consultar cotizar presupuestar whatsapp mail email telefono llamar reunion agendar cita turno pedir contact reach phone talk meeting book quote',
      p: ['como los contacto', 'quiero hablar', 'contacto', 'contactar', 'contact you', 'get in touch', 'hablar con'],
      a: {
        es: 'La vía más rápida es WhatsApp — ' + waLink.es + '.<br><br>También podés <a href="index.html#intake">contarnos tu idea desde el formulario</a>: con esa información preparamos una propuesta concreta, sin compromiso.',
        en: 'The fastest route is WhatsApp — ' + waLink.en + '.<br><br>You can also <a href="index.html#intake">tell us about your idea using the form</a>: with that information we prepare a concrete proposal, no strings attached.'
      },
      chips: ['diagnostico', 'servicios', 'ubicacion']
    },
    {
      id: 'gracias',
      k: 'gracias muchas genial barbaro perfecto buenisimo copado excelente joya thanks thank you great awesome perfect',
      p: ['gracias', 'thanks', 'thank you', 'muchas gracias'],
      a: {
        es: '¡De nada! Si te queda algo dando vueltas, preguntame nomás. Y si querés hablar con una persona de verdad, ' + waLink.es + '.',
        en: 'You\'re welcome! If anything else is on your mind, just ask. And if you\'d rather talk to an actual human, ' + waLink.en + '.'
      },
      chips: ['servicios', 'proyectos', 'contacto']
    },
    {
      id: 'despedida',
      k: 'chau adios hasta luego nos vemos saludos me voy listo bye goodbye see you later cheers',
      p: ['chau', 'adios', 'bye', 'hasta luego', 'nos vemos'],
      a: {
        es: '¡Suerte con el proyecto! Acá quedo si necesitás algo más. 🧣',
        en: 'Good luck with the project! I\'ll be here if you need anything else. 🧣'
      },
      chips: ['contacto']
    }
  ];

  // Etiquetas de los chips sugeridos
  var CHIP_LABELS = {
    servicios:    { es: 'Servicios',        en: 'Services' },
    proyectos:    { es: 'Proyectos',        en: 'Projects' },
    empresa:      { es: '¿Qué es GG?',      en: 'What is GG?' },
    agentes:      { es: 'Agentes IA',       en: 'AI Agents' },
    consultoria:  { es: 'Consultoría',      en: 'Consulting' },
    capacitacion: { es: 'Capacitación',     en: 'Training' },
    precios:      { es: 'Precios',          en: 'Pricing' },
    contacto:     { es: 'Contacto',         en: 'Contact' },
    clientes:     { es: 'Clientes',         en: 'Clients' },
    metricas:     { es: 'Números',          en: 'Numbers' },
    metodologia:  { es: 'Cómo trabajan',    en: 'How you work' },
    diagnostico:  { es: '¿Es sin cargo?',   en: 'Is it free?' },
    stack:        { es: 'Tecnologías',      en: 'Tech stack' },
    actas:        { es: 'Actas Digitales',  en: 'Digital Records' },
    salud:        { es: 'Proyecto salud',   en: 'Health project' },
    ubicacion:    { es: '¿Dónde están?',    en: 'Where are you?' },
    alejandro:    { es: '¿Quién lidera?',   en: 'Who leads it?' }
  };

  var UI = {
    es: {
      role: 'Asistente · en línea',
      hint: '¿Alguna duda? Preguntame.',
      placeholder: 'Escribí tu pregunta…',
      send: 'Enviar',
      close: 'Cerrar el asistente',
      open: 'Abrir el asistente',
      legal: 'Respuestas basadas en el contenido del sitio.',
      welcome: '¡Hola! Soy <strong>' + BOT_NAME + '</strong> 🧣 Te cuento sobre los servicios, los proyectos y cómo trabajamos en GG Soluciones. ¿Qué querés saber?',
      fallback: 'Eso no lo tengo en el sitio, así que prefiero no inventarte una respuesta. Para eso mejor ' + waLink.es + ' y te contesta una persona.<br><br>Mientras tanto, quizás te sirva alguno de estos temas:'
    },
    en: {
      role: 'Assistant · online',
      hint: 'Any questions? Ask me.',
      placeholder: 'Type your question…',
      send: 'Send',
      close: 'Close the assistant',
      open: 'Open the assistant',
      legal: 'Answers are based on this site\'s content.',
      welcome: 'Hi! I\'m <strong>' + BOT_NAME + '</strong> 🧣 I can tell you about the services, the projects and how we work at GG Soluciones. What would you like to know?',
      fallback: 'That isn\'t on the site, so I\'d rather not make up an answer. Better to ' + waLink.en + ' and a human will reply.<br><br>In the meantime, one of these might help:'
    }
  };

  /* ─────────────────────────────────────────────
     Motor de recuperación
     ───────────────────────────────────────────── */

  var STOP = {};
  ('de la el los las un una unos unas y o u que en a al del por para con sin sobre como se su sus lo le les mi tu ' +
   'es son ser esta este estos estas ese esa eso muy hay tiene tienen hacer hace me te nos yo vos usted ustedes ' +
   'the a an and or of in on at for to with without about is are be do does did what which who how i you your ' +
   'my we our it its can could would please tell me ' +
   'quiero quisiera queria necesito busco buscando puedo podria dame decime contame ' +
   'want need looking like show give').split(' ').forEach(function (w) { STOP[w] = 1; });

  function normalize(text) {
    return String(text || '')
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')  // á→a, ñ→n
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Enclíticos: en español el pronombre se pega al infinitivo
  // ("contactarlos", "contactarme", "hacerlo"). Sin esto la consulta
  // nunca colapsa con la forma que está en la base.
  // El mínimo de 7 caracteres evita falsos positivos como "carlos".
  var ENCLITIC = /(ar|er|ir)(me|te|se|nos|les|le|los|las|lo|la)$/;

  function stem(token) {
    if (token.length >= 7) {
      var cut = token.replace(ENCLITIC, '$1');
      if (cut.length >= 4) token = cut;
    }
    // Plural simple, aplicado igual a la consulta y a la base para
    // que "agentes" y "agente" terminen en la misma forma.
    if (token.length > 3 && token.charAt(token.length - 1) === 's') {
      token = token.slice(0, -1);
    }
    return token;
  }

  function tokenize(text) {
    var out = [];
    normalize(text).split(' ').forEach(function (t) {
      if (!t || STOP[t] || t.length < 2) return;
      out.push(stem(t));
    });
    return out;
  }

  // Índice: conjunto de tokens por entrada + IDF sobre la base.
  var IDF = {};
  KB.forEach(function (entry) {
    entry._tokens = {};
    tokenize(entry.k + ' ' + entry.id).forEach(function (t) { entry._tokens[t] = 1; });
    entry._phrases = (entry.p || []).map(normalize);
    Object.keys(entry._tokens).forEach(function (t) { IDF[t] = (IDF[t] || 0) + 1; });
  });
  Object.keys(IDF).forEach(function (t) {
    IDF[t] = Math.log(1 + KB.length / IDF[t]);
  });

  function idf(token) {
    // Un término desconocido para la base sigue siendo informativo:
    // le damos el peso máximo en lugar de descartarlo.
    return IDF[token] !== undefined ? IDF[token] : Math.log(1 + KB.length);
  }

  // Comparar frases con indexOf sobre el texto crudo hace que una
  // frase corta coincida dentro de otra palabra: "hi" está adentro de
  // "historias". Como la consulta ya viene normalizada a palabras
  // separadas por un espacio, alcanza con acolcharla en los bordes.
  function hasPhrase(paddedQuery, phrase) {
    return paddedQuery.indexOf(' ' + phrase + ' ') !== -1;
  }

  function score(entry, tokens, normalizedQuery) {
    var hit = 0, total = 0;
    tokens.forEach(function (t) {
      var w = idf(t);
      total += w;
      if (entry._tokens[t]) hit += w;
    });
    if (!total) return 0;

    var coverage = hit / total;

    // Una frase completa expresa la intención, no solo el tema:
    // en "cuanto cuesta un desarrollo a medida" el visitante pide un
    // precio, aunque las palabras temáticas apunten al servicio. El
    // bonus tiene que alcanzar para ganarle a ese solapamiento.
    for (var i = 0; i < entry._phrases.length; i++) {
      if (entry._phrases[i] && hasPhrase(normalizedQuery, entry._phrases[i])) {
        coverage += 0.85;
        break;
      }
    }
    return coverage;
  }

  var MIN_SCORE = 0.34;

  // Única frontera con el "cerebro". Cambiarla por una llamada
  // remota no obliga a tocar ni la UI ni la base de conocimiento.
  function resolve(question) {
    var tokens = tokenize(question);
    var normalized = normalize(question);
    if (!tokens.length) return { entry: null, ranked: [] };

    var padded = ' ' + normalized + ' ';
    var ranked = KB.map(function (entry) {
      return { entry: entry, s: score(entry, tokens, padded) };
    }).sort(function (a, b) { return b.s - a.s; });

    return {
      entry: ranked[0] && ranked[0].s >= MIN_SCORE ? ranked[0].entry : null,
      ranked: ranked
    };
  }

  function entryById(id) {
    for (var i = 0; i < KB.length; i++) if (KB[i].id === id) return KB[i];
    return null;
  }

  /* ─────────────────────────────────────────────
     Interfaz
     ───────────────────────────────────────────── */

  var root, panel, log, chipsBar, input, hint, launcher;
  var greeted = false;

  function t() { return UI[lang()]; }

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  }

  function scrollDown() { log.scrollTop = log.scrollHeight; }

  function addBot(html) {
    log.appendChild(el('div', 'ggsbot-msg bot', html));
    scrollDown();
  }

  function addUser(text) {
    var node = el('div', 'ggsbot-msg user');
    node.textContent = text;   // nunca innerHTML: es entrada del visitante
    log.appendChild(node);
    scrollDown();
  }

  function showTyping() {
    var node = el('div', 'ggsbot-typing', '<span></span><span></span><span></span>');
    node.setAttribute('aria-hidden', 'true');
    log.appendChild(node);
    scrollDown();
    return node;
  }

  function renderChips(ids) {
    chipsBar.innerHTML = '';
    var l = lang();
    (ids || []).forEach(function (id) {
      var label = CHIP_LABELS[id];
      if (!label) return;
      var chip = el('button', 'ggsbot-chip');
      chip.type = 'button';
      chip.textContent = label[l];
      chip.addEventListener('click', function () { ask(label[l], id); });
      chipsBar.appendChild(chip);
    });
  }

  function answerWith(entry) {
    var l = lang();
    addBot(entry.a[l]);
    renderChips(entry.chips || ['servicios', 'proyectos', 'contacto']);
  }

  function answerFallback(ranked) {
    var l = lang();
    addBot(t().fallback);
    var suggestions = ranked.slice(0, 3).map(function (r) { return r.entry.id; })
      .filter(function (id) { return CHIP_LABELS[id]; });
    renderChips(suggestions.length ? suggestions : ['servicios', 'proyectos', 'contacto']);
  }

  // forcedId: los chips saben qué tema representan, así que no
  // dependen del matcher para acertar su propia respuesta.
  function ask(text, forcedId) {
    var question = String(text || '').trim();
    if (!question) return;

    addUser(question);
    input.value = '';
    chipsBar.innerHTML = '';

    var typing = showTyping();
    var result = forcedId
      ? { entry: entryById(forcedId), ranked: [] }
      : resolve(question);

    // Una pausa corta hace la conversación legible; sin ella las
    // respuestas aparecen antes de que el visitante lea su pregunta.
    setTimeout(function () {
      if (typing.parentNode) typing.parentNode.removeChild(typing);
      if (result.entry) answerWith(result.entry);
      else answerFallback(result.ranked);
    }, 420);

    try {
      (window.GGS_track || function () {})({
        event: 'chatbot_question',
        question: question.slice(0, 80),
        matched: result.entry ? result.entry.id : 'none'
      });
    } catch (e) { /* el tracking nunca bloquea la respuesta */ }
  }

  function greet() {
    if (greeted) return;
    greeted = true;
    addBot(t().welcome);
    renderChips(['servicios', 'proyectos', 'empresa', 'precios', 'contacto']);
  }

  function open() {
    root.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    greet();
    writeStore(STORAGE_SEEN, '1');
    if (hint) hint.classList.remove('show');
    setTimeout(function () { input.focus(); }, 60);
  }

  function close() {
    root.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    launcher.focus();
  }

  // Re-etiqueta la interfaz cuando cambia el idioma del sitio.
  // Los mensajes ya enviados quedan como están: son historial.
  function applyLang() {
    var s = t();
    root.querySelector('.ggsbot-role-txt').textContent = s.role;
    input.placeholder = s.placeholder;
    input.setAttribute('aria-label', s.placeholder);
    root.querySelector('.ggsbot-legal').textContent = s.legal;
    root.querySelector('.ggsbot-close').setAttribute('aria-label', s.close);
    launcher.setAttribute('aria-label', s.open);
    if (hint) hint.textContent = s.hint;
  }

  function build() {
    var s = t();

    root = el('div', 'ggsbot');
    root.id = 'ggsbot';

    panel = el('section', 'ggsbot-panel');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', BOT_NAME);
    panel.setAttribute('aria-hidden', 'true');
    panel.innerHTML =
      '<header class="ggsbot-head">' +
        mascot() +
        '<div class="ggsbot-id">' +
          '<div class="ggsbot-name">' + BOT_NAME + '</div>' +
          '<div class="ggsbot-role"><span class="ggsbot-dot"></span><span class="ggsbot-role-txt">' + s.role + '</span></div>' +
        '</div>' +
        '<button type="button" class="ggsbot-close" aria-label="' + s.close + '">&times;</button>' +
      '</header>' +
      '<div class="ggsbot-log" role="log" aria-live="polite"></div>' +
      '<div class="ggsbot-chips"></div>' +
      '<form class="ggsbot-form">' +
        '<input class="ggsbot-input" type="text" autocomplete="off" ' +
               'placeholder="' + s.placeholder + '" aria-label="' + s.placeholder + '">' +
        '<button type="submit" class="ggsbot-send" aria-label="' + s.send + '">' +
          '<svg viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>' +
        '</button>' +
      '</form>' +
      '<div class="ggsbot-legal">' + s.legal + '</div>';

    launcher = el('button', 'ggsbot-launcher', mascot());
    launcher.type = 'button';
    launcher.setAttribute('aria-label', s.open);

    hint = el('div', 'ggsbot-hint');
    hint.textContent = s.hint;

    root.appendChild(panel);
    root.appendChild(hint);
    root.appendChild(launcher);
    document.body.appendChild(root);

    log = panel.querySelector('.ggsbot-log');
    chipsBar = panel.querySelector('.ggsbot-chips');
    input = panel.querySelector('.ggsbot-input');

    launcher.addEventListener('click', open);
    panel.querySelector('.ggsbot-close').addEventListener('click', close);
    panel.querySelector('.ggsbot-form').addEventListener('submit', function (e) {
      e.preventDefault();
      ask(input.value);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && root.classList.contains('open')) close();
    });
    // i18n.js persiste el idioma antes de repintar; leemos después.
    document.addEventListener('click', function (e) {
      if (e.target.closest('.lang-opt')) setTimeout(applyLang, 0);
    });

    // El globito aparece una sola vez por visitante.
    if (!readStore(STORAGE_SEEN)) {
      setTimeout(function () {
        if (!root.classList.contains('open')) hint.classList.add('show');
      }, 3500);
      setTimeout(function () { hint.classList.remove('show'); }, 12000);
    }
  }

  function init() {
    if (document.getElementById('ggsbot')) return;
    build();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
