import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { buildEquipmentReturnDocumentModel } from './equipmentReturns';

export function generateEquipmentReturnPdf(record) {
  const model = buildEquipmentReturnDocumentModel(record);
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });

  drawLetterhead(pdf, model);

  let cursorY = 40;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text(model.title, 105, cursorY, { align: 'center' });

  cursorY += 8;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10.5);
  pdf.text(`Atendente: ${model.attendantLabel}`, 20, cursorY);
  pdf.text(`Data e horario: ${model.issuedAtLabel}`, 190, cursorY, { align: 'right' });

  cursorY += 6;
  autoTable(pdf, {
    startY: cursorY,
    body: model.customerRows,
    theme: 'grid',
    styles: {
      fontSize: 10,
      cellPadding: 3,
      lineColor: [214, 223, 237],
      lineWidth: 0.2,
      textColor: [15, 23, 42],
    },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [241, 245, 249], cellWidth: 35 },
      1: { cellWidth: 135 },
    },
    margin: { left: 20, right: 20 },
  });

  cursorY = pdf.lastAutoTable.finalY + 8;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text('Equipamentos devolvidos', 20, cursorY);

  cursorY += 4;
  autoTable(pdf, {
    startY: cursorY,
    head: [['Apelido', 'Tipo', 'Marca / Modelo', 'Identificador', 'Codigo']],
    body: model.equipmentRows.length ? model.equipmentRows : [['-', '-', '-', '-', '-']],
    theme: 'grid',
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontSize: 9.5,
    },
    styles: {
      fontSize: 9.2,
      cellPadding: 3,
      lineColor: [214, 223, 237],
      lineWidth: 0.2,
      textColor: [15, 23, 42],
    },
    margin: { left: 20, right: 20 },
  });

  cursorY = pdf.lastAutoTable.finalY + 10;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10.5);
  const declarationLines = pdf.splitTextToSize(model.declarationText, 170);
  pdf.text(declarationLines, 20, cursorY);

  cursorY += declarationLines.length * 5 + 18;
  drawSignatureLines(pdf, cursorY, model.signatures);
  drawFooter(pdf, model);

  const contractNumber = String(record?.customer?.contractNumber || 'sem-contrato')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .toLowerCase();
  pdf.save(`Termo_Devolucao_${contractNumber}.pdf`);
}

function drawLetterhead(pdf, model) {
  pdf.setFillColor(15, 23, 42);
  pdf.rect(0, 0, 210, 20, 'F');
  pdf.setFillColor(37, 99, 235);
  pdf.rect(0, 20, 210, 6, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(16);
  pdf.text(model.companyName, 20, 13);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9.5);
  pdf.text('Comprovante formal de devolucao de equipamentos', 190, 13, { align: 'right' });
  pdf.setTextColor(15, 23, 42);
}

function drawSignatureLines(pdf, y, signatures) {
  const leftX = 28;
  const rightX = 118;
  const lineWidth = 64;

  pdf.line(leftX, y, leftX + lineWidth, y);
  pdf.line(rightX, y, rightX + lineWidth, y);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text(signatures[0] || 'Assinatura do Atendente', leftX + lineWidth / 2, y + 6, { align: 'center' });
  pdf.text(signatures[1] || 'Assinatura do Cliente / Responsavel', rightX + lineWidth / 2, y + 6, { align: 'center' });
}

function drawFooter(pdf, model) {
  pdf.setDrawColor(203, 213, 225);
  pdf.line(20, 282, 190, 282);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(100, 116, 139);
  pdf.text(model.footerText, 20, 287);
  pdf.text('Oquei Telecom', 190, 287, { align: 'right' });
  pdf.setTextColor(15, 23, 42);
}
