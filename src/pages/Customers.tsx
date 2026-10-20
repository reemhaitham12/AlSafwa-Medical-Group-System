import React, { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/context/ToastContext';
import {
  customersService,
  type CustomerReconciliationResult,
} from '@/services/customersService';
import { formatCurrency, formatDate } from '@/utils/formatters';
import type { Customer } from '@/lib/database.types';
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Edit2,
  Trash2,
  X,
  Save,
  AlertCircle,
  CreditCard,
  CheckCircle2,
  BadgeAlert,
  FileSpreadsheet,
  Calendar,
  History,
} from 'lucide-react';

// ─────────────────────────────────────────────
// Customer form state shape
// ─────────────────────────────────────────────
interface CustomerFormState {
  name: string;
  phone: string;
  email: string;
  address: string;
  previous_debt: string;
}

const EMPTY_FORM: CustomerFormState = {
  name: '',
  phone: '',
  email: '',
  address: '',
  previous_debt: '0.00',
};

// ─────────────────────────────────────────────
// Customer Create / Edit Modal
// ─────────────────────────────────────────────
interface CustomerModalProps {
  isOpen: boolean;
  editingCustomer: Customer | null;
  onClose: () => void;
  onSaved: (customer: Customer) => void;
}

const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  editingCustomer,
  onClose,
  onSaved,
}) => {
  const { isArabic } = useLanguage();
  const { showError } = useToast();
  const [form, setForm] = useState<CustomerFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [debtError, setDebtError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (editingCustomer) {
        const debtVal = editingCustomer.previous_debt ?? 0;
        setForm({
          name: editingCustomer.name || '',
          phone: editingCustomer.phone || '',
          email: editingCustomer.email || '',
          address: editingCustomer.address || '',
          previous_debt: String(Number(debtVal).toFixed(2)),
        });
      } else {
        setForm(EMPTY_FORM);
      }
      setDebtError(null);
      setTimeout(() => nameRef.current?.focus(), 80);
    }
  }, [isOpen, editingCustomer]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const validateDebt = (raw: string): number | null => {
    if (raw.trim() === '') return 0;
    const num = Number(raw);
    if (isNaN(num)) return null;
    if (num < 0) return null;
    // Check up to 2 decimal places
    const parts = raw.split('.');
    if (parts[1] && parts[1].length > 2) return null;
    return Math.round(num * 100) / 100;
  };

  const handleDebtChange = (raw: string) => {
    setForm((f) => ({ ...f, previous_debt: raw }));
    const num = validateDebt(raw);
    if (num === null) {
      setDebtError(isArabic ? 'القيمة يجب أن تكون رقماً موجباً وبحد أقصى خانتين عشريتين' : 'Value must be a positive number with max 2 decimals');
    } else {
      setDebtError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    if (!form.name.trim()) {
      showError(isArabic ? 'اسم العميل مطلوب' : 'Customer name is required');
      return;
    }

    const debtValue = validateDebt(form.previous_debt);
    if (debtValue === null) {
      setDebtError(isArabic ? 'القيمة يجب أن تكون رقماً موجباً وبحد أقصى خانتين عشريتين' : 'Value must be a positive number with max 2 decimals');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        previous_debt: debtValue,
      };

      let saved: Customer;
      if (editingCustomer) {
        saved = await customersService.update(editingCustomer.id, payload);
      } else {
        saved = await customersService.create(payload);
      }
      onSaved(saved);
    } catch (err: any) {
      console.error('Customer save error:', err);
      showError(err.message || (isArabic ? 'فشل حفظ بيانات العميل' : 'Failed to save customer'));
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-surface-200 w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
          <h2 className="text-base font-bold text-surface-900">
            {editingCustomer
              ? (isArabic ? 'تعديل بيانات العميل' : 'Edit Customer')
              : (isArabic ? 'إضافة عميل جديد' : 'Add New Customer')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Input
            ref={nameRef}
            label={isArabic ? 'اسم العميل / الجهة *' : 'Customer / Entity Name *'}
            placeholder={isArabic ? 'أدخل الاسم...' : 'Enter name...'}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={isArabic ? 'رقم الهاتف' : 'Phone'}
              placeholder={isArabic ? 'اختياري...' : 'Optional...'}
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />

            <Input
              label={isArabic ? 'البريد الإلكتروني' : 'Email'}
              type="email"
              placeholder={isArabic ? 'اختياري...' : 'Optional...'}
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>

          <Input
            label={isArabic ? 'العنوان' : 'Address'}
            placeholder={isArabic ? 'اختياري...' : 'Optional...'}
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          />

          {/* Previous / Opening Debt (المديونية السابقة / رصيد أول المدة) */}
          <div className="bg-surface-50 p-3.5 rounded-xl border border-surface-200 space-y-2">
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">
                {isArabic ? 'المديونية السابقة / رصيد أول المدة (ج.م)' : 'Previous / Opening Debt (EGP)'}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.previous_debt}
                onChange={(e) => handleDebtChange(e.target.value)}
                onFocus={(e) => e.target.select()}
                className={`w-full text-sm px-3 py-2 rounded-lg border ${
                  debtError
                    ? 'border-red-400 focus:ring-red-400'
                    : 'border-surface-200 focus:border-brand-500 focus:ring-brand-500'
                } bg-white text-surface-900 focus:outline-none focus:ring-1 transition-colors`}
                dir="ltr"
              />
            </div>

            {debtError ? (
              <div className="flex items-center gap-1.5 text-xs text-red-600">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{debtError}</span>
              </div>
            ) : (
              <p className="text-[11px] text-surface-500 leading-relaxed">
                {isArabic
                  ? 'رصيد المديونية المستحق على العميل. سيتم تحديثه تلقائياً عند إصدار فواتير جديدة أو تسجيل دفعات سداد.'
                  : 'Customer outstanding debt balance. Automatically updated when creating invoices or recording payments.'}
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              isLoading={saving}
              disabled={saving || !!debtError}
              icon={<Save className="w-4 h-4" />}
            >
              {saving
                ? (isArabic ? 'جاري الحفظ...' : 'Saving...')
                : editingCustomer
                ? (isArabic ? 'حفظ التعديلات' : 'Save Changes')
                : (isArabic ? 'إضافة العميل' : 'Add Customer')}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              {isArabic ? 'إلغاء' : 'Cancel'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Record Payment Modal (سداد دفعة)
// ─────────────────────────────────────────────
interface RecordPaymentModalProps {
  isOpen: boolean;
  customer: Customer | null;
  onClose: () => void;
  onPaymentRecorded: (updatedCustomer: Customer) => void;
}

const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  customer,
  onClose,
  onPaymentRecorded,
}) => {
  const { isArabic } = useLanguage();
  const { showSuccess, showError } = useToast();
  const [amountStr, setAmountStr] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  const currentDebt = customer ? Number(customer.previous_debt) || 0 : 0;
  const paymentAmount = Math.max(0, Number(amountStr) || 0);
  const remainingDebt = Math.max(0, Math.round((currentDebt - paymentAmount) * 100) / 100);

  useEffect(() => {
    if (isOpen) {
      setAmountStr('');
      setNotes('');
      setTimeout(() => amountRef.current?.focus(), 80);
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen || !customer) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const val = Number(amountStr);
    if (isNaN(val) || val <= 0) {
      showError(isArabic ? 'برجاء إدخال مبلغ سداد صحيح أكبر من صفر' : 'Please enter a valid payment amount greater than zero');
      return;
    }

    try {
      setSaving(true);
      const res = await customersService.recordPayment(customer.id, val, notes);
      showSuccess(
        isArabic
          ? `تم تسجيل دفعة بقيمة ${formatCurrency(val, true)} للعميل "${customer.name}" وتحديث رصيد المديونية`
          : `Payment of ${formatCurrency(val, true)} recorded for "${customer.name}" successfully`
      );
      onPaymentRecorded(res.customer);
      onClose();
    } catch (err: any) {
      console.error('Record payment error:', err);
      showError(err.message || (isArabic ? 'فشل تسجيل الدفعة' : 'Failed to record payment'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-surface-200 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-surface-900">
                {isArabic ? 'تسجيل دفعة سداد' : 'Record Customer Payment'}
              </h2>
              <p className="text-[11px] text-surface-500">{customer.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-surface-50 p-3.5 rounded-xl border border-surface-200 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-surface-600">{isArabic ? 'المديونية الحالية قبل السداد:' : 'Current Debt:'}</span>
              <span className="font-extrabold text-amber-800 text-sm">
                {formatCurrency(currentDebt, true)}
              </span>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-surface-200">
              <span className="text-surface-600">{isArabic ? 'المديونية المتبقية بعد السداد:' : 'Remaining Debt:'}</span>
              <span className={`font-black text-sm ${remainingDebt === 0 ? 'text-emerald-600' : 'text-surface-900'}`}>
                {formatCurrency(remainingDebt, true)}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-surface-700">
              {isArabic ? 'مبلغ السداد (ج.م) *' : 'Payment Amount (EGP) *'}
            </label>
            <input
              ref={amountRef}
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              className="w-full text-base font-bold px-3 py-2 rounded-lg border border-surface-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-surface-900 outline-none"
              dir="ltr"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-surface-700">
              {isArabic ? 'ملاحظات السداد / رقم الإيصال' : 'Payment Notes / Receipt #'}
              <span className="text-surface-400 font-normal mr-1 text-[11px]">(اختياري)</span>
            </label>
            <input
              type="text"
              placeholder={isArabic ? 'مثال: نقدي، شيك بنكي رقم 1234...' : 'e.g. Cash, Check #1234...'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-surface-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-surface-900 outline-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              variant="primary"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              isLoading={saving}
              disabled={saving || !amountStr || Number(amountStr) <= 0}
              icon={<CheckCircle2 className="w-4 h-4" />}
            >
              {saving
                ? (isArabic ? 'جاري تسجيل السداد...' : 'Recording...')
                : (isArabic ? 'تأكيد تسجيل السداد' : 'Confirm Payment')}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              {isArabic ? 'إلغاء' : 'Cancel'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Customer Reconciliation Preview & Audit Modal
// ─────────────────────────────────────────────
interface ReconciliationModalProps {
  isOpen: boolean;
  customer: Customer | null;
  onClose: () => void;
  onReconciled: (updatedCustomer: Customer) => void;
}

const ReconciliationModal: React.FC<ReconciliationModalProps> = ({
  isOpen,
  customer,
  onClose,
  onReconciled,
}) => {
  const { isArabic } = useLanguage();
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [result, setResult] = useState<CustomerReconciliationResult | null>(null);

  // Editable baseline inputs in preview
  const [baselineDebtStr, setBaselineDebtStr] = useState('0.00');
  const [baselineDateStr, setBaselineDateStr] = useState('');

  const fetchPreview = async (opening?: number, dateStr?: string) => {
    if (!customer) return;
    setLoading(true);
    try {
      const preview = await customersService.reconcileCustomer(customer.id, {
        openingDebt: opening !== undefined ? opening : Number(baselineDebtStr),
        openingDebtDate: dateStr ? new Date(dateStr).toISOString() : (baselineDateStr ? new Date(baselineDateStr).toISOString() : undefined),
        dryRun: true,
      });
      setResult(preview);
    } catch (err: any) {
      console.error('Reconciliation preview error:', err);
      showError(err.message || (isArabic ? 'فشل تحميل بيانات المطابقة' : 'Failed to generate reconciliation preview'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && customer) {
      const initDebt = customer.previous_debt ?? 0;
      const initDate = customer.created_at
        ? customer.created_at.split('T')[0]
        : new Date().toISOString().split('T')[0];

      setBaselineDebtStr(String(Number(initDebt).toFixed(2)));
      setBaselineDateStr(initDate);
      fetchPreview(Number(initDebt), initDate);
    }
  }, [isOpen, customer]);

  if (!isOpen || !customer) return null;

  const handleApplyCommit = async () => {
    try {
      setCommitting(true);
      const applied = await customersService.reconcileCustomer(customer.id, {
        openingDebt: Number(baselineDebtStr),
        openingDebtDate: new Date(baselineDateStr).toISOString(),
        dryRun: false,
      });
      showSuccess(
        isArabic
          ? `تم اعتماد وتطبيق مطابقة الحساب للعميل "${customer.name}" بنجاح`
          : `Account reconciliation committed successfully for "${customer.name}"`
      );
      onReconciled(applied.customer);
      onClose();
    } catch (err: any) {
      console.error('Commit reconciliation error:', err);
      showError(err.message || (isArabic ? 'فشل تطبيق المطابقة' : 'Failed to apply reconciliation'));
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-surface-900/60 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-surface-200 w-full max-w-4xl p-6 relative my-6"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="flex items-center justify-between pb-4 border-b border-surface-100 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-surface-900">
                {isArabic ? 'كشف حساب ومطابقة الأرصدة التراكمية' : 'Account Statement & Reconciliation'}
              </h2>
              <p className="text-xs text-surface-500 font-medium">{customer.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Baseline Controls */}
        <div className="bg-surface-50 p-4 rounded-xl border border-surface-200 mb-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-surface-900">
            <Calendar className="w-4 h-4 text-brand-600" />
            <span>{isArabic ? 'معايير نقطة البداية للمطابقة (Reconciliation Baseline)' : 'Reconciliation Baseline'}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">
                {isArabic ? 'رصيد أول المدة (ج.م):' : 'Opening Debt (EGP):'}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={baselineDebtStr}
                onChange={(e) => setBaselineDebtStr(e.target.value)}
                className="w-full text-xs font-bold px-3 py-2 rounded-lg border border-surface-200 bg-white"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">
                {isArabic ? 'تاريخ بداية الرصيد:' : 'Baseline Date:'}
              </label>
              <input
                type="date"
                value={baselineDateStr}
                onChange={(e) => setBaselineDateStr(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-surface-200 bg-white"
              />
            </div>

            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full py-2 text-xs"
                onClick={() => fetchPreview(Number(baselineDebtStr), baselineDateStr)}
                disabled={loading || committing}
                icon={<History className="w-3.5 h-3.5" />}
              >
                {isArabic ? 'تحديث المعاينة' : 'Refresh Preview'}
              </Button>
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        {loading ? (
          <div className="py-12">
            <LoadingSpinner label={isArabic ? 'جاري مراجعة ومطابقة الفواتير والمدفوعات...' : 'Auditing invoices and ledger...'} />
          </div>
        ) : result ? (
          <div className="space-y-4">
            <div className="overflow-x-auto border border-surface-200 rounded-xl max-h-72 overflow-y-auto">
              <table className="w-full text-xs text-right">
                <thead className="bg-surface-100 text-surface-800 font-bold sticky top-0 border-b border-surface-200">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">التاريخ والوقت</th>
                    <th className="p-3">البيان / المرجع</th>
                    <th className="p-3 text-left">مدين (+)</th>
                    <th className="p-3 text-left">دائن (-)</th>
                    <th className="p-3 text-left font-black">الرصيد التراكمي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {result.entries.map((entry, idx) => (
                    <tr
                      key={idx}
                      className={entry.type === 'opening' ? 'bg-amber-50/60 font-semibold' : 'hover:bg-surface-50'}
                    >
                      <td className="p-3 font-mono text-surface-400">{idx + 1}</td>
                      <td className="p-3 text-surface-600">{formatDate(entry.date, true)}</td>
                      <td className="p-3 font-bold text-surface-900">
                        {entry.reference}
                        {entry.notes && <span className="text-[10px] text-surface-400 font-normal mr-1.5">({entry.notes})</span>}
                      </td>
                      <td className="p-3 text-left text-amber-900 font-bold">
                        {entry.debit > 0 ? formatCurrency(entry.debit, true) : '-'}
                      </td>
                      <td className="p-3 text-left text-emerald-700 font-bold">
                        {entry.credit > 0 ? formatCurrency(entry.credit, true) : '-'}
                      </td>
                      <td className="p-3 text-left font-black text-surface-950">
                        {formatCurrency(entry.balance, true)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Reconciliation Comparison Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-slate-900 text-white rounded-xl">
              <div className="text-xs space-y-1">
                <div>
                  عدد الفواتير المدرجة بالمطابقة: <span className="font-bold text-brand-300">{result.invoicesCount}</span>
                  {' | '}
                  عدد الدفعات: <span className="font-bold text-emerald-300">{result.paymentsCount}</span>
                </div>
                <div className="text-slate-300 text-[11px]">
                  الرصيد المحسوب مطابق لجميع الفواتير والمدفوعات بترتيبها الزمني الدقيق.
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-slate-300 block">الرصيد النهائي المستحق:</span>
                <span className="text-xl font-black text-emerald-400">
                  {formatCurrency(result.calculatedOutstandingDebt, true)}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={committing}>
                {isArabic ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleApplyCommit}
                isLoading={committing}
                disabled={committing}
                icon={<CheckCircle2 className="w-4 h-4" />}
              >
                {isArabic ? 'اعتماد وتطبيق المطابقة في السحابة' : 'Commit & Save Reconciliation'}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Main Customers Page
// ─────────────────────────────────────────────
export const Customers: React.FC = () => {
  const { isArabic } = useLanguage();
  const { isConfigured, isViewer } = useAuth();
  const { showSuccess, showError } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);
  const [reconcileCustomer, setReconcileCustomer] = useState<Customer | null>(null);

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCustomers = async () => {
    if (!isConfigured) return;
    setLoading(true);
    try {
      const data = await customersService.getAll();
      setCustomers(data);
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [isConfigured]);

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.phone && c.phone.includes(searchTerm))
  );

  const totalOutstandingDebt = customers.reduce(
    (acc, c) => acc + (Number(c.previous_debt) || 0),
    0
  );

  const handleOpenCreate = () => {
    setEditingCustomer(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (cust: Customer) => {
    setEditingCustomer(cust);
    setModalOpen(true);
  };

  const handleOpenPayment = (cust: Customer) => {
    setPaymentCustomer(cust);
  };

  const handleOpenReconcile = (cust: Customer) => {
    setReconcileCustomer(cust);
  };

  const handleModalSaved = (saved: Customer) => {
    setCustomers((prev) => {
      const exists = prev.find((c) => c.id === saved.id);
      if (exists) {
        return prev.map((c) => (c.id === saved.id ? saved : c));
      }
      return [...prev, saved].sort((a, b) => a.name.localeCompare(b.name));
    });
    setModalOpen(false);
    showSuccess(
      editingCustomer
        ? (isArabic ? 'تم تحديث بيانات العميل بنجاح' : 'Customer updated successfully')
        : (isArabic ? 'تم إضافة العميل بنجاح' : 'Customer added successfully')
    );
  };

  const handleCustomerUpdated = (updatedCustomer: Customer) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === updatedCustomer.id ? updatedCustomer : c))
    );
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await customersService.delete(deleteTarget.id);
      setCustomers((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      showSuccess(isArabic ? 'تم حذف العميل بنجاح' : 'Customer deleted successfully');
    } catch (err: any) {
      showError(err.message || (isArabic ? 'فشل حذف العميل' : 'Failed to delete customer'));
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-surface-900">
            {isArabic ? 'سجل العملاء والمستشفيات' : 'Customers Directory'}
          </h1>
          <p className="text-xs text-surface-500 mt-0.5">
            {isArabic
              ? 'إدارة حسابات جهات الشراء والمديونيات الحالية والمتحصلات وكشوف الحساب'
              : 'Client directory, active outstanding debts, payment records, and ledger reconciliation'}
          </p>
        </div>

        {!isViewer && (
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={handleOpenCreate}
          >
            {isArabic ? 'إضافة عميل جديد' : 'Add Customer'}
          </Button>
        )}
      </div>

      {/* Summary KPI & Search Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 sm:col-span-1 flex items-center justify-between bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <div>
            <span className="text-xs font-semibold text-amber-900 block">
              {isArabic ? 'إجمالي المديونيات المستحقة' : 'Total Outstanding Debt'}
            </span>
            <span className="text-lg font-black text-amber-950 mt-1 block">
              {formatCurrency(totalOutstandingDebt, true)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-200/60 text-amber-900 flex items-center justify-center">
            <BadgeAlert className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 sm:col-span-2 flex items-center">
          <div className="w-full">
            <Input
              placeholder={isArabic ? 'بحث باسم العميل أو رقم الهاتف...' : 'Search by name or phone...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>
        </Card>
      </div>

      {/* List */}
      <Card>
        {loading ? (
          <LoadingSpinner label={isArabic ? 'جاري تحميل العملاء...' : 'Fetching customers...'} />
        ) : filteredCustomers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right" dir="rtl">
              <thead className="bg-surface-50 text-surface-600 font-semibold border-b border-surface-200">
                <tr>
                  <th className="px-4 py-3">{isArabic ? 'اسم العميل / الجهة' : 'Customer Name'}</th>
                  <th className="px-4 py-3">{isArabic ? 'الهاتف' : 'Phone'}</th>
                  <th className="px-4 py-3">{isArabic ? 'العنوان' : 'Address'}</th>
                  <th className="px-4 py-3 text-center">
                    {isArabic ? 'المديونية الحالية المستحقة' : 'Current Outstanding Debt'}
                  </th>
                  {!isViewer && (
                    <th className="px-4 py-3 text-center">{isArabic ? 'إجراءات الحساب' : 'Actions'}</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {filteredCustomers.map((cust) => {
                  const debt = Number(cust.previous_debt) || 0;
                  return (
                    <tr key={cust.id} className="hover:bg-surface-50/80 transition-colors">
                      <td className="px-4 py-3 font-semibold text-surface-900">{cust.name}</td>
                      <td className="px-4 py-3 text-surface-600">
                        {cust.phone ? (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-surface-400" />
                            <span>{cust.phone}</span>
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-surface-600">
                        {cust.address ? (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-surface-400" />
                            <span>{cust.address}</span>
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {debt > 0 ? (
                          <span className="inline-block px-2.5 py-1 rounded-md bg-amber-100 text-amber-900 font-extrabold text-xs border border-amber-300">
                            {formatCurrency(debt, true)}
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-bold">خالص (0.00 ج.م)</span>
                        )}
                      </td>
                      {!isViewer && (
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Record Payment Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenPayment(cust)}
                              className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-[11px] font-bold flex items-center gap-1 transition-colors"
                              title={isArabic ? 'تسجيل سداد دفعة' : 'Record Payment'}
                            >
                              <CreditCard className="w-3 h-3" />
                              <span>{isArabic ? 'سداد' : 'Pay'}</span>
                            </button>

                            {/* Reconciliation / Ledger Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenReconcile(cust)}
                              className="px-2 py-1 rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100 border border-brand-200 text-[11px] font-bold flex items-center gap-1 transition-colors"
                              title={isArabic ? 'كشف حساب ومطابقة الفواتير' : 'Statement & Reconciliation'}
                            >
                              <FileSpreadsheet className="w-3 h-3" />
                              <span>{isArabic ? 'مطابقة' : 'Reconcile'}</span>
                            </button>

                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(cust)}
                              className="p-1.5 rounded-lg text-brand-600 hover:bg-brand-50 transition-colors"
                              title={isArabic ? 'تعديل بيانات العميل' : 'Edit Customer'}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(cust)}
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                              title={isArabic ? 'حذف' : 'Delete'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-surface-500 space-y-3">
            <Users className="w-10 h-10 text-surface-300 mx-auto" />
            <p className="text-sm font-medium">
              {isArabic
                ? 'لا يوجد عملاء مسجلين في السحابة حتى الآن'
                : 'No customers found in database'}
            </p>
            {!isViewer && (
              <Button
                variant="outline"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={handleOpenCreate}
              >
                {isArabic ? 'إضافة أول عميل' : 'Add First Customer'}
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* Create / Edit Modal */}
      <CustomerModal
        isOpen={modalOpen}
        editingCustomer={editingCustomer}
        onClose={() => setModalOpen(false)}
        onSaved={handleModalSaved}
      />

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={!!paymentCustomer}
        customer={paymentCustomer}
        onClose={() => setPaymentCustomer(null)}
        onPaymentRecorded={handleCustomerUpdated}
      />

      {/* Reconciliation Modal */}
      <ReconciliationModal
        isOpen={!!reconcileCustomer}
        customer={reconcileCustomer}
        onClose={() => setReconcileCustomer(null)}
        onReconciled={handleCustomerUpdated}
      />

      {/* Delete Confirm */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title={isArabic ? 'حذف العميل' : 'Delete Customer'}
        message={
          isArabic
            ? `هل تريد حذف "${deleteTarget?.name}"؟ لا يمكن التراجع عن هذا الإجراء.`
            : `Delete "${deleteTarget?.name}"? This action cannot be undone.`
        }
        confirmText={deleting ? (isArabic ? 'جاري الحذف...' : 'Deleting...') : (isArabic ? 'نعم، حذف' : 'Yes, Delete')}
        cancelText={isArabic ? 'إلغاء' : 'Cancel'}
        variant="danger"
        isLoading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => !deleting && setDeleteTarget(null)}
      />
    </div>
  );
};
