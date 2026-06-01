const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel, BorderStyle,
  WidthType, ShadingType, VerticalAlign, PageNumber, TabStopType, TabStopPosition,
} = require("docx");

const NAVY = "0F1C2E";
const PRIMARY = "1A4FA0";
const ACCENT = "2F80ED";
const MUTED = "5A6E85";
const LIGHT = "EDF2F9";

const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: "D5DEE9" };
const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };
const cellMargins = { top: 100, bottom: 100, left: 140, right: 140 };

// helpers
const h1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] });
const h2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const p = (t, opts = {}) =>
  new Paragraph({ spacing: { after: 140, line: 276 }, ...opts, children: [new TextRun({ text: t, color: opts.color })] });
const bullet = (t) =>
  new Paragraph({ numbering: { reference: "bul", level: 0 }, spacing: { after: 60, line: 276 }, children: [new TextRun(t)] });
const small = (t, color = MUTED) =>
  new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: t, size: 18, color })] });

function labelCell(text, w) {
  return new TableCell({
    borders, width: { size: w, type: WidthType.DXA }, margins: cellMargins,
    shading: { fill: LIGHT, type: ShadingType.CLEAR },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: NAVY })] })],
  });
}
function valCell(runs, w, opts = {}) {
  return new TableCell({
    borders, width: { size: w, type: WidthType.DXA }, margins: cellMargins,
    shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
    children: Array.isArray(runs) ? runs : [new Paragraph({ children: [new TextRun({ text: runs, color: NAVY, bold: opts.bold })] })],
  });
}

const doc = new Document({
  creator: "GG Soluciones",
  title: "Propuesta — Acompañamiento en la Modernización de Sistemas",
  styles: {
    default: { document: { run: { font: "Arial", size: 21, color: NAVY } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Arial", color: PRIMARY },
        paragraph: { spacing: { before: 300, after: 160 }, outlineLevel: 0,
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: ACCENT, space: 4 } } } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 23, bold: true, font: "Arial", color: NAVY },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 } },
    ],
  },
  numbering: {
    config: [
      { reference: "bul", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 560, hanging: 280 } } } }] },
      { reference: "steps", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 560, hanging: 280 } } } }] },
    ],
  },
  sections: [{
    properties: {
      page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
    },
    headers: {
      default: new Header({ children: [
        new Paragraph({
          tabStops: [{ type: TabStopType.RIGHT, position: 9360 }],
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "D5DEE9", space: 6 } },
          children: [
            new TextRun({ text: "GG Soluciones", bold: true, color: PRIMARY, size: 20 }),
            new TextRun({ text: "  ·  Desarrollo & Consultoría IT", color: MUTED, size: 18 }),
            new TextRun({ text: "\tSan Salvador de Jujuy", color: MUTED, size: 18 }),
          ],
        }),
      ] }),
    },
    footers: {
      default: new Footer({ children: [
        new Paragraph({
          tabStops: [{ type: TabStopType.RIGHT, position: 9360 }],
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: "D5DEE9", space: 6 } },
          children: [
            new TextRun({ text: "ggsoluciones.com.ar  ·  WhatsApp +54 9 388 512 0704", color: MUTED, size: 16 }),
            new TextRun({ text: "\tPágina ", color: MUTED, size: 16 }),
            new TextRun({ children: [PageNumber.CURRENT], color: MUTED, size: 16 }),
          ],
        }),
      ] }),
    },
    children: [
      // ── TÍTULO ──
      new Paragraph({ spacing: { before: 200, after: 40 }, children: [
        new TextRun({ text: "PROPUESTA DE SERVICIOS PROFESIONALES", color: ACCENT, bold: true, size: 18 }),
      ] }),
      new Paragraph({ spacing: { after: 60 }, children: [
        new TextRun({ text: "Acompañamiento en la Modernización de Sistemas", bold: true, size: 36, color: NAVY }),
      ] }),
      new Paragraph({ spacing: { after: 240 }, children: [
        new TextRun({ text: "Modalidad de acompañamiento guiado — el equipo ejecuta, nosotros guiamos", italics: true, color: MUTED, size: 20 }),
      ] }),

      // ── DATOS ──
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2400, 6960],
        rows: [
          new TableRow({ children: [labelCell("Destinatario", 2400), valCell("Ministerio de Hacienda", 6960)] }),
          new TableRow({ children: [labelCell("Atención", 2400), valCell("Santiago Besin", 6960)] }),
          new TableRow({ children: [labelCell("Oferente", 2400), valCell("GG Soluciones — CUIT 20-34005631-1", 6960)] }),
          new TableRow({ children: [labelCell("Lugar y fecha", 2400), valCell("San Salvador de Jujuy, 29 de mayo de 2026", 6960)] }),
          new TableRow({ children: [labelCell("Validez", 2400), valCell("10 días hábiles desde la fecha de emisión", 6960)] }),
        ],
      }),
      new Paragraph({ spacing: { after: 120 } }),

      // ── 1. CONTEXTO ──
      h1("1. Contexto y objetivo"),
      p("El Ministerio de Hacienda se encuentra en proceso de modernización de uno de sus sistemas internos. La intención es que el equipo propio lleve adelante la ejecución del trabajo, fortaleciendo sus capacidades, con el acompañamiento de un profesional senior que aporte criterio técnico, metodología y revisión en cada decisión relevante."),
      p("El objetivo de esta propuesta es brindar ese acompañamiento técnico-estratégico durante las etapas de análisis y diseño de la modernización, de modo que el equipo avance con seguridad, evite retrabajos y consolide conocimiento propio aplicable a iniciativas futuras."),

      // ── 2. MODALIDAD ──
      h1("2. Modalidad de trabajo"),
      p("El servicio se presta bajo una modalidad de acompañamiento guiado: la ejecución permanece en manos del equipo del Ministerio, mientras que GG Soluciones interviene como guía técnica. No se trata de un desarrollo llave en mano, sino de un proceso de mentoring orientado a que el equipo gane autonomía."),
      bullet("Sesiones de trabajo en vivo con el equipo, con foco en análisis, diseño y decisiones técnicas."),
      bullet("Revisión de los avances producidos por el equipo entre sesiones."),
      bullet("Aporte de estándares, buenas prácticas y criterios de arquitectura."),
      bullet("Transferencia de conocimiento continua durante todo el período."),

      // ── 3. ALCANCE ──
      h1("3. Alcance del acompañamiento"),
      h2("Incluye"),
      bullet("Análisis del sistema interno actual junto al equipo."),
      bullet("Diseño de la arquitectura y definición técnica de la modernización, en forma compartida."),
      bullet("Lineamientos de buenas prácticas, estándares y criterios de calidad."),
      bullet("Revisión técnica y funcional de los avances del equipo."),
      bullet("Acompañamiento en la priorización y el ordenamiento del trabajo."),
      bullet("Recomendaciones documentadas y minutas de las decisiones tomadas."),
      h2("No incluye"),
      bullet("Desarrollo o implementación de software por parte de GG Soluciones."),
      bullet("Operación, soporte o mantenimiento de los sistemas."),
      bullet("Provisión de infraestructura, licencias o servicios de terceros."),

      // ── 4. METODOLOGÍA ──
      h1("4. Metodología por etapas"),
      new Paragraph({ numbering: { reference: "steps", level: 0 }, spacing: { after: 60 },
        children: [new TextRun({ text: "Relevamiento: ", bold: true }), new TextRun("comprensión del sistema actual, necesidades y objetivos de la modernización.")] }),
      new Paragraph({ numbering: { reference: "steps", level: 0 }, spacing: { after: 60 },
        children: [new TextRun({ text: "Análisis y diseño: ", bold: true }), new TextRun("definición de la arquitectura objetivo, criterios técnicos y plan de trabajo, junto al equipo.")] }),
      new Paragraph({ numbering: { reference: "steps", level: 0 }, spacing: { after: 60 },
        children: [new TextRun({ text: "Acompañamiento de la ejecución: ", bold: true }), new TextRun("revisión de avances, resolución de dudas y ajuste de decisiones a medida que el equipo ejecuta.")] }),
      new Paragraph({ numbering: { reference: "steps", level: 0 }, spacing: { after: 140 },
        children: [new TextRun({ text: "Cierre y transferencia: ", bold: true }), new TextRun("consolidación de lo aprendido y recomendaciones para la continuidad.")] }),

      // ── 5. DEDICACIÓN ──
      h1("5. Dedicación y duración"),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [3000, 6360],
        rows: [
          new TableRow({ children: [labelCell("Frecuencia", 3000), valCell("2 sesiones semanales de 1,5 horas cada una", 6360)] }),
          new TableRow({ children: [labelCell("Modalidad", 3000), valCell("Remota (videollamada) o presencial a coordinar", 6360)] }),
          new TableRow({ children: [labelCell("Trabajo entre sesiones", 3000), valCell("Análisis, diseño y revisión de los avances del equipo", 6360)] }),
          new TableRow({ children: [labelCell("Duración estimada", 3000), valCell("2 a 3 meses, según el ritmo de avance del equipo", 6360)] }),
        ],
      }),
      new Paragraph({ spacing: { after: 120 } }),

      // ── 6. ENTREGABLES ──
      h1("6. Entregables"),
      bullet("Documento de análisis del sistema actual."),
      bullet("Diseño de arquitectura objetivo y definición técnica."),
      bullet("Minutas de decisiones y recomendaciones por sesión."),
      bullet("Informe de cierre con próximos pasos sugeridos."),

      // ── 7. INVERSIÓN ──
      h1("7. Inversión"),
      p("Los valores se expresan en pesos argentinos. El servicio se factura de forma mensual."),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [3400, 4060, 1900],
        rows: [
          new TableRow({ children: [
            new TableCell({ borders, width: { size: 3400, type: WidthType.DXA }, margins: cellMargins, shading: { fill: PRIMARY, type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Concepto", bold: true, color: "FFFFFF" })] })] }),
            new TableCell({ borders, width: { size: 4060, type: WidthType.DXA }, margins: cellMargins, shading: { fill: PRIMARY, type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Detalle", bold: true, color: "FFFFFF" })] })] }),
            new TableCell({ borders, width: { size: 1900, type: WidthType.DXA }, margins: cellMargins, shading: { fill: PRIMARY, type: ShadingType.CLEAR },
              children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Valor", bold: true, color: "FFFFFF" })] })] }),
          ] }),
          new TableRow({ children: [
            labelCell("Honorario mensual", 3400),
            valCell("Acompañamiento guiado: 2 sesiones semanales de 1,5 h + análisis, diseño y revisión", 4060),
            new TableCell({ borders, width: { size: 1900, type: WidthType.DXA }, margins: cellMargins,
              children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "$1.500.000", bold: true, color: NAVY })] })] }),
          ] }),
          new TableRow({ children: [
            labelCell("Duración estimada", 3400),
            valCell("2 a 3 meses", 4060),
            new TableCell({ borders, width: { size: 1900, type: WidthType.DXA }, margins: cellMargins,
              children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "—", color: MUTED })] })] }),
          ] }),
          new TableRow({ children: [
            new TableCell({ borders, width: { size: 3400, type: WidthType.DXA }, margins: cellMargins, shading: { fill: LIGHT, type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Inversión total estimada", bold: true, color: NAVY })] })] }),
            new TableCell({ borders, width: { size: 4060, type: WidthType.DXA }, margins: cellMargins, shading: { fill: LIGHT, type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: "Según la duración que se acuerde", color: NAVY })] })] }),
            new TableCell({ borders, width: { size: 1900, type: WidthType.DXA }, margins: cellMargins, shading: { fill: LIGHT, type: ShadingType.CLEAR },
              children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "$3.000.000 a $4.500.000", bold: true, color: PRIMARY })] })] }),
          ] }),
        ],
      }),
      small("Los valores no contemplan impuestos que pudieran corresponder según la condición fiscal del oferente. Sujeto a la condición fiscal de GG Soluciones — a confirmar.", MUTED),
      new Paragraph({ spacing: { after: 120 } }),

      // ── 8. CONDICIONES ──
      h1("8. Condiciones generales"),
      bullet("Facturación mensual, por mes adelantado o vencido según se acuerde."),
      bullet("Las sesiones se coordinan con el equipo en horarios fijos semanales."),
      bullet("La duración puede ajustarse según el ritmo de avance, con acuerdo previo."),
      bullet("La presente propuesta tiene una validez de 10 días hábiles."),

      // ── CIERRE ──
      new Paragraph({ spacing: { before: 260, after: 120 }, children: [
        new TextRun({ text: "Quedamos a disposición para ampliar cualquier punto de la presente propuesta y coordinar una reunión de presentación.", color: NAVY }),
      ] }),
    ],
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync("_propuesta/Propuesta-Acompanamiento-Modernizacion-Hacienda.docx", buf);
  console.log("OK");
});
