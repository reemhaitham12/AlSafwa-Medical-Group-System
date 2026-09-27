import React, { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/context/ToastContext';
import { invoicesService } from '@/services/invoicesService';
import { inventoryService } from '@/services/inventoryService';
import { productsService } from '@/services/productsService';
import { downloadInventoryPDF } from '@/utils/inventoryPdfGenerator';
import { APP_CONFIG } from '@/utils/constants';
import type { InventoryStock, InventoryIncoming, Product } from '@/lib/database.types';
import {
  Printer,
  Download,
  RefreshCw,
  Calendar,
  Activity,
  Plus,
  X,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Package,
  TruckIcon,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────

type DateFilterType = 'today' | 'week' | 'month' | 'custom' | 'all';

type BatchType = 'stock' | 'incoming';

interface BatchFormState {
  open: boolean;
  type: BatchType;
  editingId: string | null;
  productId: string;
  productNameSnapshot: string;
  quantity: string;
  expiryDate: string;
}

interface InventoryRow {
  productName: string;
  currentStock: number;
  incoming: number;
  available: number;
  requiredFromInvoices: number;
  difference: number;
  stockBatches: InventoryStock[];
  incomingBatches: InventoryIncoming[];
}

// ─── Date helpers (same logic as StockOrder.tsx) ──────────────

function getDateRangeBounds(
  dateFilter: DateFilterType,
  customStartDate: string,
  customEndDate: string
): { startIso?: string; endIso?: string } {
  const now = new Date();

  if (dateFilter === 'today') {
    const s = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const e = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { startIso: s.toISOString(), endIso: e.toISOString() };
  }
  if (dateFilter === 'week') {
    const s = new Date(now);
    s.setDate(now.getDate() - 7);
    s.setHours(0, 0, 0, 0);
    const e = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { startIso: s.toISOString(), endIso: e.toISOString() };
  }
  if (dateFilter === 'month') {
    const s = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const e = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { startIso: s.toISOString(), endIso: e.toISOString() };
  }
  if (dateFilter === 'custom') {
    let startIso: string | undefined;
    let endIso: string | undefined;
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
    return { startIso, endIso };
  }
  // 'all'
  return {};
}

function getDateFilterLabel(
  dateFilter: DateFilterType,
  customStartDate: string,
  customEndDate: string
): string {
  const todayStr = new Date().toLocaleDateString('ar-EG');
  switch (dateFilter) {
    case 'today':   return `اليوم (${todayStr})`;
    case 'week':    return 'هذا الأسبوع';
    case 'month':   return 'هذا الشهر';
    case 'custom':  return `مخصص (${customStartDate || '...'} إلى ${customEndDate || '...'})`;
    default:        return 'جميع الفواتير (الكل)';
  }
}

// ─── Batch Form Modal ────────────────────────────────────────

interface BatchModalProps {
  form: BatchFormState;
  products: Product[];
  onClose: () => void;
  onChange: (patch: Partial<BatchFormState>) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

const BatchModal: React.FC<BatchModalProps> = ({
  form,
  products,
  onClose,
  onChange,
  onSubmit,
  isSubmitting,
}) => {
  const isEditing = Boolean(form.editingId);
  const isStock = form.type === 'stock';

  const title = isEditing
    ? isStock
      ? `تعديل دفعة المخزون الحالي — ${form.productNameSnapshot}`
      : `تعديل دفعة الوارد — ${form.productNameSnapshot}`
    : isStock
      ? 'إضافة مخزون حالي جديد'
      : 'إضافة وارد جديد';

  const subtitle = isEditing
    ? 'تعديل الصنف والكمية وتاريخ الصلاحية لهذه الدفعة'
    : 'إضافة دفعة جديدة للمنتج وتحديد كميتها وتاريخ صلاحيتها';

  const isFormValid =
    Boolean(form.productId || form.productNameSnapshot) &&
    Boolean(form.quantity && Number(form.quantity) >= 0) &&
    Boolean(form.expiryDate && form.expiryDate.trim());

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-surface-900">{title}</h2>
              {isEditing && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  تعديل دفعة
                </span>
              )}
            </div>
            <p className="text-xs text-surface-500 mt-0.5">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Product */}
          <div>
            <label className="block text-xs font-semibold text-surface-700 mb-1.5">
              المنتج <span className="text-red-500">*</span>
            </label>
            <select
              className="block w-full rounded-lg border border-surface-200 bg-white py-2 px-3 text-sm text-surface-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-colors"
              value={form.productId}
              onChange={(e) => {
                const selected = products.find((p) => p.id === e.target.value);
                onChange({
                  productId: e.target.value,
                  productNameSnapshot: selected?.name || form.productNameSnapshot,
                });
              }}
            >
              <option value="">-- اختر منتجاً --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
              {/* If editing a product not currently in active list */}
              {isEditing && form.productId && !products.some((p) => p.id === form.productId) && (
                <option value={form.productId}>
                  {form.productNameSnapshot}
                </option>
              )}
            </select>
          </div>

          {/* Quantity */}
          <Input
            label="الكمية (وحدة)"
            type="number"
            min="0"
            step="1"
            value={form.quantity}
            onChange={(e) => onChange({ quantity: e.target.value })}
            placeholder="0"
            required
          />

          {/* Expiry Date */}
          <div>
            <label className="block text-xs font-semibold text-surface-700 mb-1.5">
              تاريخ الصلاحية <span className="text-red-500">*</span>
              <span className="font-normal text-surface-400 mr-1">
                (يوم / شهر / سنة — يقبل 2027، 2028، 2030 وما بعده)
              </span>
            </label>
            <input
              type="date"
              required
              min="2000-01-01"
              max="2099-12-31"
              className="block w-full rounded-lg border border-surface-200 bg-white py-2 px-3 text-sm text-surface-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-colors"
              value={form.expiryDate}
              onChange={(e) => onChange({ expiryDate: e.target.value })}
            />
            <p className="text-[11px] text-surface-400 mt-1">
              متاح تحديد أي تاريخ صلاحية مستقبلي (مثال: 2028-05-15، 2030-02-01)
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-surface-100">
          <Button variant="outline" size="sm" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onSubmit}
            isLoading={isSubmitting}
            disabled={!isFormValid}
          >
            {isEditing ? 'حفظ التعديلات' : 'إضافة الدفعة'}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─── Batch Details Modal ─────────────────────────────────────

interface BatchDetailsModalProps {
  productName: string;
  stockBatches: InventoryStock[];
  incomingBatches: InventoryIncoming[];
  onClose: () => void;
  onEditBatch: (type: BatchType, batch: InventoryStock | InventoryIncoming) => void;
  onDeleteBatch: (type: BatchType, id: string) => void;
}

const BatchDetailsModal: React.FC<BatchDetailsModalProps> = ({
  productName,
  stockBatches,
  incomingBatches,
  onClose,
  onEditBatch,
  onDeleteBatch,
}) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
    onClick={onClose}
  >
    <div
      className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col"
      dir="rtl"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 shrink-0">
        <h2 className="text-base font-bold text-surface-900">
          تفاصيل الدفعات — {productName}
        </h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
        {/* Current Stock Batches */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-brand-600" />
              <h3 className="text-sm font-bold text-surface-800">المخزون الحالي</h3>
            </div>
            <span className="text-xs text-surface-500 font-medium">
              {stockBatches.length} دفعة
            </span>
          </div>
          {stockBatches.length === 0 ? (
            <p className="text-xs text-surface-400 italic">لا توجد دفعات مخزون حالي</p>
          ) : (
            <div className="space-y-2">
              {stockBatches.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between bg-surface-50 rounded-xl p-3 border border-surface-200"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-surface-900">{b.quantity} وحدة</span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-brand-100 text-brand-700">
                        مخزون حالي
                      </span>
                    </div>
                    {b.expiry_date && (
                      <p className="text-xs text-surface-500 mt-1">
                        تاريخ الصلاحية: <span className="font-bold text-surface-700">{b.expiry_date}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEditBatch('stock', b)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 transition-colors shadow-xs"
                      title="تعديل هذه الدفعة"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>تعديل</span>
                    </button>
                    <button
                      onClick={() => onDeleteBatch('stock', b.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                      title="حذف هذه الدفعة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Incoming Batches */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TruckIcon className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-surface-800">الوارد</h3>
            </div>
            <span className="text-xs text-surface-500 font-medium">
              {incomingBatches.length} دفعة
            </span>
          </div>
          {incomingBatches.length === 0 ? (
            <p className="text-xs text-surface-400 italic">لا توجد دفعات واردة</p>
          ) : (
            <div className="space-y-2">
              {incomingBatches.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between bg-emerald-50/60 rounded-xl p-3 border border-emerald-200"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-surface-900">{b.quantity} وحدة</span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        وارد
                      </span>
                    </div>
                    {b.expiry_date && (
                      <p className="text-xs text-surface-600 mt-1">
                        تاريخ الصلاحية: <span className="font-bold text-surface-800">{b.expiry_date}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEditBatch('incoming', b)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-brand-700 bg-white hover:bg-brand-50 border border-brand-200 transition-colors shadow-xs"
                      title="تعديل هذه الدفعة"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>تعديل</span>
                    </button>
                    <button
                      onClick={() => onDeleteBatch('incoming', b.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                      title="حذف هذه الدفعة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-6 py-4 border-t border-surface-100 shrink-0">
        <Button variant="outline" size="sm" onClick={onClose} className="w-full">
          إغلاق
        </Button>
      </div>
    </div>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────

const EMPTY_FORM: BatchFormState = {
  open: false,
  type: 'stock',
  editingId: null,
  productId: '',
  productNameSnapshot: '',
  quantity: '',
  expiryDate: '',
};

export const Inventory: React.FC = () => {
  const { isArabic } = useLanguage();
  const { user, isConfigured } = useAuth();
  const { showSuccess, showError } = useToast();

  // ── Date filter (same as StockOrder) ───────────────────────
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // ── Data state ─────────────────────────────────────────────
  const [products, setProducts] = useState<Product[]>([]);
  const [stockBatches, setStockBatches] = useState<InventoryStock[]>([]);
  const [incomingBatches, setIncomingBatches] = useState<InventoryIncoming[]>([]);
  const [requiredMap, setRequiredMap] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // ── Batch modal ────────────────────────────────────────────
  const [form, setForm] = useState<BatchFormState>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Batch details modal ────────────────────────────────────
  const [detailsProduct, setDetailsProduct] = useState<string | null>(null);

  // ── Expanded rows (mobile) ─────────────────────────────────
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // ── Fetch all data ─────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    if (!isConfigured || !user) return;
    setLoading(true);
    try {
      const [allProducts, allStock, allIncoming] = await Promise.all([
        productsService.getAll(),
        inventoryService.getAllStock(),
        inventoryService.getAllIncoming(),
      ]);
      setProducts(allProducts);
      setStockBatches(allStock);
      setIncomingBatches(allIncoming);

      // Required from Invoices — same logic as StockOrder.tsx
      const { startIso, endIso } = getDateRangeBounds(dateFilter, customStartDate, customEndDate);
      const invoices = await invoicesService.getInvoicesByDateRange(startIso, endIso);
      const qtyMap = new Map<string, number>();
      invoices.forEach((inv) => {
        if (inv.items && Array.isArray(inv.items)) {
          inv.items.forEach((item) => {
            const name = item.product_name_snapshot?.trim();
            if (!name) return;
            qtyMap.set(name, (qtyMap.get(name) || 0) + (Number(item.quantity) || 0));
          });
        }
      });
      setRequiredMap(qtyMap);
    } catch (err: unknown) {
      console.error('Inventory fetch error:', err);
      showError('فشل تحميل بيانات المخزون');
    } finally {
      setLoading(false);
    }
  }, [isConfigured, user, dateFilter, customStartDate, customEndDate]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Build unified inventory rows ───────────────────────────

  const inventoryRows: InventoryRow[] = React.useMemo(() => {
    const nameMap = new Map<string, InventoryRow>();

    const ensure = (name: string) => {
      if (!nameMap.has(name)) {
        nameMap.set(name, {
          productName: name,
          currentStock: 0,
          incoming: 0,
          available: 0,
          requiredFromInvoices: 0,
          difference: 0,
          stockBatches: [],
          incomingBatches: [],
        });
      }
      return nameMap.get(name)!;
    };

    stockBatches.forEach((b) => {
      const row = ensure(b.product_name_snapshot);
      row.currentStock += b.quantity;
      row.stockBatches.push(b);
    });

    incomingBatches.forEach((b) => {
      const row = ensure(b.product_name_snapshot);
      row.incoming += b.quantity;
      row.incomingBatches.push(b);
    });

    requiredMap.forEach((qty, name) => {
      ensure(name).requiredFromInvoices = qty;
    });

    nameMap.forEach((row) => {
      row.available = row.currentStock + row.incoming;
      row.difference = row.available - row.requiredFromInvoices;
    });

    return Array.from(nameMap.values()).sort((a, b) =>
      a.productName.localeCompare(b.productName, 'ar')
    );
  }, [stockBatches, incomingBatches, requiredMap]);

  // ── Batch form handlers ────────────────────────────────────

  const openAddForm = (type: BatchType) => {
    setForm({ ...EMPTY_FORM, open: true, type });
  };

  const openEditForm = (type: BatchType, batch: InventoryStock | InventoryIncoming) => {
    setDetailsProduct(null);
    let matchedProductId = batch.product_id || '';
    if (!matchedProductId) {
      const match = products.find(
        (p) => p.name.trim().toLowerCase() === batch.product_name_snapshot.trim().toLowerCase()
      );
      if (match) matchedProductId = match.id;
    }

    let formattedDate = '';
    if (batch.expiry_date) {
      const raw = batch.expiry_date.trim();
      if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
        formattedDate = raw.slice(0, 10);
      } else if (/^\d{4}-\d{2}$/.test(raw)) {
        formattedDate = `${raw}-01`;
      }
    }

    setForm({
      open: true,
      type,
      editingId: batch.id,
      productId: matchedProductId,
      productNameSnapshot: batch.product_name_snapshot,
      quantity: String(batch.quantity),
      expiryDate: formattedDate,
    });
  };

  const closeForm = () => setForm(EMPTY_FORM);

  const handleFormChange = (patch: Partial<BatchFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const normalizeExpiryDate = (input: string): string | null => {
    if (!input) return null;
    const trimmed = input.trim();
    // Format: YYYY-MM-DD -> YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [year, month, day] = trimmed.split('-').map(Number);
      if (year >= 1990 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return trimmed;
      }
    }
    // Format: YYYY-MM -> YYYY-MM-01
    if (/^\d{4}-\d{2}$/.test(trimmed)) {
      const [year, month] = trimmed.split('-').map(Number);
      if (year >= 1990 && year <= 2100 && month >= 1 && month <= 12) {
        return `${trimmed}-01`;
      }
    }
    return null;
  };

  const handleFormSubmit = async () => {
    // 1. Validation
    const resolvedName =
      (form.productId ? products.find((p) => p.id === form.productId)?.name : null) ||
      form.productNameSnapshot ||
      '';

    if (!resolvedName) {
      showError('برجاء اختيار المنتج أو إدخال اسمه');
      return;
    }

    const qty = parseInt(form.quantity, 10);
    if (isNaN(qty) || qty < 0) {
      showError('برجاء إدخال كمية صحيحة (0 أو أكبر)');
      return;
    }

    if (!form.expiryDate || !form.expiryDate.trim()) {
      showError('تاريخ الصلاحية مطلوب');
      return;
    }

    const expiryDate = normalizeExpiryDate(form.expiryDate);
    if (!expiryDate) {
      showError('تاريخ الصلاحية غير صحيح (مثال: 2028-05-15 أو 2030-02-01)');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        product_id: form.productId || null,
        product_name_snapshot: resolvedName,
        quantity: qty,
        expiry_date: expiryDate,
      };

      if (form.type === 'stock') {
        if (form.editingId) {
          await inventoryService.updateStock(form.editingId, payload);
          showSuccess('تم تعديل دفعة المخزون بنجاح');
        } else {
          await inventoryService.createStock(payload);
          showSuccess('تمت إضافة دفعة المخزون بنجاح');
        }
      } else {
        if (form.editingId) {
          await inventoryService.updateIncoming(form.editingId, payload);
          showSuccess('تم تعديل دفعة الوارد بنجاح');
        } else {
          await inventoryService.createIncoming(payload);
          showSuccess('تمت إضافة دفعة الوارد بنجاح');
        }
      }

      closeForm();
      await fetchAll();
    } catch (err: any) {
      console.error('Batch submit error details:', err);
      const errorMsg =
        err?.message ||
        err?.details ||
        err?.hint ||
        (typeof err === 'string' ? err : 'خطأ غير معروف في حفظ الدفعة');
      showError(`فشل حفظ الدفعة: ${errorMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBatch = async (type: BatchType, id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الدفعة نهائياً؟')) return;
    try {
      if (type === 'stock') {
        await inventoryService.deleteStock(id);
        showSuccess('تم حذف دفعة المخزون بنجاح');
      } else {
        await inventoryService.deleteIncoming(id);
        showSuccess('تم حذف دفعة الوارد بنجاح');
      }
      setDetailsProduct(null);
      await fetchAll();
    } catch (err: any) {
      console.error('Delete batch error details:', err);
      const errorMsg =
        err?.message ||
        err?.details ||
        err?.hint ||
        (typeof err === 'string' ? err : 'خطأ أثناء الحذف');
      showError(`فشل حذف الدفعة: ${errorMsg}`);
    }
  };

  // ── Print ──────────────────────────────────────────────────

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = 'المنتجات والمخزون - الصفوة ميديكال جروب';
    window.print();
    setTimeout(() => { document.title = originalTitle; }, 1000);
  };

  const handleDownloadPDF = async () => {
    try {
      setIsGeneratingPdf(true);
      const fileName = `Inventory_${new Date().toISOString().slice(0, 10)}.pdf`;
      await downloadInventoryPDF('printable-inventory', fileName);
      showSuccess('تم تحميل ملف PDF بنجاح');
    } catch (err: unknown) {
      console.error('Inventory PDF Error:', err);
      showError('فشل إنشاء ملف PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // ── Details modal helpers ──────────────────────────────────

  const detailsRow = detailsProduct
    ? inventoryRows.find((r) => r.productName === detailsProduct) ?? null
    : null;

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="space-y-6" dir="rtl">
      {/* ── Modals ─────────────────────────────────────────── */}
      {form.open && (
        <BatchModal
          form={form}
          products={products}
          onClose={closeForm}
          onChange={handleFormChange}
          onSubmit={handleFormSubmit}
          isSubmitting={isSubmitting}
        />
      )}

      {detailsProduct && detailsRow && (
        <BatchDetailsModal
          productName={detailsRow.productName}
          stockBatches={detailsRow.stockBatches}
          incomingBatches={detailsRow.incomingBatches}
          onClose={() => setDetailsProduct(null)}
          onEditBatch={openEditForm}
          onDeleteBatch={handleDeleteBatch}
        />
      )}

      {/* ── Header Bar ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-surface-900">
            {isArabic ? 'المنتجات والمخزون' : 'Products & Inventory'}
          </h1>
          <p className="text-xs text-surface-500 mt-0.5">
            {isArabic
              ? 'إدارة المخزون الحالي والوارد ومقارنته بمتطلبات الفواتير'
              : 'Manage current and incoming stock vs. invoice requirements'}
          </p>
        </div>

        <div className="flex items-center gap-2 print:hidden flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openAddForm('stock')}
            icon={<Plus className="w-4 h-4" />}
          >
            {isArabic ? 'إضافة مخزون' : 'Add Stock'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => openAddForm('incoming')}
            icon={<Plus className="w-4 h-4" />}
          >
            {isArabic ? 'إضافة وارد' : 'Add Incoming'}
          </Button>
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
            {isArabic ? 'PDF' : 'PDF'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchAll}
            isLoading={loading}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            {isArabic ? 'تحديث' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* ── Date Filter Bar ─────────────────────────────────── */}
      <Card className="p-4 print:hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-surface-700 flex items-center gap-1.5 ml-2">
              <Calendar className="w-4 h-4 text-brand-600" />
              {isArabic ? 'تصفية الكمية المطلوبة حسب:' : 'Required Period:'}
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
                {f === 'today' ? (isArabic ? 'اليوم' : 'Today')
                  : f === 'week' ? (isArabic ? 'هذا الأسبوع' : 'This Week')
                  : f === 'month' ? (isArabic ? 'هذا الشهر' : 'This Month')
                  : f === 'custom' ? (isArabic ? 'مخصص' : 'Custom')
                  : (isArabic ? 'الكل' : 'All')}
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

      {/* ── Main Table Card ─────────────────────────────────── */}
      <Card>
        {loading ? (
          <LoadingSpinner label={isArabic ? 'جاري تحميل بيانات المخزون...' : 'Loading inventory...'} />
        ) : (
          /* Printable element */
          <div
            id="printable-inventory"
            className="p-6 bg-white rounded-xl font-sans text-slate-900 print:p-0 print:border-none print:shadow-none"
            dir="rtl"
          >
            {/* ── Report Header ─────────────────────────────── */}
            <div className="flex items-start justify-between border-b-2 border-brand-600 pb-4 mb-6 print:border-black">
              <div>
                <div className="flex items-center gap-2.5 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold print:bg-black">
                    <Activity className="w-5 h-5" />
                  </div>
                  <h1 className="text-xl font-black text-slate-900 print:text-black">
                    {APP_CONFIG.nameAr}
                  </h1>
                </div>
                <p className="text-xs text-slate-600 font-semibold print:text-black">
                  {isArabic ? 'تقرير المنتجات والمخزون' : 'Products & Inventory Report'}
                </p>
              </div>

              <div className="text-left text-xs text-slate-700 print:text-black space-y-1">
                <p className="font-bold">
                  الفترة:{' '}
                  <span className="font-normal">
                    {getDateFilterLabel(dateFilter, customStartDate, customEndDate)}
                  </span>
                </p>
                <p className="text-[11px] text-slate-500 print:text-black">
                  تاريخ الاستخراج:{' '}
                  {new Date().toLocaleDateString('ar-EG')} -{' '}
                  {new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            {/* ── Summary Table (6 columns) ─────────────────── */}
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm border-collapse border-2 border-slate-900 print:border-black">
                <thead>
                  <tr className="bg-slate-100 text-slate-950 font-bold border-b-2 border-slate-900 print:bg-slate-200 print:border-black print:text-black">
                    <th className="py-3 px-3 text-right border border-slate-900 print:border-black">#</th>
                    <th className="py-3 px-3 text-right border border-slate-900 print:border-black">
                      {isArabic ? 'المنتج' : 'Product'}
                    </th>
                    <th className="py-3 px-3 text-center border border-slate-900 print:border-black">
                      {isArabic ? 'المخزون الحالي' : 'Current Stock'}
                    </th>
                    <th className="py-3 px-3 text-center border border-slate-900 print:border-black">
                      {isArabic ? 'الوارد' : 'Incoming'}
                    </th>
                    <th className="py-3 px-3 text-center border border-slate-900 print:border-black">
                      {isArabic ? 'المتاح' : 'Available'}
                    </th>
                    <th className="py-3 px-3 text-center border border-slate-900 print:border-black">
                      {isArabic ? 'مطلوب من الفواتير' : 'Required from Invoices'}
                    </th>
                    <th className="py-3 px-3 text-center border border-slate-900 print:border-black">
                      {isArabic ? 'الفرق' : 'Difference'}
                    </th>
                    {/* Actions column — hidden in print */}
                    <th className="py-3 px-3 text-center border border-slate-900 print:hidden print:border-black">
                      {isArabic ? 'إجراءات' : 'Actions'}
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 print:divide-black">
                  {inventoryRows.length > 0 ? (
                    inventoryRows.map((row, idx) => {
                      const isExpanded = expandedRows.has(row.productName);
                      const diff = row.difference;
                      const diffColor =
                        diff > 0
                          ? 'text-emerald-700 font-extrabold'
                          : diff < 0
                          ? 'text-red-600 font-extrabold'
                          : 'text-slate-500 font-semibold';

                      return (
                        <React.Fragment key={row.productName}>
                          <tr className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-3 text-center font-mono text-slate-600 border border-slate-200 print:border-black print:text-black">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-3 font-bold text-slate-900 border border-slate-200 print:border-black print:text-black">
                              {row.productName}
                            </td>
                            <td className="py-3 px-3 text-center border border-slate-200 print:border-black print:text-black">
                              {row.currentStock}
                            </td>
                            <td className="py-3 px-3 text-center border border-slate-200 print:border-black print:text-black">
                              {row.incoming}
                            </td>
                            <td className="py-3 px-3 text-center font-bold text-brand-700 border border-slate-200 print:border-black print:text-black">
                              {row.available}
                            </td>
                            <td className="py-3 px-3 text-center border border-slate-200 print:border-black print:text-black">
                              {row.requiredFromInvoices}
                            </td>
                            <td className={`py-3 px-3 text-center border border-slate-200 print:border-black print:text-black ${diffColor}`}>
                              {diff > 0 ? `+${diff}` : diff}
                            </td>
                            {/* Actions — hidden on print */}
                            <td className="py-3 px-3 text-center border border-slate-200 print:hidden print:border-black">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => setDetailsProduct(row.productName)}
                                  className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors border border-brand-200"
                                  title="عرض وتعديل تفاصيل الدفعات"
                                >
                                  {isArabic
                                    ? `الدفعات (${row.stockBatches.length + row.incomingBatches.length})`
                                    : `Batches (${row.stockBatches.length + row.incomingBatches.length})`}
                                </button>
                                <button
                                  onClick={() =>
                                    setExpandedRows((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(row.productName)) next.delete(row.productName);
                                      else next.add(row.productName);
                                      return next;
                                    })
                                  }
                                  className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                  title={isExpanded ? 'طي' : 'توسيع'}
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Inline expanded batches (screen only) */}
                          {isExpanded && (
                            <tr className="print:hidden">
                              <td
                                colSpan={8}
                                className="px-6 py-3 bg-slate-50 border border-slate-200"
                              >
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                  {/* Stock batches */}
                                  <div>
                                    <p className="font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                                      <Package className="w-3.5 h-3.5 text-brand-600" />
                                      المخزون الحالي
                                    </p>
                                    {row.stockBatches.length === 0 ? (
                                      <p className="text-slate-400 italic">لا يوجد</p>
                                    ) : (
                                      row.stockBatches.map((b) => (
                                        <div key={b.id} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                                          <span>
                                            <span className="font-bold text-slate-800">{b.quantity}</span> وحدة
                                            {b.expiry_date && (
                                              <span className="text-slate-500 mr-2 text-[11px]">
                                                — صلاحية {b.expiry_date.slice(0, 7)}
                                              </span>
                                            )}
                                          </span>
                                          <div className="flex items-center gap-1.5">
                                            <button
                                              onClick={() => openEditForm('stock', b)}
                                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 transition-colors"
                                              title="تعديل هذه الدفعة"
                                            >
                                              <Edit2 className="w-3 h-3" />
                                              <span>تعديل</span>
                                            </button>
                                            <button
                                              onClick={() => handleDeleteBatch('stock', b.id)}
                                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold text-red-600 hover:bg-red-50 transition-colors"
                                              title="حذف هذه الدفعة"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                              <span>حذف</span>
                                            </button>
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                  {/* Incoming batches */}
                                  <div>
                                    <p className="font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                                      <TruckIcon className="w-3.5 h-3.5 text-emerald-600" />
                                      الوارد
                                    </p>
                                    {row.incomingBatches.length === 0 ? (
                                      <p className="text-slate-400 italic">لا يوجد</p>
                                    ) : (
                                      row.incomingBatches.map((b) => (
                                        <div key={b.id} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                                          <span>
                                            <span className="font-bold text-slate-800">{b.quantity}</span> وحدة
                                            {b.expiry_date && (
                                              <span className="text-slate-500 mr-2 text-[11px]">
                                                — صلاحية {b.expiry_date.slice(0, 7)}
                                              </span>
                                            )}
                                          </span>
                                          <div className="flex items-center gap-1.5">
                                            <button
                                              onClick={() => openEditForm('incoming', b)}
                                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold text-brand-700 bg-white hover:bg-brand-50 border border-brand-200 transition-colors"
                                              title="تعديل هذه الدفعة"
                                            >
                                              <Edit2 className="w-3 h-3" />
                                              <span>تعديل</span>
                                            </button>
                                            <button
                                              onClick={() => handleDeleteBatch('incoming', b.id)}
                                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold text-red-600 hover:bg-red-50 transition-colors"
                                              title="حذف هذه الدفعة"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                              <span>حذف</span>
                                            </button>
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-10 text-center text-slate-500 border border-slate-200 print:border-black"
                      >
                        {isArabic
                          ? 'لا توجد بيانات مخزون. أضف دفعات مخزون أو واردة للبدء.'
                          : 'No inventory data. Add stock or incoming batches to get started.'}
                      </td>
                    </tr>
                  )}
                </tbody>

                {inventoryRows.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-100 font-extrabold text-slate-950 border-t-2 border-slate-900 print:bg-slate-200 print:border-black print:text-black">
                      <td colSpan={2} className="py-3 px-3 text-right border border-slate-900 print:border-black">
                        إجمالي الأصناف: {inventoryRows.length}
                      </td>
                      <td className="py-3 px-3 text-center border border-slate-900 print:border-black">
                        {inventoryRows.reduce((s, r) => s + r.currentStock, 0)}
                      </td>
                      <td className="py-3 px-3 text-center border border-slate-900 print:border-black">
                        {inventoryRows.reduce((s, r) => s + r.incoming, 0)}
                      </td>
                      <td className="py-3 px-3 text-center text-brand-700 border border-slate-900 print:border-black print:text-black">
                        {inventoryRows.reduce((s, r) => s + r.available, 0)}
                      </td>
                      <td className="py-3 px-3 text-center border border-slate-900 print:border-black">
                        {inventoryRows.reduce((s, r) => s + r.requiredFromInvoices, 0)}
                      </td>
                      <td className="py-3 px-3 text-center border border-slate-900 print:border-black">
                        {(() => {
                          const total = inventoryRows.reduce((s, r) => s + r.difference, 0);
                          return (
                            <span className={total > 0 ? 'text-emerald-700' : total < 0 ? 'text-red-600' : ''}>
                              {total > 0 ? `+${total}` : total}
                            </span>
                          );
                        })()}
                      </td>
                      {/* Empty actions footer cell */}
                      <td className="border border-slate-900 print:hidden print:border-black" />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Note */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 print:border-black print:text-black">
              <p>
                {isArabic
                  ? 'المتاح = المخزون الحالي + الوارد | الفرق = المتاح − مطلوب من الفواتير | الكمية المطلوبة محسوبة من الفواتير فقط.'
                  : 'Available = Current Stock + Incoming | Difference = Available − Required from Invoices | Required quantity is read-only from invoices.'}
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
