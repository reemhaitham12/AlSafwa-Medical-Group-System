import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Dedicated deterministic PDF generator for the Products & Inventory report.
 * Guarantees identical layout on mobile and desktop by rendering inside an
 * off-screen fixed-width container (794px = A4 portrait at 96 DPI).
 */
export async function downloadInventoryPDF(
  elementId: string = 'printable-inventory',
  fileName: string = 'Inventory_Report.pdf'
): Promise<void> {
  const originalElement = document.getElementById(elementId);
  if (!originalElement) {
    throw new Error(`Inventory PDF: Element with id "${elementId}" not found`);
  }

  // Standard A4 width in px at 96 DPI (210mm * 96 / 25.4 = 793.7px)
  const FIXED_WIDTH_PX = 794;

  // Create isolated off-screen wrapper with deterministic fixed width
  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-99999px';
  wrapper.style.top = '0';
  wrapper.style.width = `${FIXED_WIDTH_PX}px`;
  wrapper.style.minWidth = `${FIXED_WIDTH_PX}px`;
  wrapper.style.maxWidth = `${FIXED_WIDTH_PX}px`;
  wrapper.style.backgroundColor = '#ffffff';
  wrapper.style.direction = 'rtl';
  wrapper.style.zIndex = '-9999';
  wrapper.style.boxSizing = 'border-box';
  wrapper.style.margin = '0';
  wrapper.style.padding = '0';

  // Clone element to prevent interfering with visible DOM
  const clone = originalElement.cloneNode(true) as HTMLElement;
  clone.style.width = `${FIXED_WIDTH_PX}px`;
  clone.style.minWidth = `${FIXED_WIDTH_PX}px`;
  clone.style.maxWidth = `${FIXED_WIDTH_PX}px`;
  clone.style.margin = '0';
  clone.style.boxSizing = 'border-box';

  // Hide screen-only interactive elements (actions column, buttons, inline expanded batches) in the clone
  const screenOnly = clone.querySelectorAll('.print\\:hidden');
  screenOnly.forEach((el) => {
    (el as HTMLElement).style.display = 'none';
  });

  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  try {
    const canvas = await html2canvas(clone, {
      scale: 2.5,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: FIXED_WIDTH_PX,
      windowWidth: FIXED_WIDTH_PX,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidthMm = 210;  // A4 width in mm
    const pageHeightMm = 297; // A4 height in mm
    const imgHeightMm = (canvas.height * pageWidthMm) / canvas.width;

    if (imgHeightMm <= pageHeightMm) {
      // Content fits on one page
      pdf.addImage(imgData, 'PNG', 0, 0, pageWidthMm, imgHeightMm);
    } else {
      // Multi-page: slice the canvas across pages
      let yOffset = 0;
      const pageHeightPx = (pageHeightMm * canvas.width) / pageWidthMm;

      while (yOffset < canvas.height) {
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = Math.min(pageHeightPx, canvas.height - yOffset);

        const ctx = sliceCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(canvas, 0, -yOffset);
        }

        const sliceData = sliceCanvas.toDataURL('image/png');
        const sliceHeightMm = (sliceCanvas.height * pageWidthMm) / canvas.width;

        if (yOffset > 0) {
          pdf.addPage();
        }
        pdf.addImage(sliceData, 'PNG', 0, 0, pageWidthMm, sliceHeightMm);
        yOffset += pageHeightPx;
      }
    }

    pdf.save(fileName);
  } finally {
    if (wrapper.parentNode) {
      wrapper.parentNode.removeChild(wrapper);
    }
  }
}
