import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * High-fidelity, deterministic A4 PDF generator for the Product Demand & Stock Distribution Report.
 * Renders each 2x2 grid A4 page at high resolution (scale: 2.2) and bundles them into a multi-page A4 PDF.
 */
export async function downloadDemandDistributionPDF(
  containerElementId: string = 'printable-demand-report',
  fileName: string = 'Product_Demand_Distribution_Report.pdf',
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const container = document.getElementById(containerElementId);
  if (!container) {
    throw new Error(`Demand Distribution Report: Element with id "${containerElementId}" not found`);
  }

  // Find all individual A4 page elements inside the report container
  const pageElements = Array.from(
    container.querySelectorAll<HTMLElement>('.a4-report-page')
  );

  if (pageElements.length === 0) {
    throw new Error('لا توجد صفحات في تقرير توزيع الأصناف للتحميل');
  }

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const PAGE_WIDTH_MM = 210;
  const PAGE_HEIGHT_MM = 297;
  const FIXED_WIDTH_PX = 794;
  const FIXED_HEIGHT_PX = 1123;

  // We temporarily isolate each page in a fixed-width container off-screen
  // to ensure identical font rendering regardless of user zoom or viewport width.
  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-99999px';
  wrapper.style.top = '0';
  wrapper.style.width = `${FIXED_WIDTH_PX}px`;
  wrapper.style.direction = 'rtl';
  wrapper.style.backgroundColor = '#ffffff';
  wrapper.style.fontFamily = 'Cairo, system-ui, -apple-system, sans-serif';
  wrapper.style.zIndex = '-9999';
  document.body.appendChild(wrapper);

  try {
    for (let i = 0; i < pageElements.length; i++) {
      if (onProgress) {
        onProgress(i + 1, pageElements.length);
      }

      const origPage = pageElements[i];
      const clone = origPage.cloneNode(true) as HTMLElement;
      clone.style.width = `${FIXED_WIDTH_PX}px`;
      clone.style.maxWidth = `${FIXED_WIDTH_PX}px`;
      clone.style.height = `${FIXED_HEIGHT_PX}px`;
      clone.style.maxHeight = `${FIXED_HEIGHT_PX}px`;
      clone.style.margin = '0';
      clone.style.boxSizing = 'border-box';

      // Hide any buttons or screen-only controls in clone
      const screenOnly = clone.querySelectorAll('.print\\:hidden');
      screenOnly.forEach((el) => {
        (el as HTMLElement).style.display = 'none';
      });

      wrapper.appendChild(clone);

      const canvas = await html2canvas(clone, {
        scale: 2.2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: FIXED_WIDTH_PX,
        windowWidth: FIXED_WIDTH_PX,
      });

      const imgData = canvas.toDataURL('image/png');

      if (i > 0) {
        pdf.addPage('a4', 'portrait');
      }

      pdf.addImage(imgData, 'PNG', 0, 0, PAGE_WIDTH_MM, PAGE_HEIGHT_MM);

      wrapper.removeChild(clone);
    }

    pdf.save(fileName);
  } finally {
    if (wrapper.parentNode) {
      wrapper.parentNode.removeChild(wrapper);
    }
  }
}
