import React, { useEffect, useState } from 'react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/context/ToastContext';
import { invoicesService } from '@/services/invoicesService';
import { APP_CONFIG } from '@/utils/constants';
import { downloadInvoicePDF } from '@/utils/pdfGenerator';
import { Printer, Download, RefreshCw, Calendar, PackageCheck, Activity } from 'lucide-react';

type DateFilterType = 'today' | 'week' | 'month' | 'custom' | 'all';

interface StockOrderItem {
  product_name: string;
  total_quantity: number;
}

export const StockOrder: React.FC = () => {
  const { isArabic } = useLanguage();
  const { user, isConfigured } = useAuth();
  const { showSuccess, showError } = useToast();

  const [dateFilter, setDateFilter] = useState<DateFilterType>('today');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  const [stockItems, setStockItems] = useState<StockOrderItem[]>([]);
  const [totalInvoicesCount, setTotalInvoicesCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  // Helper to compute date range ISO strings
  const getDateRangeBounds = () => {
    const now = new Date();
    let startIso: string | undefined = undefined;
    let endIso: string | undefined = undefined;

    if (dateFilter === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      startIso = startOfDay.toISOString();
      endIso = endOfDay.toISOString();
    } else if (dateFilter === 'week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - 7);
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      startIso = startOfWeek.toISOString();
      endIso = endOfDay.toISOString();
    } else if (dateFilter === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      startIso = startOfMonth.toISOString();
      endIso = endOfDay.toISOString();
    } else if (dateFilter === 'custom') {
      if (customStartDate) {
        const s = new Date(customStartDate);
        s.setHours(0, 0, 0, 0);
        startIso = s.toISOString();
      }
      if (customEndDate) {
        const e = new Date(customEndDate);
        e.setHours(23, 59, 59, 999);
        endIso = e.toISOString();
      }
    }

    return { startIso, endIso };
  };

  const fetchStockOrderData = async () => {
    if (!isConfigured || !user) return;
    setLoading(true);
    try {
      const { startIso, endIso } = getDateRangeBounds();
      const invoices = await invoicesService.getInvoicesByDateRange(startIso, endIso);

      setTotalInvoicesCount(invoices.length);

      // Aggregate quantities by product name snapshot
      const quantityMap = new Map<string, number>();

      invoices.forEach((inv) => {
        if (inv.items && Array.isArray(inv.items)) {
          inv.items.forEach((item) => {
            const rawName = item.product_name_snapshot?.trim();
            if (!rawName) return;
            const currentQty = quantityMap.get(rawName) || 0;
            quantityMap.set(rawName, currentQty + (Number(item.quantity) || 0));
          });
        }
      });

      const aggregatedList: StockOrderItem[] = Array.from(quantityMap.entries())
        .map(([product_name, total_quantity]) => ({
          product_name,
          total_quantity,
        }))
        .sort((a, b) => b.total_quantity - a.total_quantity);

      setStockItems(aggregatedList);
    } catch (err: any) {
      console.error('Failed to load stock orders data:', err);
      showError(isArabic ? 'فشل تحميل بيانات طلبيات المخزن' : 'Failed to load stock order data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConfigured && user) {
      fetchStockOrderData();
    }
  }, [user, isConfigured, dateFilter, customStartDate, customEndDate]);

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = 'طلب المخزن - الصفوة ميديكال جروب';
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  const handleDownloadPDF = async () => {
    try {
      setIsGeneratingPdf(true);
      const fileName = `Stock_Order_${new Date().toISOString().slice(0, 10)}.pdf`;
      await downloadInvoicePDF('printable-stock-order', fileName);
      showSuccess(isArabic ? 'تم تحميل ملف PDF بنجاح' : 'Stock order PDF downloaded successfully');
    } catch (err: any) {
      console.error('Stock Order PDF Error:', err);
      showError(isArabic ? 'فشل إنشاء ملف PDF' : 'Failed to generate PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const totalQuantitySum = stockItems.reduce((acc, item) => acc + item.total_quantity, 0);

  const getDateFilterLabel = () => {
    const todayStr = new Date().toLocaleDateString('ar-EG');
    switch (dateFilter) {
      case 'today':
        return `اليوم (${todayStr})`;
      case 'week':
        return 'هذا الأسبوع';
      case 'month':
        return 'هذا الشهر';
      case 'custom':
        return `مخصص (${customStartDate || '...'} إلى ${customEndDate || '...'})`;
      default:
        return 'جميع الفواتير (الكل)';
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-surface-900">
            {isArabic ? 'طلبات المخزن' : 'Stock Orders'}
          </h1>
          <p className="text-xs text-surface-500 mt-0.5">
            {isArabic
              ? 'تجميع آلي لأصناف وكميات الفواتير المحفوظة في السحابة لتسهيل طلبيات التوريد'
              : 'Automated quantity aggregation from saved invoices for warehouse stock management'}
          </p>
        </div>

        <div className="flex items-center gap-2 print:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            icon={<Printer className="w-4 h-4" />}
          >
            {isArabic ? 'طباعة' : 'Print'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleDownloadPDF}
            isLoading={isGeneratingPdf}
            icon={<Download className="w-4 h-4" />}
          >
            {isArabic ? 'تحميل PDF' : 'Download PDF'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchStockOrderData}
            isLoading={loading}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            {isArabic ? 'تحديث' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <Card className="p-4 print:hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-surface-700 flex items-center gap-1.5 ml-2">
              <Calendar className="w-4 h-4 text-brand-600" />
              {isArabic ? 'تصفية حسب الفترة:' : 'Filter Period:'}
            </span>

            {(['today', 'week', 'month', 'custom', 'all'] as DateFilterType[]).map((f) => (
              <button
                type="button"
                key={f}
                onClick={() => setDateFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  dateFilter === f
                    ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                    : 'bg-white border-surface-200 text-surface-700 hover:bg-surface-50'
                }`}
              >
                {f === 'today'
                  ? isArabic
                    ? 'اليوم'
                    : 'Today'
                  : f === 'week'
                  ? isArabic
                    ? 'هذا الأسبوع'
                    : 'This Week'
                  : f === 'month'
                  ? isArabic
                    ? 'هذا الشهر'
                    : 'This Month'
                  : f === 'custom'
                  ? isArabic
                    ? 'مخصص'
                    : 'Custom'
                  : isArabic
                  ? 'الكل'
                  : 'All'}
              </button>
            ))}
          </div>

          {dateFilter === 'custom' && (
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="text-xs py-1"
              />
              <span className="text-xs text-surface-400">إلى</span>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="text-xs py-1"
              />
            </div>
          )}
        </div>
      </Card>

      {/* Main Stock Order Display Card */}
      <Card>
        {loading ? (
          <LoadingSpinner label={isArabic ? 'جاري تجميع طلبيات المخزن من السحابة...' : 'Aggregating stock orders...'} />
        ) : (
          /* Printable Element (#printable-stock-order) */
          <div
            id="printable-stock-order"
            className="p-6 bg-white rounded-xl font-sans text-slate-900 print:p-0 print:border-none print:shadow-none"
            dir="rtl"
          >
            {/* Header / Company Branding */}
            <div className="flex items-start justify-between border-b-2 border-brand-600 pb-4 mb-6 print:border-black">
              <div>
                <div className="flex items-center gap-2.5 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold print:bg-black">
                    <Activity className="w-5 h-5" />
                  </div>
                  <h1 className="text-xl font-black text-slate-900 print:text-black">{APP_CONFIG.nameAr}</h1>
                </div>
                <p className="text-xs text-slate-600 font-semibold print:text-black">تقرير طلبيات واحتياجات المخزن</p>
              </div>

              <div className="text-left text-xs text-slate-700 print:text-black space-y-1">
                <p className="font-bold print:text-black">الفترة: <span className="font-normal">{getDateFilterLabel()}</span></p>
                <p>عدد الفواتير المشمولة: <span className="font-bold">{totalInvoicesCount}</span></p>
                <p className="text-[11px] text-slate-500 print:text-black">تاريخ الاستخراج: {new Date().toLocaleDateString('ar-EG')} - {new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>

            {/* Aggregated Stock Order Table */}
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm border-collapse border-2 border-slate-900 print:border-black">
                <thead>
                  <tr className="bg-slate-100 text-slate-950 font-bold border-b-2 border-slate-900 print:bg-slate-200 print:border-black print:text-black">
                    <th className="py-3 px-4 text-right border border-slate-900 print:border-black w-16">#</th>
                    <th className="py-3 px-4 text-right border border-slate-900 print:border-black">الصنف</th>
                    <th className="py-3 px-4 text-center border border-slate-900 print:border-black w-32">الكمية المطلوبة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 print:divide-black">
                  {stockItems.length > 0 ? (
                    stockItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-3 px-4 text-center font-mono text-slate-700 border border-slate-900 print:border-black print:text-black">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 border border-slate-900 print:border-black print:text-black">
                          {item.product_name}
                        </td>
                        <td className="py-3 px-4 text-center font-extrabold text-brand-700 print:text-black border border-slate-900 print:border-black text-base">
                          {item.total_quantity}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-slate-500 border border-slate-900 print:border-black print:text-black">
                        {isArabic
                          ? 'لا توجد فواتير أو أصناف مسجلة في الفترة المحددة.'
                          : 'No invoices or stock items found in selected period.'}
                      </td>
                    </tr>
                  )}
                </tbody>
                {stockItems.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-100 font-extrabold text-slate-950 border-t-2 border-slate-900 print:bg-slate-200 print:border-black print:text-black">
                      <td colSpan={2} className="py-3.5 px-4 text-right border border-slate-900 print:border-black text-base">
                        إجمالي عدد الأصناف: {stockItems.length}
                      </td>
                      <td className="py-3.5 px-4 text-center border border-slate-900 print:border-black text-lg text-emerald-700 print:text-black">
                        {totalQuantitySum}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Note / Disclaimer */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 flex items-center justify-between print:border-black print:text-black">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  {isArabic
                    ? 'هذا التقرير مجمع تلقائياً بناءً على أصناف الفواتير السحابية المحفوظة في قاعدة بيانات الصفوة.'
                    : 'Automatically aggregated from cloud sales invoices stored in database.'}
                </span>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
