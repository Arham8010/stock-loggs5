
import { StockLog, LogSectionType } from "../types";

// Accessing via window because of the external scripts in index.html
declare const jspdf: any;

const generateHeader = (doc: any, log: StockLog, title: string) => {
  doc.setFontSize(20);
  doc.text(title, 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Date: ${log.date}`, 14, 28);
  doc.text(`Author: ${log.author}`, 14, 34);
  doc.text(`Status: ${log.isLocked ? 'Finalized' : 'Draft'}`, 14, 40);
  doc.setDrawColor(230);
  doc.line(14, 45, 196, 45);
  doc.setTextColor(0);
};

export const exportLogToPDF = (log: StockLog) => {
  const doc = new jspdf.jsPDF();
  generateHeader(doc, log, `Full Stock Report`);

  let currentY = 55;
  const sections = [
    LogSectionType.DORI, 
    LogSectionType.WARPIN, 
    LogSectionType.BHEEM, 
    LogSectionType.DELIVERY
  ];

  sections.forEach((section) => {
    const data = log[section];
    if (data.rows.length === 0) return;

    // Check if we need a new page before starting a section
    if (currentY > 230) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(section, 14, currentY);
    currentY += 5;

    const headers = data.columns.map(c => c.header);
    const body = data.rows.map(row => 
      data.columns.map(col => row.values[col.id] || '')
    );

    doc.autoTable({
      startY: currentY,
      head: [headers],
      body: body,
      margin: { left: 14, right: 14 },
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 }
    });

    currentY = doc.lastAutoTable.finalY + 15;
  });

  doc.save(`Full_StockReport_${log.date.replace(/\//g, '-')}.pdf`);
};

export const exportSectionToPDF = (log: StockLog, section: LogSectionType) => {
  const doc = new jspdf.jsPDF();
  generateHeader(doc, log, `${section} Report`);

  const data = log[section];
  if (data.rows.length === 0) {
    doc.setFontSize(12);
    doc.text("No data recorded for this section.", 14, 60);
  } else {
    const headers = data.columns.map(c => c.header);
    const body = data.rows.map(row => 
      data.columns.map(col => row.values[col.id] || '')
    );

    doc.autoTable({
      startY: 55,
      head: [headers],
      body: body,
      margin: { left: 14, right: 14 },
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 10 }
    });
  }

  const filename = `${section.replace(/\s+/g, '_')}_${log.date.replace(/\//g, '-')}.pdf`;
  doc.save(filename);
};
