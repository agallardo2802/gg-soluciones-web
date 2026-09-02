# Asistente de sitio por recuperación local

Guía para implementar un asistente conversacional que responde sobre **el
conocimiento de un sistema propio**, sin backend y sin modelo de lenguaje.

Es la generalización de `chatbot.js` / `chatbot.css` (Suni, el asistente de
ggsoluciones.com.ar). Está escrita para portarla a otro sistema: otro sitio,
un portal interno, un producto con documentación propia.

---

## 1. Cuándo aplica este patrón

La decisión no es "chatbot sí o no", es **qué motor** le ponés detrás. Se elige
por la forma del dominio, no por la moda.

| Situación | Motor adecuado |
|---|---|
| El conocimiento es **finito, curado y propio** (páginas, catálogo, FAQ, planes) | **Recuperación local.** Este documento. |
| El conocimiento es amplio pero acotado (cientos de documentos, wiki interna) | **RAG** con embeddings + backend |
| El usuario necesita razonar, redactar o combinar información libremente | **LLM** con herramientas |

Tres criterios que en la práctica deciden por vos:

**1. ¿Hay backend?** Una API key **no puede vivir en JavaScript de cliente**. Se
descarga con la página. No hay ofuscación que lo evite: si el navegador puede
leerla para usarla, el visitante también. Un LLM en un sitio estático exige
levantar un proxy antes (Azure Function, Cloudflare Worker) con la clave del
lado del servidor, CORS al dominio y rate limiting. Eso es infraestructura
nueva, con costo por token y algo que mantener.

**2. ¿Cuánto cuesta una respuesta inventada?** Si el bot habla de tu
trayectoria, tus precios o tus antecedentes, una alucinación es peor que un "no
lo sé". En un anexo comercial o un contrato, un dato inventado sobre un
proyecto propio es un problema real, no una molestia.

**3. ¿Cuántas preguntas distintas existen de verdad?** Si el 90% del tráfico se
concentra en veinte o treinta intenciones, una base curada las cubre mejor y
más rápido que un modelo generativo.

Si los tres apuntan a recuperación local, seguí. **La base de conocimiento es
el activo**: si más adelante enchufás un LLM, esa misma base pasa a ser el
contexto del RAG. El motor es intercambiable, los datos no.

---

## 2. Arquitectura

```
┌───────────────────────────────────────────────┐
│  Widget (UI)                                  │
│  lanzador · panel · burbujas · chips · input  │
└──────────────────┬────────────────────────────┘
                   │  ask(texto)
                   ▼
┌───────────────────────────────────────────────┐
│  resolve(pregunta)          ← ÚNICA COSTURA   │
│  normalizar → tokenizar → puntuar → umbral    │
└──────────────────┬────────────────────────────┘
                   │
                   ▼
┌───────────────────────────────────────────────┐
│  KB — base de conocimiento curada             │
│  [{ id, k, p, a: {es, en}, chips }]           │
└───────────────────────────────────────────────┘
```

`resolve()` es la única frontera con el motor de respuestas. Reemplazarla por
una llamada remota no obliga a tocar ni la interfaz ni la base. Mantené esa
costura limpia desde el día uno: es lo que hace barata la migración a RAG.

Archivos: un `.js` autocontenido y un `.css`. Sin dependencias, sin build.

---

## 3. Paso 1 — Extraer el conocimiento del sistema

No escribas la base de memoria. **Extraela del sistema y después curala.** Lo
que el bot afirme tiene que existir en una fuente verificable.

### Fuentes por orden de valor

1. **Copy publicado** — páginas, landings, fichas de producto. Es lo que el
   visitante ya puede leer, así que el bot nunca lo contradice.
2. **Preguntas reales** — WhatsApp, mail, tickets, el buscador interno. Definen
   qué intenciones existen de verdad, no cuáles imaginás.
3. **Datos estructurados** — catálogo, planes, precios, clientes.
4. **Documentación interna** — solo lo que sea publicable.

### Extracción del copy

Para un sitio HTML, este script vuelca el texto visible de cada página:

```python
# tools/extract_copy.py
import io, re, sys

PAGES = ['index.html', 'servicios.html', 'precios.html']

out = []
for f in PAGES:
    s = io.open(f, encoding='utf-8').read()
    s = re.sub(r'(?s)<(script|style|svg)\b.*?</\1>', ' ', s)
    s = re.sub(r'(?s)<!--.*?-->', ' ', s)
    s = re.sub(r'<[^>]+>', '\n', s)
    s = s.replace('&nbsp;', ' ').replace('&amp;', '&')
    lines = [l.strip() for l in s.split('\n')]
    lines = [l for l in lines if l and len(l) > 2]
    out.append('=' * 70 + '\nFILE: ' + f + '\n' + '=' * 70)
    out.append('\n'.join(lines))

io.open(sys.argv[1], 'w', encoding='utf-8').write('\n'.join(out))
```

> En Windows escribí a archivo, no a stdout: la consola usa cp1252 y revienta
> con guiones largos o flechas.

Para un sistema con base de datos, exportá las entidades que el bot deba
conocer (planes, productos, estados) a JSON y generá las entradas desde ahí.

### Inventario de intenciones

Antes de escribir nada, listá las intenciones. Una intención es **una pregunta
que alguien hace**, no una sección del sitio. Cobertura mínima recomendada:

- Identidad — qué es esto, quién está detrás, desde cuándo
- Oferta — qué servicios/productos hay, overview y uno por cada uno
- Prueba — casos, clientes, números, proyectos
- Proceso — cómo se trabaja, qué pasa después de contactar
- Comercial — precios, cómo se cotiza, si hay algo sin cargo
- Logística — dónde están, si atienden remoto, horarios
- Contacto — todas las vías
- Meta — saludo, quién es el bot, gracias, despedida

Treinta entradas cubren un sitio corporativo completo. Menos de quince suele
significar que agrupaste demasiado y el bot va a responder genérico.

---

## 4. Paso 2 — Diseñar la base

### Esquema de una entrada

```js
{
  id:    'precios',              // único; lo usan los chips y el tracking
  k:     'precio costo cuanto sale vale tarifa presupuesto cotizacion ' +
         'price cost how much budget quote fees',   // términos, ES + EN
  p:     ['cuanto cuesta', 'cuanto sale', 'how much'],  // frases de intención
  a:     { es: '…', en: '…' },   // respuesta, HTML autoral
  chips: ['diagnostico', 'contacto']   // seguimientos sugeridos
}
```

**`k` — términos.** Todo lo que alguien podría escribir para llegar acá:
sinónimos, coloquialismos, errores frecuentes, el término en inglés. Sin tildes
no hace falta: el normalizador las saca. Poné variantes que el stemmer no
resuelva (`ciudad` y `ciudades`, por ejemplo).

**`p` — frases.** Expresan **intención**, no tema. "cuanto cuesta" es una
frase; "precio" es un término. Reciben un bonus grande en el scoring, así que
tienen que ser inequívocas.

Dos reglas que salieron de romperlo:

- **Nunca frases de una o dos letras.** `"hi"` vive dentro de `"historias"`.
- **Preferí frases de dos palabras o más.** Una frase de una sola palabra es un
  tema disfrazado de intención, y el motor solo la cuenta si es la consulta
  entera. Si una entrada de sección compite con la general, dale su propia
  frase de intención: sin `"que reglas"`, la pregunta *"qué reglas tiene el
  sistema de actas"* se la lleva la entrada general por contener el tema
  `"sistema de actas"`.

**`a` — respuesta.** HTML que vos escribís, no entrada de usuario. Reglas:

- Dos a cuatro oraciones, o una lista de hasta seis ítems.
- **Solo afirmá lo que está en la fuente.** Si el dato no existe, no lo pongas.
- Cerrá con un enlace a la página que profundiza.
- Escribila en la voz del sitio. Si el sitio usa voseo, el bot usa voseo.

**`chips` — seguimientos.** Dos o tres. Bajan muchísimo la fricción: la mayoría
de los visitantes hace clic en vez de escribir.

### Reglas de curaduría

1. **Una entrada por intención**, no por página. Si dos páginas responden lo
   mismo, es una entrada.
2. **Nada que no puedas sostener.** El bot es la voz del sistema.
3. **El "no sé" es una respuesta válida y valiosa.** Mejor derivar a contacto
   que improvisar.
4. **Datos volátiles marcados.** Precios, planes y clientes cambian; anotá en
   el código qué entradas hay que revisar cuando cambie el sitio.

---

## 5. Paso 3 — El motor

Portable, sin dependencias. Cada pieza está por una razón concreta.

### 5.1 Normalización

```js
function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // á→a, ñ→n
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
```

`NFD` + borrado de diacríticos deja todo en ASCII: "años", "anos" y "ANOS"
colapsan igual. Se aplica **idéntico a la consulta y a la base**; eso es lo
único que importa.

### 5.2 Stemming

```js
// Enclíticos del español: el pronombre se pega al infinitivo
// ("contactarlos", "hacerlo", "escribirles"). Sin esto, la consulta
// nunca colapsa con la forma que está en la base.
// El mínimo de 7 caracteres evita falsos positivos como "carlos".
var ENCLITIC = /(ar|er|ir)(me|te|se|nos|les|le|los|las|lo|la)$/;

function stem(token) {
  if (token.length >= 7) {
    var cut = token.replace(ENCLITIC, '$1');
    if (cut.length >= 4) token = cut;
  }
  // El español forma DOS plurales: "-s" tras vocal (acta → actas) y "-es"
  // tras consonante (solicitud → solicitudes). Quitar solo la "s" deja
  // "solicitude", que jamás se encuentra con el singular de la base.
  if (token.length > 4 && token.slice(-2) === 'es') token = token.slice(0, -2);
  else if (token.length > 3 && token.charAt(token.length - 1) === 's') token = token.slice(0, -1);
  // Y se cae una "e" final para que ambos caminos converjan:
  // "agentes" → "agent" y "agente" → "agent".
  if (token.length > 4 && token.charAt(token.length - 1) === 'e') token = token.slice(0, -1);
  return token;
}
```

**Los enclíticos son el error que más caro sale en español.** Sin esa regla,
"quiero contactarlos" no encuentra "contactar" y cae al fallback — justo la
intención más valiosa del bot.

El stem resultante no es una palabra real, y **no necesita serlo**: solo tiene
que ser la misma clave para el singular y el plural, del lado de la consulta y
del lado de la base. Un stemmer completo tipo Snowball no paga su complejidad
acá.

### 5.3 Stopwords

```js
var STOP = {};
('de la el los las un una y o que en a al del por para con sin sobre como se ' +
 'su lo le es son ser esta este ese eso muy hay tiene hacer hace me te nos ' +
 'yo vos usted ustedes ' +
 'quiero quisiera necesito busco puedo podria dame decime contame ' +
 'the a an and or of in on at for to with about is are be do does what which ' +
 'who how i you your my we our it its can could would please ' +
 'want need looking show give').split(' ').forEach(function (w) { STOP[w] = 1; });
```

Además de artículos y preposiciones, sacá los **verbos de intención**
("quiero", "necesito", "want"). No aportan tema y ensucian el puntaje.

### 5.4 Índice e IDF

```js
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
```

El IDF sale de la propia base, en tiempo de carga. Un término que aparece en
casi todas las entradas ("sistema") pesa poco; uno que aparece en una sola
("OCR") pesa mucho. Es lo que hace que el matching sea decente sin ajustar
pesos a mano.

### 5.5 Puntuación

```js
// Comparar frases con indexOf sobre el texto crudo hace que una frase corta
// coincida DENTRO de otra palabra. Como la consulta ya viene normalizada a
// palabras separadas por un espacio, alcanza con acolcharla en los bordes.
function hasPhrase(paddedQuery, phrase) {
  // Una frase de UNA palabra es un TEMA, no una intención. Si contara por
  // estar contenida, "capacitacion" dentro de "cuanto sale la capacitacion"
  // le roba el bonus a la intención de precio. Solo cuenta como consulta
  // entera; así "capacitacion" sola sigue funcionando.
  if (phrase.indexOf(' ') === -1) return paddedQuery === ' ' + phrase + ' ';
  return paddedQuery.indexOf(' ' + phrase + ' ') !== -1;
}

function score(entry, tokens, paddedQuery) {
  var hit = 0, total = 0;
  tokens.forEach(function (t) {
    var w = idf(t);
    total += w;
    if (entry._tokens[t]) hit += w;
  });
  if (!total) return 0;

  var coverage = hit / total;

  // Una frase expresa la intención, no solo el tema.
  for (var i = 0; i < entry._phrases.length; i++) {
    if (entry._phrases[i] && hasPhrase(paddedQuery, entry._phrases[i])) {
      coverage += 0.85;
      break;
    }
  }
  return coverage;
}
```

El puntaje es **cobertura**: qué proporción del peso informativo de la pregunta
cubre la entrada. Va de 0 a ~1, más el bonus. Al normalizar por el peso total
de la consulta, el umbral significa lo mismo para preguntas cortas y largas.

### 5.6 Umbral y resolución

```js
var MIN_SCORE = 0.34;

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
```

Bajo el umbral, **el bot dice que no sabe** y ofrece las tres entradas más
cercanas como chips, más la vía de contacto humano. Eso es una feature: es lo
que hace que el bot sea confiable.

---

## 6. Paso 4 — La interfaz

El widget es intercambiable, pero estas seis reglas no son opcionales.

**Seguridad.** El texto del visitante se escribe con `textContent`, **jamás con
`innerHTML`**. Las respuestas de la base sí usan `innerHTML` porque las
escribiste vos. Confundir las dos cosas es un XSS.

```js
function addUser(text) {
  var node = document.createElement('div');
  node.className = 'msg user';
  node.textContent = text;   // nunca innerHTML
  log.appendChild(node);
}
```

**Almacenamiento protegido.** `localStorage` lanza excepción en navegación
privada, con cookies bloqueadas y en orígenes opacos. Envolvé **todos** los
accesos:

```js
function readStore(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function writeStore(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
```

**Accesibilidad.** El panel es `role="dialog"` con `aria-label`; el log es
`role="log" aria-live="polite"`; Escape cierra y devuelve el foco al lanzador;
todo control tiene `:focus-visible` visible.

**Tema.** Definí tokens propios y opacos para el panel. Si el sistema usa
superficies semitransparentes en modo oscuro, un panel flotante que las herede
deja ver la página por detrás.

**Idioma.** Si el sistema es bilingüe, el bot también. Los términos de matching
pueden ser políglotas en la misma entrada (`k` mezcla ES y EN); solo la
respuesta se bifurca. Sale casi gratis.

**Impresión y movimiento.**

```css
@media print { .widget { display: none !important; } }
@media (prefers-reduced-motion: reduce) {
  .widget *, .widget *::after { animation: none !important; transition: none !important; }
}
```

---

## 7. Paso 5 — Integración

1. Copiá `chatbot.js` y `chatbot.css` al sistema destino.
2. Reemplazá la constante `KB` por la base del sistema nuevo.
3. Ajustá `BOT_NAME`, el contacto de fallback y los `CHIP_LABELS`.
4. Mapeá los tokens de color a los del sistema destino.
5. Incluilos en cada página, con versión para romper caché:

```html
<link rel="stylesheet" href="chatbot.css?v=1" />
<script src="chatbot.js?v=1" defer></script>
```

6. **No lo pongas donde estorbe.** Documentos imprimibles, CVs, propuestas
   formales y pantallas de checkout no llevan asistente flotante.

El widget se auto-monta en `DOMContentLoaded` y no exporta nada al scope global
salvo lo que decidas.

---

## 8. Paso 6 — Protocolo de prueba

**Probá por la interfaz real, no llamando a `resolve()`.** El motor está en una
clausura y esa es la forma en que lo va a usar una persona. Este arnés corre en
la consola del navegador:

```js
const EXPECT = [
  ['que servicios ofrecen',        'Seis frentes'],
  ['cuanto sale la capacitacion',  'Depende del servicio'],
  ['quiero contactarlos',          'WhatsApp'],
  ['hacen historias clinicas',     'clínica'],
  ['me gustan las empanadas',      'no lo tengo'],
  ['asdkjhasd',                    'no lo tengo'],
];

const form  = document.querySelector('.ggsbot-form');
const input = document.querySelector('.ggsbot-input');
const log   = document.querySelector('.ggsbot-log');

let pass = 0; const fails = [];
for (const [q, expect] of EXPECT) {
  input.value = q;
  form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  await new Promise(r => setTimeout(r, 500));   // > el delay de "escribiendo"
  const bots = log.querySelectorAll('.ggsbot-msg.bot');
  const a = bots[bots.length - 1].textContent.replace(/\s+/g, ' ').trim();
  if (a.indexOf(expect) !== -1) pass++; else fails.push({ q, expect, got: a.slice(0, 60) });
}
({ total: EXPECT.length, pass, fails });
```

Casos que no pueden faltar:

- Una pregunta por cada entrada de la base.
- **Fuera de dominio** — tiene que caer al fallback, no forzar una respuesta.
- **Ruido** — `asdkjhasd`, cadena vacía, solo signos.
- **Inyección** — `<img src=x onerror=alert(1)>`: verificá que el mensaje del
  usuario quede escapado y que no se cree ningún elemento.
- **Formas coloquiales** — enclíticos, plurales, abreviaturas, sin tildes.
- El idioma secundario completo, si hay.

Cuidado con las aserciones: si esperás `"clinica"` y la respuesta dice
`"clínica"`, falla el test, no el bot.

---

## 9. Ajuste

| Síntoma | Qué tocar |
|---|---|
| Responde bien pero se equivoca de entrada cercana | Agregá términos discriminantes en `k` de la entrada correcta |
| Cae al fallback con preguntas válidas | Bajá `MIN_SCORE` a 0.28, o ampliá `k` |
| Responde cualquier cosa a preguntas fuera de dominio | Subí `MIN_SCORE` a 0.40 |
| Una pregunta explícita pierde contra el tema general | Sumala a `p` de la entrada correcta |
| Una entrada gana siempre | Tiene `k` demasiado amplia, o una frase `p` muy genérica |
| Dos entradas empatan siempre | Están mal separadas: fusionalas, o que la respuesta cubra ambas intenciones |

Cuando dos intenciones conviven de verdad en una pregunta ("cuánto cuesta un
desarrollo a medida" pide precio *y* servicio), **no retuerzas el scorer: hacé
que las dos respuestas contesten bien**. Es más barato y más robusto.

---

## 10. Mantenimiento

La base **es una copia** del contenido del sistema. Se desincroniza sola.

- Cuando cambien precios, planes, clientes o proyectos, actualizá la entrada
  correspondiente en el mismo commit.
- Revisá el tracking de preguntas sin match cada tanto: es la lista de
  intenciones que faltan, gratis y ordenada por demanda real.

```js
window.GGS_track({
  event: 'chatbot_question',
  question: question.slice(0, 80),
  matched: result.entry ? result.entry.id : 'none'
});
```

Filtrando por `matched: 'none'` sale el backlog de la base.

---

## 11. Camino a un LLM

Si el dominio deja de ser cerrado:

1. Levantá el proxy con la clave del lado del servidor, CORS al dominio y rate
   limiting.
2. Reemplazá **solo** `resolve()` por la llamada remota. La interfaz no cambia.
3. Pasá las entradas de la base como contexto recuperado. No las tires: son el
   corpus curado del RAG y ya están escritas en la voz del sistema.
4. Mantené el umbral local como primera capa: lo que la base responde bien no
   necesita ir al modelo. Ahorra latencia y tokens.
5. Conservá la regla de honestidad en el prompt: sin contexto suficiente,
   deriva a contacto humano.

---

## 12. Ejemplo trabajado — portal del Registro Civil

Segunda implementación, sobre un stack distinto: **Next.js Pages Router +
React + MUI + Vitest**, en un portal de gobierno en producción. Sirve como
plantilla de portabilidad.

### 12.1 Cuando el sistema ya tiene contenido aprobado: derivá, no escribas

El portal tenía en `src/content/publicAccess.ts` un catálogo de manuales
públicos, con este comentario:

> *"This catalog is intentionally empty until a content owner approves a
> public, non-sensitive guidance item."*

Es decir: **una compuerta de aprobación de contenido público**. Escribir a mano
las respuestas del bot habría pasado por encima de esa gobernanza.

La solución no fue pedir permiso: fue cambiar la arquitectura. La base **se
deriva** del catálogo aprobado en vez de repetirlo.

```ts
function entriesForManual(manual: PublicSystemManual): KnowledgeEntry[] {
  return [
    { id: manual.id,               answer: [manual.system, manual.purpose, manual.overview].join('\n\n') },
    { id: `${manual.id}-flujos`,   answer: renderWorkflows(manual.workflows) },
    { id: `${manual.id}-estados`,  answer: renderStates(manual.states) },
    // …
  ];
}
```

Tres cosas se ganan de una:

1. El bot **no puede** afirmar nada que un content owner no haya aprobado.
2. Cuando alguien edita el contenido, el bot lo sigue sin tocar código.
3. El vocabulario de matching sigue siendo autoral, pero **nunca se renderiza**,
   así que no afirma nada.

Se comprobó en vivo: a mitad del trabajo ampliaron los manuales con `overview`,
`workflows`, `roleAccess`, `states`, `paymentStates` y `businessRules`. El bot
lo incorporó sin cambiar la lógica — solo hubo que extender la derivación para
exponer los campos nuevos.

### 12.2 Los dos tests que se necesitan cuando la base es derivada

Uno solo no alcanza, y esa es la lección:

| Test | Qué prueba | Qué atrapa |
|---|---|---|
| **Procedencia** | Nada de lo que el bot dice está sin aprobar | Una respuesta inventada |
| **Cobertura** | Nada de lo aprobado queda inalcanzable | Un campo nuevo que la derivación ignora |

Yo tenía solo el de procedencia. Cuando ampliaron los manuales, **siguió en
verde** — porque solo verifica lo que el bot ya dice. El hueco lo encontró el
de cobertura, escrito después:

```ts
it('surfaces every field of every approved manual', () => {
  const allAnswers = knowledgeBase.map((entry) => entry.answer).join('\n');
  const missing: string[] = [];
  for (const manual of publicSystemManuals) {
    if (!allAnswers.includes(manual.overview)) missing.push(`${manual.id}.overview`);
    manual.states.forEach((state, i) => {
      if (!allAnswers.includes(state.description)) missing.push(`${manual.id}.states[${i}]`);
    });
    // …un chequeo por campo
  }
  expect(missing, `contenido aprobado inalcanzable: ${missing.join(', ')}`).toEqual([]);
});
```

### 12.3 Qué cambia al portarlo a React

- **El motor no cambia.** Se tipa y queda como funciones puras, testeables sin
  DOM.
- **Se elimina `innerHTML` por completo.** Las respuestas son texto plano con
  `whiteSpace: 'pre-line'` y la entrada del visitante es un hijo de texto de
  React. No queda superficie de XSS: no hay `dangerouslySetInnerHTML` en
  ninguna parte.
- **Montaje solo de cliente**, con `next/dynamic` y `ssr: false`. Un guard con
  `useState` + `useEffect` también funciona, pero el linter lo marca con razón
  y deja el widget en el bundle del servidor.
- **Los ids de `<defs>` del SVG** se generan con `useId()`: la mascota se dibuja
  dos veces y dos gradientes con el mismo id son HTML inválido.

### 12.4 Una entrada de rechazo, obligatoria en contexto público

Un asistente público que dialoga sobre credenciales entrena a la gente a
divulgarlas. La base lleva una entrada específica para pedidos de contraseñas,
credenciales o datos de terceros, que responde con una negativa y deriva al
canal oficial. Se testea como cualquier otro ruteo.

---

## 13. Errores ya cometidos

Los seis salieron de probar, no de leer el código.

**Un solo plural contemplado.** El stemmer quitaba únicamente la `s` final, que
sirve para los plurales de vocal (`acta` → `actas`) pero no para los de
consonante: `solicitud` → `solicitud**es**` quedaba en `solicitude` y nunca se
encontraba con el singular. En un portal de actas, "solicitudes" es *el*
término central y no matcheaba con nada.

**Un tema ganándole a una intención.** El bonus de frase se otorgaba con solo
estar contenida, así que `"sistema de actas"` —un tema— vencía a la intención
real de la pregunta *"qué reglas tiene el sistema de actas"*. Una frase de una
palabra ahora solo puntúa si es la consulta completa. Es violar la propia regla
del punto anterior: las frases son intención, no tema.

**Frases sin límite de palabra.** El match de frases usaba `indexOf` sobre el
texto crudo, y `"hi"` está dentro de `"historias"`: el bot respondía el saludo
a "hacen historias clínicas". Comparar siempre con los bordes acolchados.

**Enclíticos ignorados.** "quiero contactarlos" no llegaba a la entrada de
contacto. Es la intención más valiosa del bot y se perdía por una regla de
stemming de tres líneas.

**Variables CSS en un SVG que se clona.** La mascota se inserta en el lanzador
y en la cabecera. Con `fill="var(--color)"` definido en un contenedor, cualquier
copia fuera de ese contenedor renderiza **todo negro**: una custom property que
no resuelve invalida la declaración y `fill` cae a su valor inicial. Para un
asset de marca con paleta fija, usá hex literales.

**`localStorage` sin guarda.** Una lectura cruda al principio de un IIFE
compartido tira la ejecución entera en navegación privada. Si además el sistema
usa animaciones de reveal que arrancan en `opacity: 0`, la página queda en
blanco. Verificalo con un `localStorage` que lanza a propósito:

```js
Object.defineProperty(window, 'localStorage', {
  get() { throw new DOMException('blocked', 'SecurityError'); }
});
```

Y medí un indicador que se asigne **al final** del script (una función global,
por ejemplo), no un efecto visual: `IntersectionObserver` no dispara en iframes
fuera de pantalla y te da falsos positivos en las dos direcciones.

---

## Referencia

Dos implementaciones vivas del mismo patrón:

| | Stack | Base de conocimiento |
|---|---|---|
| [`chatbot.js`](../chatbot.js) · [`chatbot.css`](../chatbot.css) | HTML estático, JS sin dependencias | Curada a mano desde el copy del sitio |
| Portal del Registro Civil | Next.js + React + MUI + Vitest | Derivada del catálogo aprobado del propio sistema |

Este documento vive en `_docs/`: Jekyll excluye del sitio publicado los
directorios que empiezan con guión bajo, así que queda versionado en git pero
no se sirve desde ggsoluciones.com.ar.
