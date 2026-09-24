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
      className={`p-6 md:p-8 bg-white rounded-xl border border-surface-300 font-sans text-slate-900 text-sm print:border-none print:shadow-none print:p-0 ${className}`}
      dir="rtl"
    >
      {/* Header Brand */}
      <div className="flex items-start justify-between border-b-2 border-brand-600 pb-6 mb-6 print:border-black">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-9 h-9 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold print:bg-black">
              <Activity className="w-5.5 h-5.5" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 print:text-black">{APP_CONFIG.nameAr}</h1>
          </div>
          <p className="text-xs text-slate-600 font-semibold print:hidden">{APP_CONFIG.nameEn}</p>
          <p className="text-xs text-slate-500 mt-1 print:text-black">القاهرة - مصر | مستلزمات GPL</p>
        </div>

        <div className="text-left">
          <span className="inline-block text-xl font-bold font-mono text-slate-900 bg-slate-100 px-3.5 py-1.5 rounded-lg border border-slate-300 mb-1.5 print:bg-white print:border-black print:text-black">
            {invoice.invoice_number}
          </span>
          <p className="text-xs text-slate-700 font-medium print:text-black">تاريخ الإصدار: {formatDate(invoice.created_at, true)}</p>
        </div>
      </div>

      {/* Customer Metadata */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-300 mb-6 print:bg-white print:border-black">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm print:text-black">
          <div>
            <span className="text-slate-700 font-semibold print:text-black">اسم العميل: </span>
            <span className="font-bold text-slate-950 text-base print:text-black">{invoice.customer_name_snapshot}</span>
          </div>
          {invoice.customer?.phone && (
            <div>
              <span className="text-slate-700 font-semibold print:text-black">رقم الهاتف: </span>
              <span className="font-bold text-slate-900 print:text-black">{invoice.customer.phone}</span>
            </div>
          )}
        </div>
      </div>

      {/* Items Table */}
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm border-collapse border-2 border-slate-900 print:border-black">
          <thead>
            <tr className="bg-slate-100 text-slate-950 font-bold border-b-2 border-slate-900 print:bg-slate-200 print:border-black print:text-black">
              <th className="py-3 px-4 text-right border border-slate-900 print:border-black">#</th>
              <th className="py-3 px-4 text-right border border-slate-900 print:border-black">الصنف</th>
              <th className="py-3 px-4 text-center border border-slate-900 print:border-black">الكمية</th>
              <th className="py-3 px-4 text-right border border-slate-900 print:border-black">سعر الوحدة</th>
              <th className="py-3 px-4 text-left border border-slate-900 print:border-black">السعر الإجمالي</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300 print:divide-black">
            {invoice.items && invoice.items.length > 0 ? (
              invoice.items.map((item, idx) => (
                <tr key={item.id || idx} className="hover:bg-slate-50">
                  <td className="py-3 px-4 text-slate-700 font-mono text-center border border-slate-900 print:border-black print:text-black">{idx + 1}</td>
                  <td className="py-3 px-4 font-bold text-slate-900 border border-slate-900 print:border-black print:text-black">{item.product_name_snapshot}</td>
                  <td className="py-3 px-4 text-center font-bold text-slate-900 border border-slate-900 print:border-black print:text-black">{item.quantity}</td>
                  <td className="py-3 px-4 text-right text-slate-900 border border-slate-900 print:border-black print:text-black">{formatCurrency(item.unit_price, true)}</td>
                  <td className="py-3 px-4 text-left font-bold text-slate-950 border border-slate-900 print:border-black print:text-black">{formatCurrency(item.total, true)}</td>
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

      {/* Invoice Summary Totals */}
      <div className="flex justify-end border-t-2 border-slate-900 print:border-black pt-4">
        <div className="w-full sm:w-80 space-y-2.5 text-sm bg-slate-50 p-4 rounded-xl border-2 border-slate-900 print:bg-white print:border-black print:text-black">
          <div className="flex justify-between py-1 border-b border-slate-300 print:border-black text-slate-900">
            <span className="font-semibold">المجموع الفرعي:</span>
            <span className="font-bold text-slate-950">{formatCurrency(invoice.subtotal, true)}</span>
          </div>

          {invoice.discount_percentage > 0 && (
            <div className="flex justify-between py-1 border-b border-slate-300 print:border-black text-amber-900 font-semibold">
              <span>الخصم ({invoice.discount_percentage}%):</span>
              <span className="font-bold">- {formatCurrency(invoice.discount_amount, true)}</span>
            </div>
          )}

          <div className="flex justify-between py-3 px-3 bg-emerald-50 border-2 border-emerald-600 rounded-lg text-emerald-950 text-base font-black mt-2 print:bg-white print:border-black print:text-black">
            <span>الصافي النهائي:</span>
            <span className="text-emerald-800 text-lg font-black print:text-black">{formatCurrency(invoice.final_total, true)}</span>
          </div>
        </div>
      </div>

      {/* Invoice Footer Message */}
      <div className="mt-8 pt-4 border-t border-slate-300 print:border-black text-center space-y-1">
        <p className="text-sm font-bold text-slate-800 print:text-black">
          شكراً
        </p>
        <p className="text-xs font-semibold text-slate-600 print:text-black">
          شركة الصفوة ميديكال جروب GPL
        </p>
      </div>
    </div>
  );
};
