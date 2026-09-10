import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export const runtime = 'nodejs';

const HARDWARE = [
  'Austausch und Fetten der material pump tubes',
  'Austausch und Fetten der roller pump tubes',
  'Austausch und Fetten der waste pump tube',
  'Austausch und Fetten der vacuum pump tube',
  'Austausch der roller waste collector tubes',
  'Austausch des vacuum filter',
  'Austausch der wiper base',
  'Kontrollieren des Wiper Antriebs',
  'Fetten der Z-axis screws',
  'Austausch der grind wheels und Säuberung des build tray wheel track',
  'Überprüfen der build-tray belt tension',
  'Überprüfen, dass das UV module sauber ist',
  'Überprüfen des roller-waste collector, wenn nötig austauschen',
  'Überprüfen, dass das material cabinet board sauber ist',
  'Überprüfen, dass die Lüfter funktionieren',
  'Austausch des ProAero pre filter, wenn nötig (Vorfiltermatte, weiß)',
  'Austausch leerer Kartuschen',
];

const SOFTWARE = [
  'Kalibrierung des wipers',
  'Ausführen des Vacuum Calibration wizard',
  'Ausführen des Head-filling wizard',
  'Ausführen des Head-purging wizard',
  'Ausführen des Advanced Head Optimization wizard',
  'Zurücksetzen des PM counter bei Nutzung des Preventive Maintenance wizard',
  'Ausführen des Weight sensor calibration wizard',
  'Testdruck mit Wartungswürfel.stl starten',
];

function wrapText(str, font, size, maxWidth) {
  const words = str.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const kunde = searchParams.get('kunde') || '';
  const modell = searchParams.get('modell') || 'JX';
  const seriennummer = searchParams.get('seriennummer') || '';
  const datumParam = searchParams.get('datum') || '';

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();
  const margin = 48;

  function text(str, x, y, opts = {}) {
    page.drawText(str, { x, y, size: opts.size || 10, font: opts.bold ? bold : font, color: rgb(0.11, 0.15, 0.19) });
  }
  function checkbox(x, y) {
    page.drawRectangle({ x, y: y - 1.5, width: 9, height: 9, borderColor: rgb(0.3, 0.34, 0.38), borderWidth: 0.9 });
  }

  let y = height - margin;
  text(`Stratasys ${modell} DentaJet – Wartung`, margin, y, { size: 18, bold: true });
  y -= 14;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: rgb(0.8, 0.82, 0.8) });
  y -= 26;

  const dateLabel = datumParam ? new Date(datumParam + 'T00:00:00').toLocaleDateString('de-DE') : '';
  text('Datum:', margin, y, { size: 10.5, bold: true });
  text(dateLabel, margin + 45, y, { size: 10.5 });
  text('Kunde:', margin + 220, y, { size: 10.5, bold: true });
  text(kunde, margin + 262, y, { size: 10.5 });
  y -= 18;
  text('Seriennummer:', margin, y, { size: 10.5, bold: true });
  text(seriennummer, margin + 85, y, { size: 10.5 });
  y -= 32;

  const colGap = 26;
  const colWidth = (width - margin * 2 - colGap) / 2;
  const col1X = margin;
  const col2X = margin + colWidth + colGap;
  const itemMaxWidth = colWidth - 16;
  const itemSize = 9.5;
  const lineHeight = 15;

  function drawSection(title, items, x, startY) {
    let cy = startY;
    text(title, x, cy, { size: 13, bold: true });
    cy -= 20;
    for (const item of items) {
      const lines = wrapText(item, font, itemSize, itemMaxWidth);
      checkbox(x, cy);
      lines.forEach((line, idx) => {
        text(line, x + 15, cy - idx * (lineHeight - 3), { size: itemSize });
      });
      cy -= lines.length > 1 ? lines.length * (lineHeight - 3) + 6 : lineHeight;
    }
    return cy;
  }

  const y1 = drawSection('Hardware', HARDWARE, col1X, y);
  const y2 = drawSection('Software', SOFTWARE, col2X, y);

  const bottomY = Math.min(y1, y2) - 45;
  const lineWidth = 200;
  page.drawLine({ start: { x: margin, y: bottomY }, end: { x: margin + lineWidth, y: bottomY }, thickness: 0.9, color: rgb(0.3, 0.34, 0.38) });
  page.drawLine({ start: { x: width - margin - lineWidth, y: bottomY }, end: { x: width - margin, y: bottomY }, thickness: 0.9, color: rgb(0.3, 0.34, 0.38) });
  text('Unterschrift Kunde', margin, bottomY - 14, { size: 9 });
  text('Unterschrift Techniker', width - margin - lineWidth, bottomY - 14, { size: 9 });

  const pdfBytes = await pdfDoc.save();
  const safeKunde = (kunde || 'Kunde').replace(/[^a-zA-Z0-9äöüÄÖÜß_-]+/g, '_');
  const filename = `Wartungsprotokoll_${safeKunde}_${datumParam || 'ohne_datum'}.pdf`;

  return new Response(pdfBytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
    },
  });
}
