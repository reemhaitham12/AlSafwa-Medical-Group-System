import type { ProductDemandReportItem } from '@/services/productDemandService';

export interface QuadrantBlock {
  blockId: string;
  productId: string;
  productName: string;
  productCode: string | null;
  itemNumber: number | null;
  totalRequested: number;
  currentStock: number;
  incoming: number;
  netShortage: number;
  status: 'shortage' | 'surplus' | 'covered';
  customerRows: {
    customerName: string;
    invoiceNumber: string;
    quantity: number;
    isBonus: boolean;
  }[];
  chunkIndex: number;
  totalChunks: number;
  isContinued: boolean;
  hasMoreChunks: boolean;
  chunkSubtotal: number;
  isPlaceholder?: boolean;
}

export interface ReportA4Page {
  pageNumber: number;
  totalPages: number;
  quadrants: QuadrantBlock[]; // Exactly 4 quadrants (2 columns x 2 rows)
}

/**
 * Maximum customer rows per quadrant card to guarantee clean, readable font size
 * and strictly prevent overflow outside the quadrant boundaries.
 */
export const MAX_CUSTOMER_ROWS_PER_QUADRANT = 8;

/**
 * Partitions products into quadrant blocks and distributes them across A4 pages
 * in a strict 2-column x 2-row grid (exactly 4 quadrants per A4 page).
 *
 * Overflow behavior:
 * - If a product's customer rows exceed MAX_CUSTOMER_ROWS_PER_QUADRANT, it is safely
 *   chunked without clipping or omitting rows.
 * - The continuation chunk is clearly flagged as `isContinued: true` and marked as `(تابع)`.
 * - Product sections that fit in one quadrant are never split across pages.
 * - Each page always contains exactly 4 quadrant slots to maintain the 2x2 grid layout.
 */
export function paginateProductDemandReport(
  items: ProductDemandReportItem[],
  maxRowsPerQuadrant: number = MAX_CUSTOMER_ROWS_PER_QUADRANT
): ReportA4Page[] {
  if (!items || items.length === 0) {
    return [];
  }

  // 1. Convert each product item into 1 or more QuadrantBlocks
  const allBlocks: QuadrantBlock[] = [];

  items.forEach((item) => {
    const rows = item.customerRows || [];

    if (rows.length <= maxRowsPerQuadrant) {
      // Product fits entirely in one quadrant
      allBlocks.push({
        blockId: `${item.productId}-c0`,
        productId: item.productId,
        productName: item.productName,
        productCode: item.productCode,
        itemNumber: item.itemNumber,
        totalRequested: item.totalRequested,
        currentStock: item.currentStock,
        incoming: item.incoming,
        netShortage: item.netShortage,
        status: item.status,
        customerRows: rows,
        chunkIndex: 0,
        totalChunks: 1,
        isContinued: false,
        hasMoreChunks: false,
        chunkSubtotal: item.totalRequested,
        isPlaceholder: false,
      });
    } else {
      // Product has more customer rows than fit in a single quadrant.
      // Chunk safely across quadrants/pages.
      const totalChunks = Math.ceil(rows.length / maxRowsPerQuadrant);

      for (let c = 0; c < totalChunks; c++) {
        const slice = rows.slice(c * maxRowsPerQuadrant, (c + 1) * maxRowsPerQuadrant);
        const chunkSubtotal = slice.reduce((acc, r) => acc + r.quantity, 0);

        allBlocks.push({
          blockId: `${item.productId}-c${c}`,
          productId: item.productId,
          productName: item.productName,
          productCode: item.productCode,
          itemNumber: item.itemNumber,
          totalRequested: item.totalRequested,
          currentStock: item.currentStock,
          incoming: item.incoming,
          netShortage: item.netShortage,
          status: item.status,
          customerRows: slice,
          chunkIndex: c,
          totalChunks,
          isContinued: c > 0,
          hasMoreChunks: c < totalChunks - 1,
          chunkSubtotal,
          isPlaceholder: false,
        });
      }
    }
  });

  // 2. Distribute blocks into A4 pages (exactly 4 quadrants per page)
  const QUADRANTS_PER_PAGE = 4;
  const totalPages = Math.ceil(allBlocks.length / QUADRANTS_PER_PAGE) || 1;
  const pages: ReportA4Page[] = [];

  for (let p = 0; p < totalPages; p++) {
    const pageBlocks = allBlocks.slice(p * QUADRANTS_PER_PAGE, (p + 1) * QUADRANTS_PER_PAGE);

    // If the last page has fewer than 4 blocks, pad with formatted placeholder quadrants
    // to strictly preserve the 2x2 grid geometry.
    while (pageBlocks.length < QUADRANTS_PER_PAGE) {
      pageBlocks.push({
        blockId: `placeholder-p${p}-${pageBlocks.length}`,
        productId: '',
        productName: '',
        productCode: null,
        itemNumber: null,
        totalRequested: 0,
        currentStock: 0,
        incoming: 0,
        netShortage: 0,
        status: 'covered',
        customerRows: [],
        chunkIndex: 0,
        totalChunks: 1,
        isContinued: false,
        hasMoreChunks: false,
        chunkSubtotal: 0,
        isPlaceholder: true,
      });
    }

    pages.push({
      pageNumber: p + 1,
      totalPages,
      quadrants: pageBlocks,
    });
  }

  // Update totalPages on all pages once finalized
  pages.forEach((page) => {
    page.totalPages = pages.length;
  });

  return pages;
}
