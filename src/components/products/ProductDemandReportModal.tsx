import React, { useState, useMemo } from 'react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { useLanguage } from '@/hooks/useLanguage';
import { useToast } from '@/context/ToastContext';
import { APP_CONFIG } from '@/utils/constants';
import type { ProductDemandReportItem } from '@/services/productDemandService';
import {
  paginateProductDemandReport,
  MAX_CUSTOMER_ROWS_PER_QUADRANT,
} from '@/utils/productDemandPagination';
import { downloadDemandDistributionPDF } from '@/utils/productDemandPdfGenerator';
import {
  Printer,
  Download,
  X,
  Activity,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Boxes,
} from 'lucide-react';

interface ProductDemandReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportItems: ProductDemandReportItem[];
  preselectedProductId?: string | null;
}

export const ProductDemandReportModal: React.FC<ProductDemandReportModalProps> = ({
  isOpen,
  onClose,
  reportItems,
  preselectedProductId = null,
}) => {
  const { isArabic } = useLanguage();
  const { showSuccess, showError } = useToast();

  const [filterMode, setFilterMode] = useState<'withDemand' | 'all' | 'single'>(
    preselectedProductId ? 'single' : 'withDemand'
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<{ current: number; total: number } | null>(null);

  // Filter items based on user choice
  const filteredItems = useMemo(() => {
    let items = reportItems;

    if (filterMode === 'single' && preselectedProductId) {
      items = items.filter((p) => p.productId === preselectedProductId);
    } else if (filterMode === 'withDemand') {
      items = items.filter((p) => p.totalRequested > 0);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      items = items.filter(
        (p) =>
          p.productName.toLowerCase().includes(term) ||
          (p.productCode && p.productCode.toLowerCase().includes(term))
      );
    }

    return items;
  }, [reportItems, filterMode, preselectedProductId, searchTerm]);

  // Paginate items into 2x2 grid A4 pages
  const pages = useMemo(() => {
    return paginateProductDemandReport(filteredItems, MAX_CUSTOMER_ROWS_PER_QUADRANT);
  }, [filteredItems]);

  if (!isOpen) return null;

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = 'تقرير توزيع وطلب الأصناف - الصفوة ميديكال جروب';
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  const handleDownloadPDF = async () => {
    try {
      setIsGeneratingPdf(true);
      setPdfProgress({ current: 0, total: pages.length });
      const fileName = `AlSafwa_Demand_Distribution_${new Date().toISOString().slice(0, 10)}.pdf`;
      await downloadDemandDistributionPDF(
        'printable-demand-report',
        fileName,
        (current, total) => setPdfProgress({ current, total })
      );
      showSuccess(isArabic ? 'تم تحميل ملف PDF بنجاح' : 'Report PDF downloaded successfully');
    } catch (err: any) {
      console.error('PDF Generation Error:', err);
      showError(isArabic ? 'فشل إنشاء ملف PDF للتقرير' : 'Failed to generate PDF');
    } finally {
      setIsGeneratingPdf(false);
      setPdfProgress(null);
    }
  };

  const totalDemandAll = filteredItems.reduce((acc, item) => acc + item.totalRequested, 0);
  const totalStockAll = filteredItems.reduce((acc, item) => acc + item.currentStock, 0);
  const totalIncomingAll = filteredItems.reduce((acc, item) => acc + item.incoming, 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-slate-100 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[96vh] flex flex-col overflow-hidden"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar (Screen Only) */}
        <div className="bg-white px-6 py-4 border-b border-surface-200 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold shadow-sm">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-surface-900">
                {isArabic ? 'تقرير توزيع طلبات الأصناف والمخزون' : 'Product Demand & Stock Distribution Report'}
              </h2>
              <p className="text-xs text-surface-500">
                {isArabic
                  ? 'تنسيق قياسي معتمد: 4 أصناف بكل صفحة A4 (شبكة 2×2) لتسهيل توزيع المخزون'
                  : 'Standard 4-up (2x2 grid) A4 format for warehouse manager allocation'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              icon={<Printer className="w-4 h-4" />}
            >
              {isArabic ? 'طباعة التقرير' : 'Print'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleDownloadPDF}
              isLoading={isGeneratingPdf}
              icon={<Download className="w-4 h-4" />}
            >
              {isGeneratingPdf
                ? pdfProgress
                  ? `جاري التحميل (${pdfProgress.current}/${pdfProgress.total})...`
                  : 'جاري إنشاء PDF...'
                : isArabic
                ? 'تحميل PDF (A4)'
                : 'Download PDF (A4)'}
            </Button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-colors ml-2"
              title={isArabic ? 'إغلاق' : 'Close'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Controls Bar (Screen Only) */}
        <div className="bg-white/80 px-6 py-3 border-b border-surface-200 shrink-0 flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-bold text-surface-700 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-brand-600" />
              {isArabic ? 'نطاق التقرير:' : 'Report Scope:'}
            </span>
            <button
              type="button"
              onClick={() => setFilterMode('withDemand')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all border ${
                filterMode === 'withDemand'
                  ? 'bg-brand-600 text-white border-brand-600 shadow-xs'
                  : 'bg-white text-surface-700 border-surface-200 hover:bg-surface-50'
              }`}
            >
              {isArabic
                ? `الأصناف المطلوبة فقط (${reportItems.filter((i) => i.totalRequested > 0).length})`
                : `Products with Demand (${reportItems.filter((i) => i.totalRequested > 0).length})`}
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all border ${
                filterMode === 'all'
                  ? 'bg-brand-600 text-white border-brand-600 shadow-xs'
                  : 'bg-white text-surface-700 border-surface-200 hover:bg-surface-50'
              }`}
            >
              {isArabic ? `جميع الأصناف (${reportItems.length})` : `All Products (${reportItems.length})`}
            </button>
            {preselectedProductId && (
              <button
                type="button"
                onClick={() => setFilterMode('single')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all border ${
                  filterMode === 'single'
                    ? 'bg-brand-600 text-white border-brand-600 shadow-xs'
                    : 'bg-white text-surface-700 border-surface-200 hover:bg-surface-50'
                }`}
              >
                {isArabic ? 'الصنف الحالي فقط' : 'Current Product Only'}
              </button>
            )}
          </div>

          <div className="w-full sm:w-64">
            <Input
              type="text"
              placeholder={isArabic ? 'تصفية الصنف...' : 'Filter product...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-xs py-1"
              icon={<Search className="w-3.5 h-3.5" />}
            />
          </div>
        </div>

        {/* Scrollable Container with the Rendered A4 Pages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 bg-slate-200/70">
          {pages.length === 0 ? (
            <div className="bg-white p-12 rounded-xl text-center text-surface-500 shadow-sm max-w-md mx-auto">
              <Boxes className="w-12 h-12 text-surface-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-surface-800">
                {isArabic ? 'لا توجد أصناف مطابقة للتصفية المحددة' : 'No products match selected filter'}
              </p>
              <p className="text-xs text-surface-500 mt-1">
                {isArabic
                  ? 'يمكنك تغيير خيار التصفية لعرض جميع الأصناف.'
                  : 'Switch filter to display all products in the catalog.'}
              </p>
            </div>
          ) : (
            /* Printable Report Container */
            <div id="printable-demand-report" className="space-y-8 print:space-y-0" dir="rtl">
              {pages.map((page) => (
                <div
                  key={page.pageNumber}
                  className="a4-report-page bg-white shadow-xl mx-auto rounded-lg print:rounded-none print:shadow-none print:m-0"
                  style={{
                    width: '794px',
                    minHeight: '1123px',
                    maxHeight: '1123px',
                    height: '1123px',
                    padding: '24px 28px',
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    overflow: 'hidden',
                    direction: 'rtl',
                    fontFamily: 'Cairo, system-ui, -apple-system, sans-serif',
                  }}
                  data-page-number={page.pageNumber}
                >
                  {/* Page Header */}
                  <div className="border-b-2 border-slate-900 pb-2 mb-3 shrink-0 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded bg-slate-900 text-white flex items-center justify-center font-bold">
                          <Activity className="w-4 h-4" />
                        </div>
                        <h1 className="text-base font-black text-slate-900 leading-tight">
                          {APP_CONFIG.nameAr}
                        </h1>
                      </div>
                      <p className="text-[11px] text-slate-700 font-bold mt-0.5">
                        تقرير توزيع طلبات الأصناف والمخزون — تقرير الموزع والمدير
                      </p>
                    </div>

                    <div className="text-left text-[10px] text-slate-600 space-y-0.5">
                      <p className="font-bold text-slate-900">
                        صفحة <span className="font-mono text-xs">{page.pageNumber}</span> من{' '}
                        <span className="font-mono text-xs">{page.totalPages}</span>
                      </p>
                      <p>تاريخ الاستخراج: {new Date().toLocaleDateString('ar-EG')}</p>
                      <p className="text-[9px] text-slate-500 font-mono">
                        {new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  {/* 2x2 Grid Container (Takes remaining height) */}
                  <div
                    className="grid grid-cols-2 grid-rows-2 gap-3 flex-1"
                    style={{
                      height: '1010px',
                      maxHeight: '1010px',
                    }}
                  >
                    {page.quadrants.map((q, qIdx) => {
                      if (q.isPlaceholder) {
                        return (
                          <div
                            key={q.blockId || qIdx}
                            className="border border-dashed border-slate-200 rounded-lg p-3 bg-slate-50/40 flex items-center justify-center text-slate-300 text-xs"
                          >
                            <span>— نهاية محتوى التقرير —</span>
                          </div>
                        );
                      }

                      const net = q.netShortage;
                      const hasShortage = net > 0;
                      const hasSurplus = net < 0;

                      return (
                        <div
                          key={q.blockId}
                          className="border-2 border-slate-900 rounded-lg p-2.5 bg-white flex flex-col justify-between overflow-hidden shadow-xs"
                          style={{
                            height: '495px',
                            maxHeight: '495px',
                            boxSizing: 'border-box',
                          }}
                        >
                          {/* Quadrant Header */}
                          <div>
                            {/* Product Title Bar */}
                            <div className="flex items-start justify-between gap-1.5 border-b border-slate-300 pb-1.5 mb-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h3 className="font-black text-[12px] text-slate-950 leading-normal line-clamp-1">
                                    {q.productName}
                                  </h3>
                                  {q.isContinued && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 leading-none">
                                      (تابع {q.chunkIndex + 1}/{q.totalChunks})
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 text-[9.5px] text-slate-500 font-mono leading-normal">
                                  {q.productCode && (
                                    <span className="font-bold text-brand-700">كود: {q.productCode}</span>
                                  )}
                                  {q.itemNumber && <span>رقم: {q.itemNumber}</span>}
                                </div>
                              </div>
                            </div>

                            {/* Metrics Summary Strip (4 KPI Cells) */}
                            <div className="grid grid-cols-4 gap-1.5 mb-2 text-center text-[10px]">
                              {/* Requested */}
                              <div className="bg-slate-100 py-1 px-1.5 rounded border border-slate-300">
                                <span className="block text-slate-600 text-[8.5px] font-semibold leading-normal">المطلوب</span>
                                <span className="font-black text-slate-900 text-xs font-mono leading-normal">{q.totalRequested}</span>
                              </div>

                              {/* Current Stock */}
                              <div className="bg-slate-100 py-1 px-1.5 rounded border border-slate-300">
                                <span className="block text-slate-600 text-[8.5px] font-semibold leading-normal">المخزون</span>
                                <span className="font-black text-slate-900 text-xs font-mono leading-normal">{q.currentStock}</span>
                              </div>

                              {/* Incoming */}
                              <div className="bg-emerald-50 py-1 px-1.5 rounded border border-emerald-300">
                                <span className="block text-emerald-800 text-[8.5px] font-semibold leading-normal">الوارد</span>
                                <span className="font-black text-emerald-950 text-xs font-mono leading-normal">{q.incoming}</span>
                              </div>

                              {/* Net Shortage / Surplus */}
                              <div
                                className={`py-1 px-1.5 rounded border ${
                                  hasShortage
                                    ? 'bg-red-50 border-red-300 text-red-700'
                                    : hasSurplus
                                    ? 'bg-emerald-100/70 border-emerald-400 text-emerald-800'
                                    : 'bg-slate-100 border-slate-300 text-slate-700'
                                }`}
                              >
                                <span className="block text-[8.5px] font-semibold leading-normal">
                                  {hasShortage ? 'عجز' : hasSurplus ? 'فائض' : 'الرصيد'}
                                </span>
                                <span className="font-black text-xs font-mono leading-normal">
                                  {hasShortage
                                    ? `-${net}`
                                    : hasSurplus
                                    ? `+${Math.abs(net)}`
                                    : '0'}
                                </span>
                              </div>
                            </div>

                            {/* Customer Demand Table */}
                            <div className="overflow-hidden border border-slate-900 rounded">
                              <table className="w-full text-[10.5px] border-collapse">
                                <thead>
                                  <tr className="bg-slate-200 text-slate-950 font-bold border-b border-slate-900">
                                    <th className="py-1.5 px-2.5 text-right border-l border-slate-900 leading-normal align-middle">العميل</th>
                                    <th className="py-1.5 px-2 text-center border-l border-slate-900 w-24 leading-normal align-middle">الفاتورة</th>
                                    <th className="py-1.5 px-2 text-center w-14 leading-normal align-middle">الكمية</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-300">
                                  {q.customerRows && q.customerRows.length > 0 ? (
                                    q.customerRows.map((row, rIdx) => (
                                      <tr key={rIdx} className="hover:bg-slate-50">
                                        <td className="py-1.5 px-2.5 text-right font-medium text-slate-900 border-l border-slate-300 leading-normal align-middle break-words">
                                          {row.customerName}
                                        </td>
                                        <td className="py-1.5 px-1.5 text-center font-mono text-[9px] text-slate-700 border-l border-slate-300 leading-normal align-middle">
                                          <div className="flex items-center justify-center gap-1">
                                            <span>{row.invoiceNumber}</span>
                                            {row.isBonus && (
                                              <span className="text-[8px] bg-amber-100 text-amber-800 px-1 py-0.5 rounded font-bold leading-none">
                                                بونص
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                        <td className="py-1.5 px-2 text-center font-extrabold text-brand-700 font-mono text-[10.5px] leading-normal align-middle">
                                          {row.quantity}
                                        </td>
                                      </tr>
                                    ))
                                  ) : (
                                    <tr>
                                      <td colSpan={3} className="py-5 text-center text-slate-400 text-[10px] leading-relaxed">
                                        لا توجد طلبات فواتير مسجلة لهذا الصنف
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Quadrant Footer */}
                          <div className="pt-2 border-t border-slate-300 mt-2 flex items-center justify-between text-[10px] leading-normal">
                            {q.hasMoreChunks ? (
                              <span className="text-[9px] text-amber-800 font-bold leading-normal">
                                الدفعة: {q.chunkSubtotal} وحدة (يتبع في الصفحة التالية...)
                              </span>
                            ) : q.isContinued ? (
                              <span className="text-[9px] text-emerald-800 font-bold leading-normal">
                                اكتمل الصنف — إجمالي المطلوب: {q.totalRequested} وحدة
                              </span>
                            ) : (
                              <span className="text-slate-600 font-bold leading-normal">
                                عدد الطلبات: {q.customerRows.length}
                              </span>
                            )}

                            <span className="font-black text-slate-950 font-mono text-[11px] leading-normal">
                              إجمالي الصنف: {q.totalRequested}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Page Footer */}
                  <div className="pt-2 border-t border-slate-300 text-[9px] text-slate-500 flex items-center justify-between shrink-0">
                    <span>الصفوة ميديكال جروب — نظام إدارة الفواتير والمخزون</span>
                    <span className="font-bold">
                      صفحة {page.pageNumber} من {page.totalPages}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
