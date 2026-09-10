import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { createClient } from '@supabase/supabase-js';
import { HARDWARE_ITEMS, SOFTWARE_ITEMS } from '../../../lib/wartungsChecklist';

export const runtime = 'nodejs';

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
  const id = searchParams.get('id');

  let kunde = '';
  let modell = 'JX';
  let seriennummer = '';
  let datumParam = '';
  let techniker = '';
  let notiz = '';
  let hardwareChecked = null; // null = leere Vorlage
  let softwareChecked = null;

  if (id) {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { data, error } = await supabase.from('wartung_protokolle').select('*').eq('id', id).single();
    if (error || !data) {
      return new Response('Protokoll nicht gefunden', { status: 404 });
    }
    kunde = data.kunde || '';
    modell = data.modell || 'JX';
    seriennummer = data.seriennummer || '';
    datumParam = data.datum || '';
    techniker = data.techniker || '';
    notiz = data.notiz || '';
    hardwareChecked = Array.isArray(data.hardware) ? data.hardware : [];
    softwareChecked = Array.isArray(data.software) ? data.software : [];
  } else {
    kunde = searchParams.get('kunde') || '';
    modell = searchParams.get('modell') || 'JX';
    seriennummer = searchParams.get('seriennummer') || '';
    datumParam = searchParams.get('datum') || '';
  }

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();
  const margin = 48;

  function text(str, x, y, opts = {}) {
    page.drawText(str, { x, y, size: opts.size || 10, font: opts.bold ? bold : font, color: rgb(0.11, 0.15, 0.19) });
  }
  function checkbox(x, y, checked) {
    page.drawRectangle({ x, y: y - 1.5, width: 9, height: 9, borderColor: rgb(0.3, 0.34, 0.38), borderWidth: 0.9 });
    if (checked) {
      page.drawLine({ start: { x: x + 1.3, y: y + 2 }, end: { x: x + 3.7, y: y - 0.3 }, thickness: 1.3, color: rgb(0.17, 0.43, 0.39) });
      page.drawLine({ start: { x: x + 3.7, y: y - 0.3 }, end: { x: x + 8, y: y + 6.5 }, thickness: 1.3, color: rgb(0.17, 0.43, 0.39) });
    }
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
  if (techniker) {
    text('Techniker:', margin + 220, y, { size: 10.5, bold: true });
    text(techniker, margin + 275, y, { size: 10.5 });
  }
  y -= 32;

  const colGap = 26;
  const colWidth = (width - margin * 2 - colGap) / 2;
  const col1X = margin;
  const col2X = margin + colWidth + colGap;
  const itemMaxWidth = colWidth - 16;
  const itemSize = 9.5;
  const lineHeight = 15;

  function drawSection(title, items, checkedArr, x, startY) {
    let cy = startY;
    text(title, x, cy, { size: 13, bold: true });
    cy -= 20;
    items.forEach((item, idx) => {
      const checked = checkedArr ? !!checkedArr[idx] : false;
      const lines = wrapText(item, font, itemSize, itemMaxWidth);
      checkbox(x, cy, checked);
      lines.forEach((line, li) => {
        text(line, x + 15, cy - li * (lineHeight - 3), { size: itemSize });
      });
      cy -= lines.length > 1 ? lines.length * (lineHeight - 3) + 6 : lineHeight;
    });
    return cy;
  }

  const y1 = drawSection('Hardware', HARDWARE_ITEMS, hardwareChecked, col1X, y);
  const y2 = drawSection('Software', SOFTWARE_ITEMS, softwareChecked, col2X, y);

  let bottomY = Math.min(y1, y2) - 20;

  if (notiz) {
    text('Notiz:', margin, bottomY, { size: 9.5, bold: true });
    const notizLines = wrapText(notiz, font, 9.5, width - margin * 2 - 45);
    notizLines.forEach((line, idx) => text(line, margin + 42, bottomY - idx * 13, { size: 9.5 }));
    bottomY -= notizLines.length * 13 + 20;
  } else {
    bottomY -= 20;
  }

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
