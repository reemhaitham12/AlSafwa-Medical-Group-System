import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { Invoice, InvoiceItem } from '@/lib/database.types';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { APP_CONFIG } from '@/utils/constants';

// ============================================================================
// A5 Constants (Standard A5: 148 mm × 210 mm)
// At 96 DPI: 148mm = 559.37px (~560px), 210mm = 793.7px (~794px)
// ============================================================================
const A5_WIDTH_PX = 560;
const A5_HEIGHT_PX = 794;
const A5_PAGE_WIDTH_MM = 148;
const A5_PAGE_HEIGHT_MM = 210;

// Usable vertical space per page (leaving 18px top + 24px bottom padding + page indicator)
const A5_USABLE_HEIGHT_PX = 744;

interface PaginatedPageData {
  pageNumber: number;
  items: InvoiceItem[];
  startIndex: number;
  isFirstPage: boolean;
  isFinalPage: boolean;
}

/**
 * Builds the complete horizontal invoice summary, customer account summary,
 * notes, and thank you footer for A5 PDF export.
 *
 * - Row 1: Invoice totals in 1 horizontal row (3 columns: الإجمالي | الخصم | الإجمالي بعد الخصم)
 * - Header: «ملخص حساب العميل»
 * - Row 2: Customer account summary in 1 horizontal row (3 columns: المديونية السابقة | سعر الفاتورة | المجموع المستحق)
 * - Row 3: Notes & thank-you signature
 *
 * All numeric values are explicitly styled in solid pure black (#000000) with bold weight (700 or 900).
 */
function buildHorizontalFooterHtml(invoice: Invoice): string {
  const previousDebt = Number(invoice.previous_debt_snapshot) || 0;
  const finalTotal = Number(invoice.final_total) || 0;
  const totalDue = previousDebt + finalTotal;
  const hasNote = Boolean(invoice.notes && invoice.notes.trim());

  return `
    <div style="border-top: 2px solid #000000; padding-top: 6px; margin-top: 8px; width: 100%; box-sizing: border-box; direction: rtl; font-family: Cairo, system-ui, sans-serif;">
      ${invoice.is_bonus ? `
        <div style="margin-bottom: 5px; padding: 2.5px 6px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 4px; text-align: center; font-size: 8.5px; font-weight: 900; color: #000000; line-height: 1.3;">
          ⭐ فاتورة بونص (مستثناة من المبيعات والمديونية) / BONUS INVOICE
        </div>
      ` : ''}

      <!-- Row 1: Invoice Totals (3 parts in 1 horizontal row) -->
      <div style="display: flex; gap: 5px; width: 100%; box-sizing: border-box;">
        <!-- 1. Subtotal / الإجمالي -->
        <div style="flex: 1; min-width: 0; display: flex; justify-content: space-between; align-items: center; padding: 4.5px 6px; background: #f8fafc; border: 1px solid #334155; border-radius: 4px; box-sizing: border-box;">
          <span style="font-size: 9.5px; font-weight: 600; color: #1e293b; white-space: nowrap;">الإجمالي:</span>
          <span style="font-size: 10.5px; font-weight: 700; color: #000000; white-space: nowrap;">${formatCurrency(invoice.subtotal, true)}</span>
        </div>

        <!-- 2. Discount / الخصم -->
        <div style="flex: 1; min-width: 0; display: flex; justify-content: space-between; align-items: center; padding: 4.5px 6px; background: #f8fafc; border: 1px solid #334155; border-radius: 4px; box-sizing: border-box;">
          <span style="font-size: 9.5px; font-weight: 600; color: #1e293b; white-space: nowrap;">
            الخصم ${invoice.discount_percentage > 0 ? `(${invoice.discount_percentage}%)` : ''}:
          </span>
          <span style="font-size: 10.5px; font-weight: 700; color: #000000; white-space: nowrap;">
            ${invoice.discount_amount > 0 ? `- ${formatCurrency(invoice.discount_amount, true)}` : '0.00 ج.م'}
          </span>
        </div>

        <!-- 3. Final Total / الإجمالي بعد الخصم (Calm soft emerald highlight) -->
        <div style="flex: 1; min-width: 0; display: flex; justify-content: space-between; align-items: center; padding: 4.5px 6px; background: #ecfdf5; border: 1.5px solid #059669; border-radius: 4px; box-sizing: border-box;">
          <span style="font-size: 9.5px; font-weight: 800; color: #064e3b; white-space: nowrap;">الإجمالي بعد الخصم:</span>
          <span style="font-size: 11px; font-weight: 900; color: #000000; white-space: nowrap;">${formatCurrency(invoice.final_total, true)}</span>
        </div>
      </div>

      <!-- Customer Account Summary Header -->
      <div style="margin-top: 5px; padding-top: 4px; border-top: 1px dashed #64748b; display: flex; align-items: center; justify-content: space-between;">
        <span style="font-size: 9px; font-weight: bold; color: #000000; text-transform: uppercase; letter-spacing: 0.02em;">
          ملخص حساب العميل
        </span>
      </div>

      <!-- Row 2: Customer Account Details (3 horizontal columns) -->
      <div style="display: flex; gap: 5px; width: 100%; margin-top: 3px; box-sizing: border-box;">
        <!-- 1. Previous Debt / المديونية السابقة -->
        <div style="flex: 1; min-width: 0; display: flex; justify-content: space-between; align-items: center; padding: 4.5px 6px; background: #f8fafc; border: 1px solid #334155; border-radius: 4px; box-sizing: border-box;">
          <span style="font-size: 9.5px; font-weight: 600; color: #1e293b; white-space: nowrap;">المديونية السابقة:</span>
          <span style="font-size: 10.5px; font-weight: 700; color: #000000; white-space: nowrap;">${formatCurrency(previousDebt, true)}</span>
        </div>

        <!-- 2. Invoice Price / سعر الفاتورة -->
        <div style="flex: 1; min-width: 0; display: flex; justify-content: space-between; align-items: center; padding: 4.5px 6px; background: #f8fafc; border: 1px solid #334155; border-radius: 4px; box-sizing: border-box;">
          <span style="font-size: 9.5px; font-weight: 600; color: #1e293b; white-space: nowrap;">سعر الفاتورة:</span>
          <span style="font-size: 10.5px; font-weight: 700; color: #000000; white-space: nowrap;">${formatCurrency(finalTotal, true)}</span>
        </div>

        <!-- 3. Total Due / المجموع المستحق (Prominently highlighted) -->
        <div style="flex: 1; min-width: 0; display: flex; justify-content: space-between; align-items: center; padding: 4.5px 6px; background: #fef3c7; border: 1.5px solid #d97706; border-radius: 4px; box-sizing: border-box;">
          <span style="font-size: 9.5px; font-weight: 900; color: #78350f; white-space: nowrap;">المجموع المستحق:</span>
          <span style="font-size: 11px; font-weight: 900; color: #000000; white-space: nowrap;">${formatCurrency(totalDue, true)}</span>
        </div>
      </div>

      <!-- Notes and Thank You Row -->
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 5px; padding-top: 4px; border-top: 1px solid #e2e8f0; width: 100%; box-sizing: border-box;">
        ${hasNote ? `
          <div style="flex: 1; border: 1px solid #cbd5e1; border-radius: 4px; padding: 4px 6px; background: #ffffff; text-align: right;">
            <div style="font-weight: bold; color: #000000; font-size: 9px; line-height: 1.3;">الملاحظات / Note:</div>
            <div style="color: #000000; font-size: 8.5px; line-height: 1.35; white-space: pre-wrap; font-weight: 500;">${invoice.notes?.trim()}</div>
          </div>
        ` : '<div></div>'}
        <div style="text-align: left; line-height: 1.3; shrink: 0;">
          <div style="font-size: 9.5px; font-weight: bold; color: #000000;">شكراً لتعاونكم</div>
          <div style="font-size: 8.5px; color: #334155; font-weight: 600;">شركة الصفوة ميديكال جروب</div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Measures the exact heights of invoice components in a 560px sandbox
 * and calculates smart pagination so that:
 * 1. Product rows are NEVER split between pages.
 * 2. The footer is ALWAYS kept as a complete, non-breakable block on the final page.
 * 3. The notes box is ONLY rendered when the invoice actually has a note.
 */
function paginateInvoice(invoice: Invoice): PaginatedPageData[] {
  const items = (invoice.items && Array.isArray(invoice.items)) ? invoice.items : [];
  const hasNote = Boolean(invoice.notes && invoice.notes.trim());

  // 1. Create a measurement sandbox in the DOM
  const sandbox = document.createElement('div');
  sandbox.style.cssText = `
    position: fixed;
    left: -99999px;
    top: 0;
    width: ${A5_WIDTH_PX}px;
    direction: rtl;
    visibility: hidden;
    font-family: Cairo, system-ui, -apple-system, sans-serif;
    box-sizing: border-box;
    padding: 0;
    margin: 0;
  `;
  document.body.appendChild(sandbox);

  try {
    // Measure Page 1 static elements (Full Header + Customer Box + Table Header)
    const p1StaticWrap = document.createElement('div');
    p1StaticWrap.innerHTML = `
      <div style="border-bottom: 2px solid #0284c7; padding-bottom: 8px; margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <span style="font-size: 16px; font-weight: 900; color: #0f172a; line-height: 1.4;">${APP_CONFIG.nameAr}</span>
            <div style="font-size: 9.5px; color: #64748b; line-height: 1.4; margin-top: 2px;">القاهرة - مصر | مستلزمات GPL</div>
          </div>
          <div style="text-align: left;">
            <span style="font-size: 12px; font-family: monospace; font-weight: 700; background: #f1f5f9; padding: 3px 8px; border-radius: 4px; border: 1px solid #cbd5e1; color: #000000; line-height: 1.4;">${invoice.invoice_number}</span>
            <div style="font-size: 9.5px; color: #475569; margin-top: 4px; line-height: 1.4;">تاريخ الإصدار: <span style="color: #000000; font-weight: 600;">${formatDate(invoice.created_at, true)}</span></div>
          </div>
        </div>
      </div>
      <div style="background: #f8fafc; border-radius: 6px; padding: 7px 12px; border: 1px solid #cbd5e1; margin-bottom: 8px; font-size: 11px; line-height: 1.5; display: flex; justify-content: space-between; align-items: center;">
        <div><strong style="color: #475569;">اسم العميل:</strong> <span style="font-weight: bold; color: #0f172a; margin-right: 4px;">${invoice.customer_name_snapshot || 'عميل نقدي'}</span></div>
        ${invoice.customer?.phone ? `<div><strong style="color: #475569;">الهاتف:</strong> <span style="font-weight: 700; color: #000000; margin-right: 4px;">${invoice.customer.phone}</span></div>` : ''}
      </div>
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #334155; font-size: 11px;">
        <thead>
          <tr style="background: #f1f5f9; font-weight: bold; border-bottom: 1.5px solid #334155;">
            <th style="padding: 7px 6px; width: 28px; text-align: center; border: 1px solid #334155; line-height: 1.4; vertical-align: middle;">#</th>
            <th style="padding: 7px 8px; text-align: right; border: 1px solid #334155; line-height: 1.4; vertical-align: middle;">الصنف</th>
            <th style="padding: 7px 6px; width: 44px; text-align: center; border: 1px solid #334155; line-height: 1.4; vertical-align: middle;">الكمية</th>
            <th style="padding: 7px 8px; width: 75px; text-align: right; border: 1px solid #334155; line-height: 1.4; vertical-align: middle;">سعر الوحدة</th>
            <th style="padding: 7px 8px; width: 85px; text-align: left; border: 1px solid #334155; line-height: 1.4; vertical-align: middle;">السعر الإجمالي</th>
          </tr>
        </thead>
      </table>
    `;
    sandbox.appendChild(p1StaticWrap);
    const p1StaticHeight = p1StaticWrap.offsetHeight;
    sandbox.removeChild(p1StaticWrap);

    // Measure Subsequent Page static elements (Sub-header + Table Header)
    const subStaticWrap = document.createElement('div');
    subStaticWrap.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; margin-bottom: 8px; font-size: 11px; line-height: 1.4;">
        <span style="font-weight: bold; color: #000000;">${APP_CONFIG.nameAr} — ${invoice.invoice_number}</span>
        <span style="font-size: 10px; color: #64748b; font-family: monospace;">متابعة الأصناف</span>
      </div>
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #334155; font-size: 11px;">
        <thead>
          <tr style="background: #f1f5f9; font-weight: bold; border-bottom: 1.5px solid #334155;">
            <th style="padding: 7px 6px; width: 28px; text-align: center; border: 1px solid #334155; line-height: 1.4; vertical-align: middle;">#</th>
            <th style="padding: 7px 8px; text-align: right; border: 1px solid #334155; line-height: 1.4; vertical-align: middle;">الصنف</th>
            <th style="padding: 7px 6px; width: 44px; text-align: center; border: 1px solid #334155; line-height: 1.4; vertical-align: middle;">الكمية</th>
            <th style="padding: 7px 8px; width: 75px; text-align: right; border: 1px solid #334155; line-height: 1.4; vertical-align: middle;">سعر الوحدة</th>
            <th style="padding: 7px 8px; width: 85px; text-align: left; border: 1px solid #334155; line-height: 1.4; vertical-align: middle;">السعر الإجمالي</th>
          </tr>
        </thead>
      </table>
    `;
    sandbox.appendChild(subStaticWrap);
    const subStaticHeight = subStaticWrap.offsetHeight;
    sandbox.removeChild(subStaticWrap);

    // Measure Complete Horizontal Footer Block (includes invoice totals & account summary)
    const footerWrap = document.createElement('div');
    footerWrap.innerHTML = buildHorizontalFooterHtml(invoice);
    sandbox.appendChild(footerWrap);
    const footerHeight = footerWrap.offsetHeight + 10; // includes small safety buffer
    sandbox.removeChild(footerWrap);

    // Measure each product row height dynamically
    const tableWrap = document.createElement('table');
    tableWrap.style.cssText = 'width: 100%; border-collapse: collapse; font-size: 11px;';
    const tbody = document.createElement('tbody');
    tableWrap.appendChild(tbody);

    items.forEach((item, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="padding: 6.5px 6px; width: 28px; text-align: center; border: 1px solid #334155; font-family: monospace; font-size: 10px; font-weight: 700; color: #000000; line-height: 1.5; vertical-align: middle;">${idx + 1}</td>
        <td style="padding: 6.5px 8px; text-align: right; border: 1px solid #334155; font-weight: bold; font-size: 11px; word-break: break-word; line-height: 1.5; vertical-align: middle;">${item.product_name_snapshot}</td>
        <td style="padding: 6.5px 6px; width: 44px; text-align: center; border: 1px solid #334155; font-weight: 700; color: #000000; font-size: 11px; line-height: 1.5; vertical-align: middle;">${item.quantity}</td>
        <td style="padding: 6.5px 8px; width: 75px; text-align: right; border: 1px solid #334155; font-weight: 700; color: #000000; font-size: 11px; line-height: 1.5; vertical-align: middle;">${formatCurrency(item.unit_price, true)}</td>
        <td style="padding: 6.5px 8px; width: 85px; text-align: left; border: 1px solid #334155; font-weight: 700; color: #000000; font-size: 11px; line-height: 1.5; vertical-align: middle;">${formatCurrency(item.total, true)}</td>
      `;
      tbody.appendChild(tr);
    });

    sandbox.appendChild(tableWrap);
    const rowHeights: number[] = Array.from(tbody.querySelectorAll('tr')).map(
      (r) => (r as HTMLElement).offsetHeight
    );
    sandbox.removeChild(tableWrap);

    // 2. Perform Smart Pagination Partition
    const pages: PaginatedPageData[] = [];
    const totalItemsCount = items.length;

    if (totalItemsCount === 0) {
      pages.push({
        pageNumber: 1,
        items: [],
        startIndex: 0,
        isFirstPage: true,
        isFinalPage: true,
      });
      return pages;
    }

    let currentIndex = 0;
    let pageNum = 1;

    while (currentIndex < totalItemsCount) {
      const isFirst = pageNum === 1;
      const staticH = isFirst ? p1StaticHeight : subStaticHeight;
      // Usable height remaining for rows on this page (leaving space for bottom page number)
      const availableH = A5_USABLE_HEIGHT_PX - staticH - 16;

      // Check if ALL remaining items plus the footer can fit on this page
      let remainingH = 0;
      for (let j = currentIndex; j < totalItemsCount; j++) {
        remainingH += rowHeights[j];
      }

      if (remainingH + footerHeight <= availableH) {
        // Fits completely on this final page!
        pages.push({
          pageNumber: pageNum,
          items: items.slice(currentIndex),
          startIndex: currentIndex,
          isFirstPage: isFirst,
          isFinalPage: true,
        });
        currentIndex = totalItemsCount;
        break;
      }

      // If they cannot all fit with footer, fill this page with as many rows as possible
      let currentH = 0;
      const pageRows: InvoiceItem[] = [];
      const pageStartIdx = currentIndex;

      while (currentIndex < totalItemsCount) {
        const nextH = rowHeights[currentIndex];

        // Do not place the very last item on this page if it leaves no room for the footer on this page,
        // so that the next page will have at least 1 row + the complete footer.
        if (
          currentIndex === totalItemsCount - 1 &&
          pageRows.length > 0 &&
          currentH + nextH + footerHeight > availableH
        ) {
          break;
        }

        if (currentH + nextH <= availableH) {
          currentH += nextH;
          pageRows.push(items[currentIndex]);
          currentIndex++;
        } else {
          // If no row fit at all (e.g. huge text), ensure at least 1 row is included
          if (pageRows.length === 0) {
            pageRows.push(items[currentIndex]);
            currentIndex++;
          }
          break;
        }
      }

      pages.push({
        pageNumber: pageNum,
        items: pageRows,
        startIndex: pageStartIdx,
        isFirstPage: isFirst,
        isFinalPage: currentIndex >= totalItemsCount,
      });

      pageNum++;
    }

    return pages;
  } finally {
    if (sandbox.parentNode) {
      sandbox.parentNode.removeChild(sandbox);
    }
  }
}

/**
 * Builds the complete DOM tree for a single A5 invoice page.
 * Uses exact fixed pixel dimensions (560px × 794px) and compact styling.
 */
function createA5PageElement(
  invoice: Invoice,
  pageData: PaginatedPageData,
  totalPages: number
): HTMLElement {
  const page = document.createElement('div');
  page.className = 'a5-invoice-page';
  page.style.cssText = `
    width: ${A5_WIDTH_PX}px;
    height: ${A5_HEIGHT_PX}px;
    box-sizing: border-box;
    background-color: #ffffff;
    color: #0f172a;
    direction: rtl;
    padding: 18px 20px 24px 20px;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    overflow: hidden;
    position: relative;
    font-family: Cairo, system-ui, -apple-system, sans-serif;
  `;

  // 1. Header Section
  if (pageData.isFirstPage) {
    const p1Header = document.createElement('div');
    p1Header.style.cssText = 'border-bottom: 2px solid #0284c7; padding-bottom: 8px; margin-bottom: 8px; width: 100%;';
    p1Header.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <div style="width: 24px; height: 24px; background: #0284c7; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;">+</div>
            <h1 style="margin: 0; font-size: 16px; font-weight: 900; color: #0f172a; line-height: 1.4;">${APP_CONFIG.nameAr}</h1>
          </div>
          <div style="font-size: 9.5px; color: #64748b; margin-top: 2px; line-height: 1.4;">القاهرة - مصر | مستلزمات GPL</div>
        </div>
        <div style="text-align: left;">
          <div style="display: flex; align-items: center; gap: 4px; justify-content: flex-end;">
            ${invoice.is_bonus ? `
              <span style="font-size: 9.5px; font-weight: 900; background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; border: 1px solid #f59e0b; line-height: 1.3;">
                ⭐ بونص
              </span>
            ` : ''}
            <span style="font-size: 12px; font-family: monospace; font-weight: 700; background: #f1f5f9; padding: 3px 8px; border-radius: 4px; border: 1px solid #cbd5e1; color: #000000; line-height: 1.4;">
              ${invoice.invoice_number}
            </span>
          </div>
          <div style="font-size: 9.5px; color: #475569; margin-top: 4px; line-height: 1.4;">
            تاريخ الإصدار: <span style="color: #000000; font-weight: 600;">${formatDate(invoice.created_at, true)}</span>
          </div>
        </div>
      </div>
    `;
    page.appendChild(p1Header);

    // Customer Information Box
    const custBox = document.createElement('div');
    custBox.style.cssText = 'background: #f8fafc; border-radius: 6px; padding: 7px 12px; border: 1px solid #cbd5e1; margin-bottom: 8px; font-size: 11px; line-height: 1.5; display: flex; justify-content: space-between; align-items: center; width: 100%; box-sizing: border-box;';
    custBox.innerHTML = `
      <div><span style="color: #64748b;">اسم العميل:</span> <strong style="color: #0f172a; margin-right: 4px;">${invoice.customer_name_snapshot || 'عميل نقدي'}</strong></div>
      ${invoice.customer?.phone ? `<div><span style="color: #64748b;">الهاتف:</span> <strong style="color: #000000; font-weight: 700; margin-right: 4px;">${invoice.customer.phone}</strong></div>` : ''}
    `;
    page.appendChild(custBox);
  } else {
    // Sub-header for subsequent pages
    const subHeader = document.createElement('div');
    subHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; margin-bottom: 8px; font-size: 11px; line-height: 1.4; width: 100%;';
    subHeader.innerHTML = `
      <span style="font-weight: bold; color: #000000;">${APP_CONFIG.nameAr} — فاتورة رقم ${invoice.invoice_number}</span>
      <span style="font-size: 10px; color: #64748b; font-family: monospace;">(متابعة أصناف الفاتورة)</span>
    `;
    page.appendChild(subHeader);
  }

  // 2. Table
  const table = document.createElement('table');
  table.style.cssText = 'width: 100%; border-collapse: collapse; border: 1px solid #334155; font-size: 11px; box-sizing: border-box;';
  table.innerHTML = `
    <thead>
      <tr style="background: #f1f5f9; font-weight: bold; border-bottom: 1.5px solid #334155;">
        <th style="padding: 7px 6px; width: 28px; text-align: center; border: 1px solid #334155; line-height: 1.4; vertical-align: middle;">#</th>
        <th style="padding: 7px 8px; text-align: right; border: 1px solid #334155; line-height: 1.4; vertical-align: middle;">الصنف</th>
        <th style="padding: 7px 6px; width: 44px; text-align: center; border: 1px solid #334155; line-height: 1.4; vertical-align: middle;">الكمية</th>
        <th style="padding: 7px 8px; width: 75px; text-align: right; border: 1px solid #334155; line-height: 1.4; vertical-align: middle;">سعر الوحدة</th>
        <th style="padding: 7px 8px; width: 85px; text-align: left; border: 1px solid #334155; line-height: 1.4; vertical-align: middle;">السعر الإجمالي</th>
      </tr>
    </thead>
  `;

  const tbody = document.createElement('tbody');
  if (pageData.items.length > 0) {
    pageData.items.forEach((item, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="padding: 6.5px 6px; width: 28px; text-align: center; border: 1px solid #334155; font-family: monospace; font-size: 10px; font-weight: 700; color: #000000; line-height: 1.5; vertical-align: middle;">
          ${pageData.startIndex + idx + 1}
        </td>
        <td style="padding: 6.5px 8px; text-align: right; border: 1px solid #334155; font-weight: bold; color: #0f172a; word-break: break-word; line-height: 1.5; vertical-align: middle;">
          ${item.product_name_snapshot}
        </td>
        <td style="padding: 6.5px 6px; width: 44px; text-align: center; border: 1px solid #334155; font-weight: 700; color: #000000; line-height: 1.5; vertical-align: middle;">
          ${item.quantity}
        </td>
        <td style="padding: 6.5px 8px; width: 75px; text-align: right; border: 1px solid #334155; font-weight: 700; color: #000000; line-height: 1.5; vertical-align: middle;">
          ${formatCurrency(item.unit_price, true)}
        </td>
        <td style="padding: 6.5px 8px; width: 85px; text-align: left; border: 1px solid #334155; font-weight: 700; color: #000000; line-height: 1.5; vertical-align: middle;">
          ${formatCurrency(item.total, true)}
        </td>
      `;
      tbody.appendChild(tr);
    });
  } else {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="5" style="padding: 14px 10px; text-align: center; color: #64748b; border: 1px solid #334155; line-height: 1.5;">لا توجد أصناف مسجلة</td>';
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  page.appendChild(table);

  // 3. Footer: Horizontal invoice totals + account summary + notes/signature
  if (pageData.isFinalPage) {
    const footerDiv = document.createElement('div');
    footerDiv.className = 'invoice-footer';
    footerDiv.innerHTML = buildHorizontalFooterHtml(invoice);
    page.appendChild(footerDiv);
  }

  // 4. Page numbering indicator at very bottom of paper
  const pageNumDiv = document.createElement('div');
  pageNumDiv.style.cssText = 'position: absolute; bottom: 8px; left: 0; width: 100%; text-align: center; font-size: 9px; font-family: monospace; color: #64748b;';
  pageNumDiv.textContent = `صفحة ${pageData.pageNumber} من ${totalPages}`;
  page.appendChild(pageNumDiv);

  return page;
}

/**
 * Renders an invoice into one or more A5 pages inside an off-screen sandbox
 * and adds each page directly to the jsPDF document.
 */
async function appendInvoiceToA5Pdf(
  invoice: Invoice,
  pdf: jsPDF,
  isFirstPageOfDocument: boolean
): Promise<boolean> {
  const pagesData = paginateInvoice(invoice);
  const totalPages = pagesData.length;

  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    position: fixed;
    left: -99999px;
    top: 0;
    width: ${A5_WIDTH_PX}px;
    direction: rtl;
    background-color: #ffffff;
    z-index: -9999;
  `;
  document.body.appendChild(wrapper);

  try {
    let isFirst = isFirstPageOfDocument;

    for (let p = 0; p < totalPages; p++) {
      const pageEl = createA5PageElement(invoice, pagesData[p], totalPages);
      wrapper.appendChild(pageEl);

      const canvas = await html2canvas(pageEl, {
        scale: 2.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: A5_WIDTH_PX,
        windowWidth: A5_WIDTH_PX,
      });

      const imgData = canvas.toDataURL('image/png');

      if (!isFirst) {
        pdf.addPage('a5', 'portrait');
      }

      pdf.addImage(imgData, 'PNG', 0, 0, A5_PAGE_WIDTH_MM, A5_PAGE_HEIGHT_MM);
      isFirst = false;

      wrapper.removeChild(pageEl);
    }

    return isFirst;
  } finally {
    if (wrapper.parentNode) {
      wrapper.parentNode.removeChild(wrapper);
    }
  }
}

/**
 * Downloads a single invoice as an A5 PDF with smart pagination.
 * If passed a DOM element ID (such as 'printable-stock-order'), falls back
 * to capturing that element in A4 for complete backward compatibility.
 */
export async function downloadInvoicePDF(
  invoiceOrElementId: Invoice | string,
  fileName: string = 'Invoice.pdf'
): Promise<void> {
  // Backward compatibility: If an element ID is passed for Stock Orders
  if (typeof invoiceOrElementId === 'string' && invoiceOrElementId === 'printable-stock-order') {
    const el = document.getElementById(invoiceOrElementId);
    if (!el) throw new Error(`Element "${invoiceOrElementId}" not found`);

    const canvas = await html2canvas(el, { scale: 2.5, useCORS: true, backgroundColor: '#ffffff' });
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const imgData = canvas.toDataURL('image/png');
    const imgHeight = (canvas.height * 210) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, 210, Math.min(imgHeight, 297));
    pdf.save(fileName);
    return;
  }

  // If a string element ID was passed for invoice, attempt to find the invoice object
  let invoice: Invoice;
  if (typeof invoiceOrElementId === 'string') {
    throw new Error('Please pass the invoice object to downloadInvoicePDF for A5 export');
  } else {
    invoice = invoiceOrElementId;
  }

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5',
  });

  await appendInvoiceToA5Pdf(invoice, pdf, true);
  pdf.save(fileName);
}

/**
 * Generates ONE multi-page PDF containing all invoices on A5 paper.
 * Each invoice begins on a NEW A5 page.
 * Long invoices consume multiple A5 pages as needed without footer splitting.
 */
export async function downloadAllInvoicesPDF(
  invoicesOrContainerId: Invoice[] | string,
  fileName: string = 'AlSafwa-All-Invoices.pdf',
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  let invoices: Invoice[];

  if (Array.isArray(invoicesOrContainerId)) {
    invoices = invoicesOrContainerId;
  } else {
    throw new Error('Please pass the array of invoices to downloadAllInvoicesPDF');
  }

  if (invoices.length === 0) {
    throw new Error('No invoices to export');
  }

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5',
  });

  let isFirstPage = true;

  for (let i = 0; i < invoices.length; i++) {
    const inv = invoices[i];
    if (onProgress) {
      onProgress(i + 1, invoices.length);
    }

    // appendInvoiceToA5Pdf returns whether the next call would be on the first page
    isFirstPage = await appendInvoiceToA5Pdf(inv, pdf, isFirstPage);
  }

  pdf.save(fileName);
}
