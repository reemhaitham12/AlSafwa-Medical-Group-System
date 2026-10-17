import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/context/ToastContext';
import {
  productDemandService,
  type ProductDemandDetailsData,
  type ProductDemandReportItem,
} from '@/services/productDemandService';
import { ProductDemandReportModal } from '@/components/products/ProductDemandReportModal';
import { formatCurrency, formatDate } from '@/utils/formatters';
import {
  ArrowRight,
  Package,
  Truck,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  FileText,
  Printer,
  Boxes,
  Users,
  Calendar,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';

export const ProductDemandDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isArabic } = useLanguage();
  const { user, isConfigured, isViewer } = useAuth();
  const { showError } = useToast();

  const [data, setData] = useState<ProductDemandDetailsData | null>(null);
  const [allReportItems, setAllReportItems] = useState<ProductDemandReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportModalSingle, setReportModalSingle] = useState(false);

  const fetchDetails = async () => {
    if (!id || !isConfigured || !user) return;
    setLoading(true);
    try {
      const [details, allItems] = await Promise.all([
        productDemandService.getProductDemandDetails(id),
        productDemandService.getAllProductsDemandReportData(),
      ]);
      setData(details);
      setAllReportItems(allItems);
    } catch (err: any) {
      console.error('Failed to load product demand details:', err);
      showError(err?.message || (isArabic ? 'فشل تحميل تفاصيل طلب المنتج' : 'Failed to load details'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConfigured && user && id) {
      fetchDetails();
    }
  }, [id, user, isConfigured]);

  if (loading) {
    return (
      <div className="py-20 flex justify-center" dir="rtl">
        <LoadingSpinner
          label={isArabic ? 'جاري تحميل تفاصيل طلب ومخزون المنتج...' : 'Loading product demand details...'}
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-16 text-center space-y-4" dir="rtl">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-lg font-bold text-surface-900">
          {isArabic ? 'لم يتم العثور على بيانات المنتج' : 'Product data not found'}
        </h2>
        <Button variant="outline" onClick={() => navigate('/products')}>
          {isArabic ? 'العودة إلى قائمة المنتجات' : 'Back to Products'}
        </Button>
      </div>
    );
  }

  const { product, totalRequested, currentStock, incoming, netShortage, status, customerItems, customerSummaries, stockBatches, incomingBatches } = data;

  const hasShortage = netShortage > 0;
  const hasSurplus = netShortage < 0;
  const isCovered = netShortage === 0;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/products')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-800 transition-colors mb-2"
          >
            <ArrowRight className="w-4 h-4" />
            <span>{isArabic ? 'العودة إلى كتالوج المنتجات' : 'Back to Products Catalog'}</span>
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-surface-900 tracking-tight">
              {product.name}
            </h1>
            {product.product_code && (
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-brand-50 text-brand-700 border border-brand-200">
                {product.product_code}
              </span>
            )}
            {product.item_number && (
              <span className="text-xs text-surface-500 font-mono">
                #{product.item_number}
              </span>
            )}
          </div>
          <p className="text-xs text-surface-500 mt-1">
            {product.category || 'General'} | {formatCurrency(product.price, isArabic)}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setReportModalSingle(true);
              setReportModalOpen(true);
            }}
            icon={<Printer className="w-4 h-4" />}
          >
            {isArabic ? 'تقرير هذا الصنف (A4)' : 'Report for this product'}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setReportModalSingle(false);
              setReportModalOpen(true);
            }}
            icon={<Boxes className="w-4 h-4" />}
          >
            {isArabic ? 'تقرير التوزيع الشامل (2×2)' : 'All Products Report (2x2)'}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={fetchDetails}
            icon={<RefreshCw className="w-4 h-4" />}
            title={isArabic ? 'تحديث البيانات' : 'Refresh'}
          />
        </div>
      </div>

      {/* ── Summary KPI Cards ───────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Requested */}
        <Card className="p-5 border-l-4 border-l-brand-500 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-surface-600">
              {isArabic ? 'إجمالي الكمية المطلوبة' : 'Total Requested'}
            </span>
            <Users className="w-4 h-4 text-brand-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-surface-900 font-mono">
              {totalRequested}
            </span>
            <span className="text-xs text-surface-500 font-medium">وحدة</span>
          </div>
          <p className="text-[11px] text-surface-400 mt-2">
            مجموع كميات فواتير العملاء المسجلة
          </p>
        </Card>

        {/* Current Stock */}
        <Card className="p-5 border-l-4 border-l-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-surface-600">
              {isArabic ? 'المخزون الحالي' : 'Current Stock'}
            </span>
            <Package className="w-4 h-4 text-slate-700" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 font-mono">
              {currentStock}
            </span>
            <span className="text-xs text-surface-500 font-medium">وحدة</span>
          </div>
          <p className="text-[11px] text-surface-400 mt-2">
            {stockBatches.length} {stockBatches.length === 1 ? 'دفعة مسجلة' : 'دفعات مسجلة بالمخزن'}
          </p>
        </Card>

        {/* Incoming */}
        <Card className="p-5 border-l-4 border-l-emerald-500 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-surface-600">
              {isArabic ? 'إجمالي الوارد' : 'Total Incoming'}
            </span>
            <Truck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-950 font-mono">
              {incoming}
            </span>
            <span className="text-xs text-surface-500 font-medium">وحدة</span>
          </div>
          <p className="text-[11px] text-surface-400 mt-2">
            {incomingBatches.length} {incomingBatches.length === 1 ? 'دفعة واردة متوقعة' : 'دفعات واردة'}
          </p>
        </Card>

        {/* Net Shortage / Surplus */}
        <Card
          className={`p-5 border-l-4 shadow-xs ${
            hasShortage
              ? 'border-l-red-500 bg-red-50/30'
              : hasSurplus
              ? 'border-l-emerald-500 bg-emerald-50/30'
              : 'border-l-brand-500 bg-brand-50/20'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-surface-700">
              {hasShortage
                ? isArabic ? 'العجز المتبقي' : 'Net Shortage'
                : hasSurplus
                ? isArabic ? 'الفائض المتاح' : 'Surplus Available'
                : isArabic ? 'حالة التغطية' : 'Coverage Balance'}
            </span>
            {hasShortage ? (
              <TrendingDown className="w-4 h-4 text-red-600" />
            ) : hasSurplus ? (
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-3xl font-black font-mono ${
                hasShortage
                  ? 'text-red-600'
                  : hasSurplus
                  ? 'text-emerald-700'
                  : 'text-surface-900'
              }`}
            >
              {hasShortage
                ? `${netShortage}`
                : hasSurplus
                ? `+${Math.abs(netShortage)}`
                : '0'}
            </span>
            <span className="text-xs text-surface-600 font-medium">وحدة</span>
          </div>
          <p
            className={`text-[11px] font-bold mt-2 ${
              hasShortage
                ? 'text-red-700'
                : hasSurplus
                ? 'text-emerald-700'
                : 'text-surface-600'
            }`}
          >
            {hasShortage
              ? `يوجد عجز قدره ${netShortage} وحدة لتلبية الطلبات`
              : hasSurplus
              ? `المخزون والوارد يغطيان الطلب بفائض ${Math.abs(netShortage)} وحدة`
              : 'المخزون الحالي والوارد يغطيان الطلبات تماماً'}
          </p>
        </Card>
      </div>

      {/* ── Customer Summaries Pill Bar (Aggregated Demand) ── */}
      {customerSummaries.length > 0 && (
        <Card className="p-4 bg-slate-50 border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-600" />
              <h2 className="text-xs font-bold text-surface-900">
                {isArabic ? 'تجميع طلبات العملاء لهذا الصنف:' : 'Customer Demand Summary:'}
              </h2>
            </div>
            <span className="text-xs text-surface-500 font-medium">
              {customerSummaries.length} {customerSummaries.length === 1 ? 'عميل' : 'عملاء'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {customerSummaries.map((cs) => (
              <div
                key={cs.customerName}
                className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-surface-200 text-xs shadow-2xs"
              >
                <span className="font-bold text-surface-900">{cs.customerName}</span>
                <span className="font-mono font-extrabold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                  {cs.totalQuantity} وحدة
                </span>
                {cs.invoiceCount > 1 && (
                  <span className="text-[10px] text-surface-500">
                    ({cs.invoiceCount} فواتير)
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Customer Demand Table ───────────────────────────── */}
      <Card>
        <div className="p-4 border-b border-surface-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-600" />
            <h2 className="text-sm font-bold text-surface-900">
              {isArabic ? 'تفاصيل طلبات الفواتير والعملاء' : 'Customer Invoices Demand Details'}
            </h2>
          </div>
          <span className="text-xs text-surface-500">
            {customerItems.length} {customerItems.length === 1 ? 'طلب مسجل' : 'طلبات مسجلة'}
          </span>
        </div>

        {customerItems.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right border-collapse">
              <thead className="bg-surface-50 text-surface-700 font-bold border-b border-surface-200">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">{isArabic ? 'اسم العميل' : 'Customer Name'}</th>
                  <th className="py-3 px-4 text-center">{isArabic ? 'رقم الفاتورة' : 'Invoice Number'}</th>
                  <th className="py-3 px-4 text-center">{isArabic ? 'تاريخ الفاتورة' : 'Invoice Date'}</th>
                  <th className="py-3 px-4 text-center">{isArabic ? 'سعر الوحدة' : 'Unit Price'}</th>
                  <th className="py-3 px-4 text-center">{isArabic ? 'الكمية المطلوبة' : 'Requested Quantity'}</th>
                  <th className="py-3 px-4 text-left">{isArabic ? 'الإجمالي' : 'Total'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {customerItems.map((item, idx) => (
                  <tr key={item.invoiceItemId} className="hover:bg-surface-50/80 transition-colors">
                    <td className="py-3 px-4 text-center font-mono text-surface-400">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 font-bold text-surface-900">
                      {item.customerName}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                      <div className="flex items-center justify-center gap-1.5">
                        <span>{item.invoiceNumber}</span>
                        {item.isBonus && (
                          <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                            ⭐ بونص
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center text-surface-600">
                      {formatDate(item.invoiceDate, isArabic)}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-surface-700">
                      {formatCurrency(item.unitPrice, isArabic)}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-extrabold text-brand-700 text-sm">
                      {item.quantity}
                    </td>
                    <td className="py-3 px-4 text-left font-mono font-bold text-surface-900">
                      {formatCurrency(item.totalPrice, isArabic)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-surface-100/80 font-black text-surface-900 border-t-2 border-surface-300">
                  <td colSpan={5} className="py-3 px-4 text-right text-sm">
                    {isArabic ? 'الإجمالي الكلي للكميات المطلوبة لهذا الصنف:' : 'Grand Total Requested Quantity:'}
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-black text-base text-brand-700">
                    {totalRequested}
                  </td>
                  <td className="py-3 px-4 text-left font-mono font-bold text-surface-900">
                    {formatCurrency(
                      customerItems.reduce((acc, i) => acc + i.totalPrice, 0),
                      isArabic
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-surface-500 space-y-2">
            <Users className="w-10 h-10 text-surface-300 mx-auto" />
            <p className="text-sm font-medium">
              {isArabic ? 'لا توجد فواتير أو طلبات عملاء لهذا الصنف حالياً' : 'No invoices request this product yet'}
            </p>
          </div>
        )}
      </Card>

      {/* ── Inventory Batches Details (Stock & Incoming) ────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Stock Batches */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-surface-100">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-700" />
              <h2 className="text-sm font-bold text-surface-900">
                {isArabic ? 'دفعات المخزون الحالي' : 'Current Stock Batches'}
              </h2>
            </div>
            <span className="text-xs font-bold font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
              الإجمالي: {currentStock} وحدة
            </span>
          </div>

          {stockBatches.length > 0 ? (
            <div className="space-y-2 text-xs">
              {stockBatches.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-surface-50 border border-surface-200"
                >
                  <div>
                    <span className="font-bold text-surface-900 text-sm font-mono">{b.quantity} وحدة</span>
                    {b.expiry_date && (
                      <p className="text-[11px] text-surface-500 mt-0.5">
                        صلاحية: <span className="font-bold text-surface-700 font-mono">{b.expiry_date}</span>
                      </p>
                    )}
                  </div>
                  <Badge variant="neutral">مخزون فعلي</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-surface-400 italic py-4 text-center">
              لا توجد دفعات مخزون مسجلة لهذا الصنف في صفحة المخزون
            </p>
          )}

          {!isViewer && (
            <div className="mt-4 pt-3 border-t border-surface-100 flex justify-end">
              <Link
                to="/inventory"
                className="text-xs font-bold text-brand-600 hover:text-brand-800 inline-flex items-center gap-1"
              >
                <span>إدارة دفعات المخزون</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </Card>

        {/* Incoming Batches */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-surface-100">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-surface-900">
                {isArabic ? 'دفعات الوارد المنتظر' : 'Incoming Batches'}
              </h2>
            </div>
            <span className="text-xs font-bold font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              الإجمالي: {incoming} وحدة
            </span>
          </div>

          {incomingBatches.length > 0 ? (
            <div className="space-y-2 text-xs">
              {incomingBatches.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/50 border border-emerald-200"
                >
                  <div>
                    <span className="font-bold text-surface-900 text-sm font-mono">{b.quantity} وحدة</span>
                    {b.expiry_date && (
                      <p className="text-[11px] text-emerald-800 mt-0.5">
                        صلاحية: <span className="font-bold font-mono">{b.expiry_date}</span>
                      </p>
                    )}
                  </div>
                  <Badge variant="success">وارد متوقع</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-surface-400 italic py-4 text-center">
              لا توجد دفعات واردة مسجلة لهذا الصنف في صفحة المخزون
            </p>
          )}

          {!isViewer && (
            <div className="mt-4 pt-3 border-t border-surface-100 flex justify-end">
              <Link
                to="/inventory"
                className="text-xs font-bold text-brand-600 hover:text-brand-800 inline-flex items-center gap-1"
              >
                <span>إدارة دفعات الوارد</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </Card>
      </div>

      {/* ── Report Modal ────────────────────────────────────── */}
      <ProductDemandReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        reportItems={allReportItems}
        preselectedProductId={reportModalSingle ? product.id : null}
      />
    </div>
  );
};
