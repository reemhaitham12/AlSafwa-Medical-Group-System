import React from 'react';
import type { Invoice } from '@/lib/database.types';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { APP_CONFIG } from '@/utils/constants';
import { Activity } from 'lucide-react';

interface PrintableInvoiceProps {
  invoice: Invoice | null;
  className?: string;
}

/**
 * Renders the compact horizontal invoice summary and customer account summary.
 * - Row 1: Invoice totals (الإجمالي | الخصم | الإجمالي بعد الخصم)
 * - Section header: «ملخص حساب العميل»
 * - Row 2: Customer account details (المديونية السابقة | سعر الفاتورة | المجموع المستحق)
 * All numeric values are explicitly styled in pure black (#000000) with bold weight.
 */
export const InvoiceSummarySection: React.FC<{ invoice: Invoice }> = ({ invoice }) => {
  const previousDebt = Number(invoice.previous_debt_snapshot) || 0;
  const finalTotal = Number(invoice.final_total) || 0;
  const totalDue = previousDebt + finalTotal;

  return (
    <div className="w-full mt-4 print:mt-2.5 break-inside-avoid print:break-inside-avoid" data-invoice-summary>
      {/* Bonus Badge if applicable */}
      {invoice.is_bonus && (
        <div className="mb-2 py-1 px-3 bg-amber-100 border border-amber-400 rounded-lg text-amber-950 font-extrabold text-center text-xs print:border-black print:text-black">
          ⭐ فاتورة بونص (مستثناة من المبيعات والمديونية) / BONUS INVOICE
        </div>
      )}

      {/* Row 1: Invoice Totals (3 parts in a single horizontal row) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-2 sm:gap-2.5 print:gap-2">
        {/* 1. Subtotal / الإجمالي */}
        <div className="flex items-center justify-between py-2 px-3 bg-slate-50 print:bg-white rounded-lg border border-slate-300 print:border-black">
          <span className="text-xs font-semibold text-slate-700 print:text-black">
            الإجمالي:
          </span>
          <span
            className="text-xs sm:text-sm font-bold text-black print:text-black whitespace-nowrap"
            style={{ color: '#000000', fontWeight: 700 }}
          >
            {formatCurrency(invoice.subtotal, true)}
          </span>
        </div>

        {/* 2. Discount / الخصم */}
        <div className="flex items-center justify-between py-2 px-3 bg-slate-50 print:bg-white rounded-lg border border-slate-300 print:border-black">
          <span className="text-xs font-semibold text-slate-700 print:text-black">
            الخصم {invoice.discount_percentage > 0 ? `(${invoice.discount_percentage}%)` : ''}:
          </span>
          <span
            className="text-xs sm:text-sm font-bold text-black print:text-black whitespace-nowrap"
            style={{ color: '#000000', fontWeight: 700 }}
          >
            {invoice.discount_amount > 0 ? `- ${formatCurrency(invoice.discount_amount, true)}` : '0.00 ج.م'}
          </span>
        </div>

        {/* 3. Final Total / الإجمالي بعد الخصم (Calm soft color highlight) */}
        <div className="summary-final-total flex items-center justify-between py-2 px-3 bg-emerald-50 print:bg-emerald-50/60 rounded-lg border-2 border-emerald-400 print:border-emerald-700">
          <span className="text-xs font-bold text-emerald-950 print:text-black">
            الإجمالي بعد الخصم:
          </span>
          <span
            className="text-xs sm:text-sm font-black text-black print:text-black whitespace-nowrap"
            style={{ color: '#000000', fontWeight: 900 }}
          >
            {formatCurrency(invoice.final_total, true)}
          </span>
        </div>
      </div>

      {/* Customer Account Summary Header */}
      <div className="mt-3 pt-2.5 border-t border-dashed border-slate-300 print:border-black flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-800 print:text-black tracking-wide">
          ملخص حساب العميل
        </h3>
      </div>

      {/* Row 2: Customer Account Details (3 horizontal columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-2 sm:gap-2.5 print:gap-2 mt-1.5">
        {/* 1. Previous Debt / المديونية السابقة */}
        <div className="flex items-center justify-between py-2 px-3 bg-slate-50 print:bg-white rounded-lg border border-slate-300 print:border-black">
          <span className="text-xs font-semibold text-slate-700 print:text-black">
            المديونية السابقة:
          </span>
          <span
            className="text-xs sm:text-sm font-bold text-black print:text-black whitespace-nowrap"
            style={{ color: '#000000', fontWeight: 700 }}
          >
            {formatCurrency(previousDebt, true)}
          </span>
        </div>

        {/* 2. Invoice Amount / سعر الفاتورة */}
        <div className="flex items-center justify-between py-2 px-3 bg-slate-50 print:bg-white rounded-lg border border-slate-300 print:border-black">
          <span className="text-xs font-semibold text-slate-700 print:text-black">
            سعر الفاتورة:
          </span>
          <span
            className="text-xs sm:text-sm font-bold text-black print:text-black whitespace-nowrap"
            style={{ color: '#000000', fontWeight: 700 }}
          >
            {formatCurrency(finalTotal, true)}
          </span>
        </div>

        {/* 3. Total Due / المجموع المستحق (Prominent clear highlight) */}
        <div className="summary-total-due flex items-center justify-between py-2 px-3 bg-amber-50 print:bg-amber-50/60 rounded-lg border-2 border-amber-500 print:border-black shadow-xs">
          <span className="text-xs font-extrabold text-amber-950 print:text-black">
            المجموع المستحق:
          </span>
          <span
            className="text-xs sm:text-sm font-black text-black print:text-black whitespace-nowrap"
            style={{ color: '#000000', fontWeight: 900 }}
          >
            {formatCurrency(totalDue, true)}
          </span>
        </div>
      </div>
    </div>
  );
};

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
            <span
              className="inline-block text-base sm:text-xl font-bold font-mono text-black bg-slate-100 px-2.5 sm:px-3 py-1 rounded-lg border border-slate-300 print:bg-white print:border-black print:text-black print:text-sm"
              style={{ color: '#000000', fontWeight: 700 }}
            >
              {invoice.invoice_number}
            </span>
          </div>
          <p className="text-xs text-slate-700 font-medium mt-1 print:text-black print:text-[10px]">
            تاريخ الإصدار:{' '}
            <span className="text-black font-semibold print:text-black" style={{ color: '#000000', fontWeight: 600 }}>
              {formatDate(invoice.created_at, true)}
            </span>
          </p>
        </div>
      </div>

      {/* Customer Metadata */}
      <div className="bg-slate-50 rounded-xl p-3.5 sm:p-4 border border-slate-300 mb-4 print:bg-white print:border-black print:p-2.5 print:mb-3 print:rounded-lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm leading-relaxed print:text-black print:text-xs">
          <div>
            <span className="text-slate-700 font-semibold print:text-black">اسم العميل: </span>
            <span className="font-bold text-slate-950 text-base print:text-black print:text-xs">{invoice.customer_name_snapshot || 'عميل نقدي'}</span>
          </div>
          {invoice.customer?.phone && (
            <div>
              <span className="text-slate-700 font-semibold print:text-black">رقم الهاتف: </span>
              <span
                className="font-bold text-black print:text-black print:text-xs"
                style={{ color: '#000000', fontWeight: 700 }}
              >
                {invoice.customer.phone}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Items Table */}
      <div className="overflow-x-auto mb-4 print:mb-3 print:overflow-visible">
        <table className="w-full text-sm border-collapse border-2 border-slate-900 print:border-black min-w-[500px] sm:min-w-full print:min-w-0 print:text-xs">
          <thead>
            <tr className="bg-slate-100 text-slate-950 font-bold border-b-2 border-slate-900 print:bg-slate-200 print:border-black print:text-black">
              <th className="py-2.5 px-3.5 text-center border border-slate-900 print:border-black print:py-2 print:px-2.5 leading-normal align-middle w-10">#</th>
              <th className="py-2.5 px-3.5 text-right border border-slate-900 print:border-black print:py-2 print:px-2.5 leading-normal align-middle">الصنف</th>
              <th className="py-2.5 px-3.5 text-center border border-slate-900 print:border-black print:py-2 print:px-2.5 leading-normal align-middle w-16">الكمية</th>
              <th className="py-2.5 px-3.5 text-right border border-slate-900 print:border-black print:py-2 print:px-2.5 leading-normal align-middle w-28">سعر الوحدة</th>
              <th className="py-2.5 px-3.5 text-left border border-slate-900 print:border-black print:py-2 print:px-2.5 leading-normal align-middle w-32">السعر الإجمالي</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300 print:divide-black">
            {invoice.items && invoice.items.length > 0 ? (
              invoice.items.map((item, idx) => (
                <tr key={item.id || idx} className="hover:bg-slate-50">
                  <td
                    className="py-2.5 px-3.5 text-black font-bold font-mono text-center border border-slate-900 print:border-black print:text-black print:py-2 print:px-2.5 leading-relaxed align-middle"
                    style={{ color: '#000000', fontWeight: 700 }}
                  >
                    {idx + 1}
                  </td>
                  <td className="py-2.5 px-3.5 font-bold text-slate-900 border border-slate-900 print:border-black print:text-black print:py-2 print:px-2.5 leading-relaxed align-middle break-words">
                    {item.product_name_snapshot}
                  </td>
                  <td
                    className="py-2.5 px-3.5 text-center font-bold text-black border border-slate-900 print:border-black print:text-black print:py-2 print:px-2.5 leading-relaxed align-middle"
                    style={{ color: '#000000', fontWeight: 700 }}
                  >
                    {item.quantity}
                  </td>
                  <td
                    className="py-2.5 px-3.5 text-right font-bold text-black border border-slate-900 print:border-black print:text-black print:py-2 print:px-2.5 leading-relaxed align-middle"
                    style={{ color: '#000000', fontWeight: 700 }}
                  >
                    {formatCurrency(item.unit_price, true)}
                  </td>
                  <td
                    className="py-2.5 px-3.5 text-left font-bold text-black border border-slate-900 print:border-black print:text-black print:py-2 print:px-2.5 leading-relaxed align-middle"
                    style={{ color: '#000000', fontWeight: 700 }}
                  >
                    {formatCurrency(item.total, true)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-5 text-center text-slate-500 border border-slate-900 print:border-black print:text-black leading-relaxed">لا توجد أصناف</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Section: Horizontal compact summary + Notes & Signature */}
      <div data-invoice-footer className="invoice-footer border-t-2 border-slate-900 print:border-black pt-3.5 print:pt-3 break-inside-avoid print:break-inside-avoid">
        {/* Horizontal Invoice Totals & Account Summary */}
        <InvoiceSummarySection invoice={invoice} />

        {/* Notes and Thank You Row */}
        <div className="mt-3 pt-2.5 border-t border-slate-200 print:border-black flex flex-col sm:flex-row print:flex-row items-center justify-between gap-3 break-inside-avoid print:break-inside-avoid">
          {invoice.notes && invoice.notes.trim() ? (
            <div className="w-full sm:flex-1 print:flex-1 bg-slate-50 print:bg-white rounded-lg border border-slate-300 print:border-black p-2.5 print:p-2 text-right">
              <h4 className="text-xs font-bold text-slate-900 print:text-black mb-1">
                الملاحظات / Note:
              </h4>
              <p className="text-xs text-slate-800 print:text-black font-medium whitespace-pre-wrap leading-relaxed">
                {invoice.notes.trim()}
              </p>
            </div>
          ) : (
            <div className="hidden sm:block print:hidden" />
          )}

          <div className="text-center sm:text-right print:text-right shrink-0 space-y-0.5">
            <p className="text-xs sm:text-sm font-bold text-slate-900 print:text-black">
              شكراً لتعاونكم
            </p>
            <p className="text-[11px] sm:text-xs font-semibold text-slate-700 print:text-black">
              شركة الصفوة ميديكال جروب
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
