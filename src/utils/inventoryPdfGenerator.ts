import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Dedicated PDF generator for the Products & Inventory report.
 * Completely separate from downloadInvoicePDF (pdfGenerator.ts).
 * Snapshots a DOM element with id="printable-inventory" and saves as A4 PDF.
 */
export async function downloadInventoryPDF(
  elementId: string = 'printable-inventory',
  fileName: string = 'Inventory_Report.pdf'
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Inventory PDF: Element with id "${elementId}" not found`);
  }

  // High-resolution capture for crisp Arabic text on A4
  const canvas = await html2canvas(element, {
    scale: 2.5,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    // Ensure the full element is captured even if it overflows viewport
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
  });

  const imgData = canvas.toDataURL('image/png');

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;   // A4 width in mm
  const pageHeight = 297;  // A4 height in mm
  const margin = 0;

  const imgWidthMm = pageWidth - margin * 2;
  const imgHeightMm = (canvas.height * imgWidthMm) / canvas.width;

  if (imgHeightMm <= pageHeight) {
    // Content fits on one page
    pdf.addImage(imgData, 'PNG', margin, margin, imgWidthMm, imgHeightMm);
  } else {
    // Multi-page: slice the canvas across pages
    let yOffset = 0;
    const pageHeightPx = (pageHeight * canvas.width) / pageWidth;

    while (yOffset < canvas.height) {
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = Math.min(pageHeightPx, canvas.height - yOffset);

      const ctx = sliceCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(canvas, 0, -yOffset);
      }

      const sliceData = sliceCanvas.toDataURL('image/png');
      const sliceHeightMm = (sliceCanvas.height * imgWidthMm) / canvas.width;

      if (yOffset > 0) {
        pdf.addPage();
      }
      pdf.addImage(sliceData, 'PNG', margin, margin, imgWidthMm, sliceHeightMm);
      yOffset += pageHeightPx;
    }
  }

  pdf.save(fileName);
}
