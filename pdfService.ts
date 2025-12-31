import { StockLog, LogSectionType } from "./types";

// Accessing via window because of the external scripts in index.html
declare const jspdf: any;

export const exportLogToPDF = (log: StockLog) => {
  const doc = new jspdf.jsPDF();
  
  // Title
  doc.setFontSize(20);
  doc.text(Stock Log Report - ${log.date}, 14, 20);
  
  doc.setFontSize(12);
  doc.text(Author: ${log.author}, 14, 30);
  doc.text(Status: ${log.isLocked ? 'Locked' : 'Open'}, 14, 37);

  let currentY = 50;

  const sections = [
    LogSectionType.DORI, 
    LogSectionType.WARPIN, 
    LogSectionType.BHEEM, 
    LogSectionType.DELIVERY
  ];

  sections.forEach((section) => {
    const data = log[section];
    if (data.rows.length === 0) return;

    doc.setFontSize(14);
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
      margin: { top: 10 },
      theme: 'striped'
    });

    currentY = doc.lastAutoTable.finalY + 15;
    
    // Check if we need a new page
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }
  });

  doc.save(StockLog_${log.date.replace(/\//g, '-')}.pdf);
};
