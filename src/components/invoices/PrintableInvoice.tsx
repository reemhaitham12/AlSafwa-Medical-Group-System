import React from 'react';
import type { Invoice } from '@/lib/database.types';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { APP_CONFIG } from '@/utils/constants';
import { Activity } from 'lucide-react';

interface PrintableInvoiceProps {
  invoice: Invoice | null;
  className?: string;
}

export const PrintableInvoice: React.FC<PrintableInvoiceProps> = ({ invoice, className = '' }) => {
  if (!invoice) return null;

  return (
    <div
      id="printable-invoice"
      className={`p-4 sm:p-6 md:p-8 bg-white rounded-xl border border-surface-300 font-sans text-slate-900 text-sm print:border-none print:shadow-none print:p-0 ${className}`}
      dir="rtl"
    >
      {/* Header Brand */}
      <div className="flex items-start justify-between border-b-2 border-brand-600 pb-4 mb-4 print:border-black print:pb-2.5 print:mb-2.5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold print:bg-black">
              <Activity className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 print:text-black print:text-lg">{APP_CONFIG.nameAr}</h1>
          </div>
          <p className="text-xs text-slate-600 font-semibold print:hidden">{APP_CONFIG.nameEn}</p>
          <p className="text-xs text-slate-500 mt-0.5 print:text-black print:text-[10px]">القاهرة - مصر | مستلزمات GPL</p>
        </div>

        <div className="text-left">
          <div className="flex items-center gap-2 justify-end">
            {invoice.is_bonus && (
              <span className="inline-block px-2.5 py-0.5 bg-amber-100 text-amber-900 font-black text-xs rounded-lg border-2 border-amber-400 print:border-black print:text-black print:text-[10px]">
                ⭐ BONUS / بونص
              </span>
            )}
            <span className="inline-block text-base sm:text-xl font-bold font-mono text-slate-900 bg-slate-100 px-2.5 sm:px-3 py-1 rounded-lg border border-slate-300 print:bg-white print:border-black print:text-black print:text-sm">
              ${invoice.invoice_number}
            </span>
          </div>
          <p className="text-xs text-slate-700 font-medium mt-1 print:text-black print:text-[10px]">تاريخ الإصدار: {formatDate(invoice.created_at, true)}</p>
        </div>
      </div>

      {/* Customer Metadata */}
      <div className="bg-slate-50 rounded-xl p-3 sm:p-4 border border-slate-300 mb-4 print:bg-white print:border-black print:p-2 print:mb-2.5 print:rounded-lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm print:text-black print:text-xs">
          <div>
            <span className="text-slate-700 font-semibold print:text-black">اسم العميل: </span>
            <span className="font-bold text-slate-950 text-base print:text-black print:text-xs">{invoice.customer_name_snapshot}</span>
          </div>
          {invoice.customer?.phone && (
            <div>
              <span className="text-slate-700 font-semibold print:text-black">رقم الهاتف: </span>
              <span className="font-bold text-slate-900 print:text-black print:text-xs">{invoice.customer.phone}</span>
            </div>
          )}
        </div>
      </div>

      {/* Items Table */}
      <div className="overflow-x-auto mb-4 print:mb-2.5 print:overflow-visible">
        <table className="w-full text-sm border-collapse border-2 border-slate-900 print:border-black min-w-[500px] sm:min-w-full print:min-w-0 print:text-xs">
          <thead>
            <tr className="bg-slate-100 text-slate-950 font-bold border-b-2 border-slate-900 print:bg-slate-200 print:border-black print:text-black">
              <th className="py-2.5 px-3 text-right border border-slate-900 print:border-black print:py-1.5 print:px-2">#</th>
              <th className="py-2.5 px-3 text-right border border-slate-900 print:border-black print:py-1.5 print:px-2">الصنف</th>
              <th className="py-2.5 px-3 text-center border border-slate-900 print:border-black print:py-1.5 print:px-2">الكمية</th>
              <th className="py-2.5 px-3 text-right border border-slate-900 print:border-black print:py-1.5 print:px-2">سعر الوحدة</th>
              <th className="py-2.5 px-3 text-left border border-slate-900 print:border-black print:py-1.5 print:px-2">السعر الإجمالي</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300 print:divide-black">
            {invoice.items && invoice.items.length > 0 ? (
              invoice.items.map((item, idx) => (
                <tr key={item.id || idx} className="hover:bg-slate-50">
                  <td className="py-2 px-3 text-slate-700 font-mono text-center border border-slate-900 print:border-black print:text-black print:py-1.5 print:px-2">{idx + 1}</td>
                  <td className="py-2 px-3 font-bold text-slate-900 border border-slate-900 print:border-black print:text-black print:py-1.5 print:px-2">{item.product_name_snapshot}</td>
                  <td className="py-2 px-3 text-center font-bold text-slate-900 border border-slate-900 print:border-black print:text-black print:py-1.5 print:px-2">{item.quantity}</td>
                  <td className="py-2 px-3 text-right text-slate-900 border border-slate-900 print:border-black print:text-black print:py-1.5 print:px-2">{formatCurrency(item.unit_price, true)}</td>
                  <td className="py-2 px-3 text-left font-bold text-slate-950 border border-slate-900 print:border-black print:text-black print:py-1.5 print:px-2">{formatCurrency(item.total, true)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-4 text-center text-slate-500 border border-slate-900 print:border-black print:text-black">لا توجد أصناف</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Section:
          - If invoice HAS a note:
            - Desktop / Print: Two columns (Right = Notes box, Left = Totals box)
            - Mobile Preview: Stacked vertically (First = Totals box, Second = Notes box)
          - If invoice has NO note:
            - Notes box is completely hidden (no empty box or reserved space)
            - Renders Totals box with company thank-you message
      */}
      {invoice.notes && invoice.notes.trim() ? (
        <div
          data-invoice-footer
          className="invoice-footer flex flex-col md:flex-row print:flex-row items-stretch justify-between gap-3 border-t-2 border-slate-900 print:border-black pt-3.5 print:pt-2.5 break-inside-avoid print:break-inside-avoid"
        >
          {/* Totals Box: On mobile (flex-col) order-1 (top); on desktop/print (flex-row RTL) order-2 (left column) */}
          <div className="order-1 md:order-2 print:order-2 w-full md:w-72 print:w-[215px] shrink-0 bg-slate-50 rounded-xl border-2 border-slate-900 p-3.5 sm:p-4 flex flex-col justify-between print:bg-white print:border-black print:p-2.5">
            <div className="space-y-1.5 text-sm text-slate-900 print:text-xs print:text-black">
              {/* Subtotal / الإجمالي */}
              <div className="flex justify-between items-center py-1 border-b border-slate-200 print:border-black">
                <span className="font-semibold text-slate-700 print:text-black">الإجمالي:</span>
                <span className="font-bold text-slate-950 print:text-black">{formatCurrency(invoice.subtotal, true)}</span>
              </div>

              {/* Discount / الخصم */}
              <div className="flex justify-between items-center py-1 border-b border-slate-200 print:border-black">
                <span className="font-semibold text-slate-700 print:text-black">
                  الخصم {invoice.discount_percentage > 0 ? `(${invoice.discount_percentage}%)` : ''}:
                </span>
                <span className={`font-bold ${invoice.discount_amount > 0 ? 'text-amber-900 print:text-black' : 'text-slate-900 print:text-black'}`}>
                  {invoice.discount_amount > 0 ? `- ${formatCurrency(invoice.discount_amount, true)}` : '0.00 ج.م'}
                </span>
              </div>

              {/* Final Total / الإجمالي بعد الخصم - Visually Emphasized */}
              <div className="flex justify-between items-center py-2 px-2.5 bg-emerald-100/70 border-2 border-emerald-700 rounded-lg text-emerald-950 font-black text-base print:text-sm mt-1.5 shadow-xs print:bg-white print:border-black print:text-black">
                <span>الإجمالي بعد الخصم:</span>
                <span className="text-emerald-900 text-base print:text-sm font-black print:text-black">
                  {formatCurrency(invoice.final_total, true)}
                </span>
              </div>

              {/* Bonus Badge if applicable */}
              {invoice.is_bonus && (
                <div className="mt-1.5 py-1 px-2 bg-amber-100 border-2 border-amber-500 rounded-lg text-amber-900 font-extrabold text-center text-xs print:border-black print:text-black">
                  ⭐ BONUS / بونص
                </div>
              )}
            </div>
          </div>

          {/* Notes Box: On mobile (flex-col) order-2 (below totals); on desktop/print (flex-row RTL) order-1 (right column) */}
          <div className="order-2 md:order-1 print:order-1 w-full md:flex-1 print:flex-1 bg-white rounded-xl border-2 border-slate-900 p-3.5 sm:p-4 flex flex-col justify-between print:border-black print:p-2.5">
            <div>
              <h4 className="text-xs font-bold text-slate-900 border-b border-slate-200 pb-1 mb-1.5 print:border-black print:text-black">
                الملاحظات / Note:
              </h4>
              <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed print:text-black font-medium print:text-[11px]">
                {invoice.notes.trim()}
              </p>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-200 text-center space-y-0.5 print:border-black">
              <p className="text-xs font-bold text-slate-900 print:text-black">
                شكراً لتعاونكم
              </p>
              <p className="text-[11px] font-semibold text-slate-700 print:text-black">
                شركة الصفوة ميديكال جروب
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* When NO note exists: Completely hide notes box, render Totals box and company signature */
        <div
          data-invoice-footer
          className="invoice-footer border-t-2 border-slate-900 print:border-black pt-3.5 print:pt-2.5 break-inside-avoid print:break-inside-avoid"
        >
          <div className="flex flex-col sm:flex-row print:flex-row items-center justify-between gap-3">
            {/* Thank you note */}
            <div className="text-center sm:text-right print:text-right space-y-0.5">
              <p className="text-sm font-bold text-slate-900 print:text-black">
                شكراً لتعاونكم
              </p>
              <p className="text-xs font-semibold text-slate-700 print:text-black">
                شركة الصفوة ميديكال جروب
              </p>
            </div>

            {/* Totals Box */}
            <div className="w-full sm:w-72 print:w-[220px] shrink-0 bg-slate-50 rounded-xl border-2 border-slate-900 p-3 sm:p-4 print:bg-white print:border-black print:p-2.5">
              <div className="space-y-1.5 text-sm text-slate-900 print:text-xs print:text-black">
                <div className="flex justify-between items-center py-1 border-b border-slate-200 print:border-black">
                  <span className="font-semibold text-slate-700 print:text-black">الإجمالي:</span>
                  <span className="font-bold text-slate-950 print:text-black">{formatCurrency(invoice.subtotal, true)}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200 print:border-black">
                  <span className="font-semibold text-slate-700 print:text-black">
                    الخصم {invoice.discount_percentage > 0 ? `(${invoice.discount_percentage}%)` : ''}:
                  </span>
                  <span className={`font-bold ${invoice.discount_amount > 0 ? 'text-amber-900 print:text-black' : 'text-slate-900 print:text-black'}`}>
                    {invoice.discount_amount > 0 ? `- ${formatCurrency(invoice.discount_amount, true)}` : '0.00 ج.م'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 px-2.5 bg-emerald-100/70 border-2 border-emerald-700 rounded-lg text-emerald-950 font-black text-base print:text-sm mt-1.5 shadow-xs print:bg-white print:border-black print:text-black">
                  <span>الإجمالي بعد الخصم:</span>
                  <span className="text-emerald-900 text-base print:text-sm font-black print:text-black">
                    {formatCurrency(invoice.final_total, true)}
                  </span>
                </div>
                {invoice.is_bonus && (
                  <div className="mt-1.5 py-1 px-2 bg-amber-100 border-2 border-amber-500 rounded-lg text-amber-900 font-extrabold text-center text-xs print:border-black print:text-black">
                    ⭐ BONUS / بونص
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
