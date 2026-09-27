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

// Usable vertical space per page (leaving 18px top + 26px bottom padding)
const A5_USABLE_HEIGHT_PX = 750;

interface PaginatedPageData {
  pageNumber: number;
  items: InvoiceItem[];
  startIndex: number;
  isFirstPage: boolean;
  isFinalPage: boolean;
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
      <div style="border-bottom: 2px solid #0284c7; padding-bottom: 6px; margin-bottom: 6px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <span style="font-size: 16px; font-weight: 900; color: #0f172a;">${APP_CONFIG.nameAr}</span>
            <div style="font-size: 9.5px; color: #64748b;">القاهرة - مصر | مستلزمات GPL</div>
          </div>
          <div style="text-align: left;">
            <span style="font-size: 12px; font-family: monospace; font-weight: bold; background: #f1f5f9; padding: 2px 8px; border-radius: 4px; border: 1px solid #cbd5e1;">${invoice.invoice_number}</span>
            <div style="font-size: 9.5px; color: #475569; margin-top: 3px;">تاريخ الإصدار: ${formatDate(invoice.created_at, true)}</div>
          </div>
        </div>
      </div>
      <div style="background: #f8fafc; border-radius: 6px; padding: 6px 10px; border: 1px solid #cbd5e1; margin-bottom: 6px; font-size: 11px; display: flex; justify-content: space-between;">
        <div><strong>اسم العميل:</strong> ${invoice.customer_name_snapshot || 'عميل نقدي'}</div>
        ${invoice.customer?.phone ? `<div><strong>الهاتف:</strong> ${invoice.customer.phone}</div>` : ''}
      </div>
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #0f172a; font-size: 11px;">
        <thead>
          <tr style="background: #f1f5f9; font-weight: bold; border-bottom: 1px solid #0f172a;">
            <th style="padding: 4px 6px; width: 28px; text-align: center; border: 1px solid #0f172a;">#</th>
            <th style="padding: 4px 8px; text-align: right; border: 1px solid #0f172a;">الصنف</th>
            <th style="padding: 4px 6px; width: 44px; text-align: center; border: 1px solid #0f172a;">الكمية</th>
            <th style="padding: 4px 6px; width: 75px; text-align: right; border: 1px solid #0f172a;">سعر الوحدة</th>
            <th style="padding: 4px 6px; width: 85px; text-align: left; border: 1px solid #0f172a;">السعر الإجمالي</th>
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
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 6px; font-size: 11px;">
        <span style="font-weight: bold; color: #1e293b;">${APP_CONFIG.nameAr} — ${invoice.invoice_number}</span>
        <span style="font-size: 10px; color: #64748b; font-family: monospace;">متابعة الأصناف</span>
      </div>
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #0f172a; font-size: 11px;">
        <thead>
          <tr style="background: #f1f5f9; font-weight: bold; border-bottom: 1px solid #0f172a;">
            <th style="padding: 4px 6px; width: 28px; text-align: center; border: 1px solid #0f172a;">#</th>
            <th style="padding: 4px 8px; text-align: right; border: 1px solid #0f172a;">الصنف</th>
            <th style="padding: 4px 6px; width: 44px; text-align: center; border: 1px solid #0f172a;">الكمية</th>
            <th style="padding: 4px 6px; width: 75px; text-align: right; border: 1px solid #0f172a;">سعر الوحدة</th>
            <th style="padding: 4px 6px; width: 85px; text-align: left; border: 1px solid #0f172a;">السعر الإجمالي</th>
          </tr>
        </thead>
      </table>
    `;
    sandbox.appendChild(subStaticWrap);
    const subStaticHeight = subStaticWrap.offsetHeight;
    sandbox.removeChild(subStaticWrap);

    // Measure Complete Footer Block
    const footerWrap = document.createElement('div');
    footerWrap.innerHTML = `
      <div style="border-top: 2px solid #0f172a; padding-top: 8px; margin-top: 12px; width: 100%; box-sizing: border-box;">
        ${hasNote ? `
          <div style="display: flex; gap: 8px; align-items: stretch; justify-content: space-between; width: 100%;">
            <div style="flex: 1; border: 1px solid #0f172a; border-radius: 6px; padding: 6px 8px; font-size: 10px; display: flex; flex-direction: column; justify-content: space-between; background: #ffffff;">
              <div>
                <div style="font-weight: bold; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px; margin-bottom: 4px; font-size: 10.5px;">الملاحظات / Note:</div>
                <div style="color: #334155; line-height: 1.35; white-space: pre-wrap; font-size: 9.5px;">${invoice.notes?.trim()}</div>
              </div>
              <div style="border-top: 1px solid #e2e8f0; padding-top: 4px; margin-top: 6px; text-align: center;">
                <div style="font-weight: bold; color: #0f172a; font-size: 10px;">شكراً لتعاونكم</div>
                <div style="font-size: 9px; color: #475569;">شركة الصفوة ميديكال جروب</div>
              </div>
            </div>
            <div style="width: 210px; shrink: 0; background: #f8fafc; border: 1px solid #0f172a; border-radius: 6px; padding: 6px 8px; font-size: 11px;">
              <div style="display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 1px solid #e2e8f0;">
                <span style="color: #475569;">الإجمالي:</span>
                <span style="font-weight: bold; color: #0f172a;">${formatCurrency(invoice.subtotal, true)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 1px solid #e2e8f0;">
                <span style="color: #475569;">الخصم ${invoice.discount_percentage > 0 ? `(${invoice.discount_percentage}%)` : ''}:</span>
                <span style="font-weight: bold; color: #92400e;">${invoice.discount_amount > 0 ? `- ${formatCurrency(invoice.discount_amount, true)}` : '0.00 ج.م'}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 4px 6px; background: #dcfce7; border: 1px solid #16a34a; border-radius: 4px; font-weight: 900; margin-top: 4px;">
                <span>الإجمالي بعد الخصم:</span>
                <span style="color: #166534; font-size: 12px;">${formatCurrency(invoice.final_total, true)}</span>
              </div>
              ${invoice.is_bonus ? `
                <div style="margin-top: 4px; padding: 2px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 4px; text-align: center; font-size: 9px; font-weight: 900; color: #92400e;">
                  ⭐ BONUS / بونص
                </div>
              ` : ''}
            </div>
          </div>
        ` : `
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; width: 100%;">
            <div style="text-align: right;">
              <div style="font-size: 11px; font-weight: bold; color: #0f172a;">شكراً لتعاونكم</div>
              <div style="font-size: 10px; color: #475569;">شركة الصفوة ميديكال جروب</div>
            </div>
            <div style="width: 220px; shrink: 0; background: #f8fafc; border: 1px solid #0f172a; border-radius: 6px; padding: 6px 8px; font-size: 11px;">
              <div style="display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 1px solid #e2e8f0;">
                <span style="color: #475569;">الإجمالي:</span>
                <span style="font-weight: bold; color: #0f172a;">${formatCurrency(invoice.subtotal, true)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 1px solid #e2e8f0;">
                <span style="color: #475569;">الخصم ${invoice.discount_percentage > 0 ? `(${invoice.discount_percentage}%)` : ''}:</span>
                <span style="font-weight: bold; color: #92400e;">${invoice.discount_amount > 0 ? `- ${formatCurrency(invoice.discount_amount, true)}` : '0.00 ج.م'}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 4px 6px; background: #dcfce7; border: 1px solid #16a34a; border-radius: 4px; font-weight: 900; margin-top: 4px;">
                <span>الإجمالي بعد الخصم:</span>
                <span style="color: #166534; font-size: 12px;">${formatCurrency(invoice.final_total, true)}</span>
              </div>
              ${invoice.is_bonus ? `
                <div style="margin-top: 4px; padding: 2px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 4px; text-align: center; font-size: 9px; font-weight: 900; color: #92400e;">
                  ⭐ BONUS / بونص
                </div>
              ` : ''}
            </div>
          </div>
        `}
      </div>
    `;
    sandbox.appendChild(footerWrap);
    const footerHeight = footerWrap.offsetHeight + 14; // includes margin-top (12px) + small buffer
    sandbox.removeChild(footerWrap);

    // Measure each product row height dynamically
    const tableWrap = document.createElement('table');
    tableWrap.style.cssText = 'width: 100%; border-collapse: collapse; font-size: 11px;';
    const tbody = document.createElement('tbody');
    tableWrap.appendChild(tbody);

    items.forEach((item, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="padding: 4px 6px; width: 28px; text-align: center; border: 1px solid #0f172a;">${idx + 1}</td>
        <td style="padding: 4px 8px; text-align: right; border: 1px solid #0f172a; font-weight: bold; word-break: break-word;">${item.product_name_snapshot}</td>
        <td style="padding: 4px 6px; width: 44px; text-align: center; border: 1px solid #0f172a; font-weight: bold;">${item.quantity}</td>
        <td style="padding: 4px 6px; width: 75px; text-align: right; border: 1px solid #0f172a;">${formatCurrency(item.unit_price, true)}</td>
        <td style="padding: 4px 6px; width: 85px; text-align: left; border: 1px solid #0f172a; font-weight: bold;">${formatCurrency(item.total, true)}</td>
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
  const hasNote = Boolean(invoice.notes && invoice.notes.trim());

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
    p1Header.style.cssText = 'border-bottom: 2px solid #0284c7; padding-bottom: 6px; margin-bottom: 6px; width: 100%;';
    p1Header.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <div style="width: 24px; height: 24px; background: #0284c7; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;">+</div>
            <h1 style="margin: 0; font-size: 16px; font-weight: 900; color: #0f172a;">${APP_CONFIG.nameAr}</h1>
          </div>
          <div style="font-size: 9.5px; color: #64748b; margin-top: 2px;">القاهرة - مصر | مستلزمات GPL</div>
        </div>
        <div style="text-align: left;">
          <div style="display: flex; align-items: center; gap: 4px; justify-content: flex-end;">
            ${invoice.is_bonus ? `
              <span style="font-size: 9.5px; font-weight: 900; background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; border: 1px solid #f59e0b;">
                ⭐ بونص
              </span>
            ` : ''}
            <span style="font-size: 12px; font-family: monospace; font-weight: bold; background: #f1f5f9; padding: 2px 8px; border-radius: 4px; border: 1px solid #cbd5e1; color: #0f172a;">
              ${invoice.invoice_number}
            </span>
          </div>
          <div style="font-size: 9.5px; color: #475569; margin-top: 3px;">
            تاريخ الإصدار: ${formatDate(invoice.created_at, true)}
          </div>
        </div>
      </div>
    `;
    page.appendChild(p1Header);

    // Customer Information Box
    const custBox = document.createElement('div');
    custBox.style.cssText = 'background: #f8fafc; border-radius: 6px; padding: 6px 10px; border: 1px solid #cbd5e1; margin-bottom: 6px; font-size: 11px; display: flex; justify-content: space-between; width: 100%; box-sizing: border-box;';
    custBox.innerHTML = `
      <div><span style="color: #64748b;">اسم العميل:</span> <strong style="color: #0f172a;">${invoice.customer_name_snapshot || 'عميل نقدي'}</strong></div>
      ${invoice.customer?.phone ? `<div><span style="color: #64748b;">الهاتف:</span> <strong style="color: #0f172a;">${invoice.customer.phone}</strong></div>` : ''}
    `;
    page.appendChild(custBox);
  } else {
    // Sub-header for subsequent pages
    const subHeader = document.createElement('div');
    subHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 6px; font-size: 11px; width: 100%;';
    subHeader.innerHTML = `
      <span style="font-weight: bold; color: #1e293b;">${APP_CONFIG.nameAr} — فاتورة رقم ${invoice.invoice_number}</span>
      <span style="font-size: 10px; color: #64748b; font-family: monospace;">(متابعة أصناف الفاتورة)</span>
    `;
    page.appendChild(subHeader);
  }

  // 2. Table
  const table = document.createElement('table');
  table.style.cssText = 'width: 100%; border-collapse: collapse; border: 1px solid #0f172a; font-size: 11px; box-sizing: border-box;';
  table.innerHTML = `
    <thead>
      <tr style="background: #f1f5f9; font-weight: bold; border-bottom: 1px solid #0f172a;">
        <th style="padding: 4px 6px; width: 28px; text-align: center; border: 1px solid #0f172a;">#</th>
        <th style="padding: 4px 8px; text-align: right; border: 1px solid #0f172a;">الصنف</th>
        <th style="padding: 4px 6px; width: 44px; text-align: center; border: 1px solid #0f172a;">الكمية</th>
        <th style="padding: 4px 6px; width: 75px; text-align: right; border: 1px solid #0f172a;">سعر الوحدة</th>
        <th style="padding: 4px 6px; width: 85px; text-align: left; border: 1px solid #0f172a;">السعر الإجمالي</th>
      </tr>
    </thead>
  `;

  const tbody = document.createElement('tbody');
  if (pageData.items.length > 0) {
    pageData.items.forEach((item, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="padding: 3.5px 6px; width: 28px; text-align: center; border: 1px solid #0f172a; font-family: monospace; font-size: 10px; color: #475569;">
          ${pageData.startIndex + idx + 1}
        </td>
        <td style="padding: 3.5px 8px; text-align: right; border: 1px solid #0f172a; font-weight: bold; color: #0f172a; word-break: break-word; line-height: 1.3;">
          ${item.product_name_snapshot}
        </td>
        <td style="padding: 3.5px 6px; width: 44px; text-align: center; border: 1px solid #0f172a; font-weight: bold; color: #0f172a;">
          ${item.quantity}
        </td>
        <td style="padding: 3.5px 6px; width: 75px; text-align: right; border: 1px solid #0f172a; color: #0f172a;">
          ${formatCurrency(item.unit_price, true)}
        </td>
        <td style="padding: 3.5px 6px; width: 85px; text-align: left; border: 1px solid #0f172a; font-weight: bold; color: #0f172a;">
          ${formatCurrency(item.total, true)}
        </td>
      `;
      tbody.appendChild(tr);
    });
  } else {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="5" style="padding: 10px; text-align: center; color: #64748b; border: 1px solid #0f172a;">لا توجد أصناف مسجلة</td>';
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  page.appendChild(table);

  // 3. Footer: Sits naturally after table (NO huge empty space, unbreakable block)
  if (pageData.isFinalPage) {
    const footerDiv = document.createElement('div');
    footerDiv.className = 'invoice-footer';
    footerDiv.style.cssText = 'border-top: 2px solid #0f172a; padding-top: 8px; margin-top: 12px; width: 100%; box-sizing: border-box;';

    if (hasNote) {
      // Notes Exist: Render Notes Box + Totals Box side-by-side (RTL: Notes right, Totals left)
      footerDiv.innerHTML = `
        <div style="display: flex; gap: 8px; align-items: stretch; justify-content: space-between; width: 100%;">
          <div style="flex: 1; border: 1px solid #0f172a; border-radius: 6px; padding: 6px 8px; font-size: 10px; display: flex; flex-direction: column; justify-content: space-between; background: #ffffff;">
            <div>
              <div style="font-weight: bold; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px; margin-bottom: 4px; font-size: 10.5px;">
                الملاحظات / Note:
              </div>
              <div style="color: #334155; line-height: 1.35; white-space: pre-wrap; font-size: 9.5px;">
                ${invoice.notes?.trim()}
              </div>
            </div>
            <div style="border-top: 1px solid #e2e8f0; padding-top: 4px; margin-top: 6px; text-align: center;">
              <div style="font-weight: bold; color: #0f172a; font-size: 10px;">شكراً لتعاونكم</div>
              <div style="font-size: 9px; color: #475569;">شركة الصفوة ميديكال جروب</div>
            </div>
          </div>

          <div style="width: 210px; shrink: 0; background: #f8fafc; border: 1px solid #0f172a; border-radius: 6px; padding: 6px 8px; font-size: 11px;">
            <div style="display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 1px solid #e2e8f0;">
              <span style="color: #475569;">الإجمالي:</span>
              <span style="font-weight: bold; color: #0f172a;">${formatCurrency(invoice.subtotal, true)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 1px solid #e2e8f0;">
              <span style="color: #475569;">الخصم ${invoice.discount_percentage > 0 ? `(${invoice.discount_percentage}%)` : ''}:</span>
              <span style="font-weight: bold; color: #92400e;">${invoice.discount_amount > 0 ? `- ${formatCurrency(invoice.discount_amount, true)}` : '0.00 ج.م'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 4px 6px; background: #dcfce7; border: 1px solid #16a34a; border-radius: 4px; font-weight: 900; margin-top: 4px;">
              <span>الإجمالي بعد الخصم:</span>
              <span style="color: #166534; font-size: 12px;">${formatCurrency(invoice.final_total, true)}</span>
            </div>
            ${invoice.is_bonus ? `
              <div style="margin-top: 4px; padding: 2px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 4px; text-align: center; font-size: 9px; font-weight: 900; color: #92400e;">
                ⭐ BONUS / بونص
              </div>
            ` : ''}
          </div>
        </div>
      `;
    } else {
      // NO Note: Completely hide notes box, render Totals box and company signature
      footerDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; width: 100%;">
          <div style="text-align: right;">
            <div style="font-size: 11px; font-weight: bold; color: #0f172a;">شكراً لتعاونكم</div>
            <div style="font-size: 10px; color: #475569;">شركة الصفوة ميديكال جروب</div>
          </div>

          <div style="width: 220px; shrink: 0; background: #f8fafc; border: 1px solid #0f172a; border-radius: 6px; padding: 6px 8px; font-size: 11px;">
            <div style="display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 1px solid #e2e8f0;">
              <span style="color: #475569;">الإجمالي:</span>
              <span style="font-weight: bold; color: #0f172a;">${formatCurrency(invoice.subtotal, true)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 1px solid #e2e8f0;">
              <span style="color: #475569;">الخصم ${invoice.discount_percentage > 0 ? `(${invoice.discount_percentage}%)` : ''}:</span>
              <span style="font-weight: bold; color: #92400e;">${invoice.discount_amount > 0 ? `- ${formatCurrency(invoice.discount_amount, true)}` : '0.00 ج.م'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 4px 6px; background: #dcfce7; border: 1px solid #16a34a; border-radius: 4px; font-weight: 900; margin-top: 4px;">
              <span>الإجمالي بعد الخصم:</span>
              <span style="color: #166534; font-size: 12px;">${formatCurrency(invoice.final_total, true)}</span>
            </div>
            ${invoice.is_bonus ? `
              <div style="margin-top: 4px; padding: 2px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 4px; text-align: center; font-size: 9px; font-weight: 900; color: #92400e;">
                ⭐ BONUS / بونص
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }
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
