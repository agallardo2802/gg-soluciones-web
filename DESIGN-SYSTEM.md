# Design System — Corporate Trust & Innovation

> Generado con Google Stitch para GG Soluciones. Base del rediseño visual del sitio.

## Marca y estilo

Sistema diseñado para proyectar **autoridad, fiabilidad y vanguardia tecnológica**. Equilibra la solidez de una consultoría tradicional con la agilidad de una empresa tecnológica moderna. Estética **Corporate Modern**: legibilidad extrema y estructura organizada que reduce la carga cognitiva.

Tono visual limpio y aireado. El espacio en blanco es herramienta de jerarquía, no solo respiro. Respuesta emocional buscada: seguridad y profesionalismo absoluto ("Estás en buenas manos").

## Colores

| Token | Valor | Uso |
|-------|-------|-----|
| Primary (Deep Corporate Blue) | `#1a4fa0` | Estructura, textos primarios, autoridad |
| Accent (Modern Bright Blue) | `#2f80ed` | Acción, elementos interactivos |
| Tertiary (Success Green) | `#22c55e` | Feedback positivo |
| Background | `#f5f7fa` | Fondo base (gris azulado claro) |
| Surface (cards) | `#ffffff` | Tarjetas y superficies |
| Error | `#ba1a1a` | Errores |

## Tipografía — Inter

Seleccionada por su naturaleza sistemática y legibilidad excepcional en pantallas. Comunica claridad y precisión técnica.

| Nivel | Tamaño | Peso | Line-height |
|-------|--------|------|-------------|
| headline-xl | 48px | 700 | 56px (-0.02em) |
| headline-lg | 32px | 700 | 40px (-0.01em) |
| headline-md | 24px | 600 | 32px |
| body-lg | 18px | 400 | 28px |
| body-md | 16px | 400 | 24px |
| label-md | 14px | 500 | 20px |
| label-sm | 12px | 600 | 16px (0.05em) |

Titulares en peso 700 con tracking negativo. Cuerpo con interlineado generoso (1.5x).

## Layout y espaciado

Grilla fluida basada en unidad de **8px**.

- **Desktop:** márgenes 48px, gutters 24px, ancho máx 1200px
- **Tablet:** grilla 8 col, márgenes 32px
- **Mobile:** grilla 4 col, márgenes 16px
- **Vertical entre secciones:** 80px – 120px

## Elevación

Capas tonales + sombras ambientales suaves. Los elementos "flotan" sutilmente.

| Nivel | Sombra |
|-------|--------|
| 0 — Fondo | plano `#f5f7fa` |
| 1 — Tarjetas | `0 4px 20px rgba(26,79,160,0.05)` |
| 2 — Hover | `0 12px 32px rgba(26,79,160,0.12)` |
| 3 — Modales/Nav | `0 24px 48px rgba(0,0,0,0.08)` |

Evitar bordes oscuros: usar bordes de 1px al 10% de opacidad del primario.

## Formas

Lenguaje amable y orgánico.

- Contenedores/tarjetas: **16px (1rem)**
- Botones/inputs: **8px**
- Acentos: formas circulares ocasionales

## Componentes

- **Botones primarios:** acento `#2f80ed`, texto blanco, padding 12px/24px. Hover: degradado acento → primario.
- **Tarjetas:** fondo blanco, esquinas 16px, sombra Nivel 1, borde fino `1px #e1e8f0`.
- **Inputs:** fondo blanco, borde gris suave, radio 8px. Focus: borde acento + glow 3px baja opacidad.
- **Chips/etiquetas:** fondo semi-transparente del color (10% opacidad), texto en color sólido.
- **Listas de servicios:** iconos lineales (2px), titulares en peso 600.
