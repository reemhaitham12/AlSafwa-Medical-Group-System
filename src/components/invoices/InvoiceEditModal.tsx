import React, { useState, useEffect } from 'react';
import type { Invoice, Product } from '@/lib/database.types';
import { useLanguage } from '@/hooks/useLanguage';
import { useToast } from '@/context/ToastContext';
import { productsService } from '@/services/productsService';
import { invoicesService } from '@/services/invoicesService';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { formatCurrency } from '@/utils/formatters';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Save, Plus, Trash2, X, Search } from 'lucide-react';

interface InvoiceEditModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

interface EditableItem {
  id?: string;
  product_id: string | null;
  product_name_snapshot: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export const InvoiceEditModal: React.FC<InvoiceEditModalProps> = ({
  invoice,
  isOpen,
  onClose,
  onSaved,
}) => {
  const { isArabic } = useLanguage();
  const { showSuccess, showError } = useToast();

  const [customerName, setCustomerName] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Product Search state
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [addQty, setAddQty] = useState(1);

  useEffect(() => {
    if (invoice) {
      setCustomerName(invoice.customer_name_snapshot || '');
      setDiscountPercentage(Number(invoice.discount_percentage) || 0);
      if (invoice.items && Array.isArray(invoice.items)) {
        setItems(
          invoice.items.map((it) => ({
            id: it.id,
            product_id: it.product_id || null,
            product_name_snapshot: it.product_name_snapshot || '',
            quantity: Number(it.quantity) || 1,
            unit_price: Number(it.unit_price) || 0,
            total: Number(it.total) || 0,
          }))
        );
      } else {
        setItems([]);
      }
    } else {
      setCustomerName('');
      setDiscountPercentage(0);
      setItems([]);
    }
  }, [invoice]);

  useEffect(() => {
    let isMounted = true;
    if (isOpen) {
      productsService
        .getAll()
        .then((data) => {
          if (isMounted) setAvailableProducts(data || []);
        })
        .catch((err) => {
          console.error('Failed to load products in edit modal:', err);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen || !invoice) return null;

  // Calculation logic with safe numeric fallback
  const subtotal = items.reduce((acc, item) => acc + (Number(item?.total) || 0), 0);
  const discountAmount = (subtotal * (Number(discountPercentage) || 0)) / 100;
  const finalTotal = Math.max(0, subtotal - discountAmount);

  const handleUpdateItemQuantity = (index: number, newQty: number) => {
    const qty = Math.max(1, newQty || 1);
    setItems((prev) =>
      prev.map((item, i) => {
        if (i === index) {
          const unitPrice = Number(item.unit_price) || 0;
          return {
            ...item,
            quantity: qty,
            total: qty * unitPrice,
          };
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddProduct = () => {
    if (!selectedProduct) return;
    const qty = Math.max(1, addQty || 1);
    const unitPrice = Number(selectedProduct.price) || 0;
    const newItem: EditableItem = {
      product_id: selectedProduct.id,
      product_name_snapshot: selectedProduct.name || '',
      quantity: qty,
      unit_price: unitPrice,
      total: qty * unitPrice,
    };

    setItems((prev) => [...prev, newItem]);
    setSelectedProduct(null);
    setProductSearch('');
    setAddQty(1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      showError(isArabic ? 'يرجى إدخال اسم العميل' : 'Please enter customer name');
      return;
    }
    if (items.length === 0) {
      showError(isArabic ? 'برجاء إضافة صنف واحد على الأقل للفاتورة' : 'Please add at least one item');
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmSave = async () => {
    if (!invoice || isSubmitting) return;
    try {
      setIsSubmitting(true);
      await invoicesService.update(invoice.id, {
        customer_id: invoice.customer_id ?? null,
        customer_name_snapshot: customerName.trim(),
        subtotal,
        discount_percentage: Number(discountPercentage) || 0,
        discount_amount: discountAmount,
        final_total: finalTotal,
        items: items.map((item) => ({
          product_id: item.product_id || null,
          product_name_snapshot: item.product_name_snapshot || '',
          quantity: Number(item.quantity) || 1,
          unit_price: Number(item.unit_price) || 0,
          total: Number(item.total) || 0,
        })),
      });

      showSuccess(isArabic ? 'تم تعديل الفاتورة بنجاح' : 'Invoice updated successfully');
      setShowConfirm(false);
      onClose();
      await onSaved();
    } catch (err: any) {
      console.error('Update Invoice Error:', err);
      showError(err.message || (isArabic ? 'فشل تعديل الفاتورة' : 'Failed to update invoice'));
      setShowConfirm(false);
      setIsSubmitting(false);
    }
  };

  const filteredProducts = availableProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.product_code && p.product_code.toLowerCase().includes(productSearch.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-surface-200 relative my-8" dir="rtl">
        <div className="flex items-center justify-between border-b border-surface-100 pb-4 mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-surface-900">
              {isArabic ? `تعديل الفاتورة ${invoice.invoice_number}` : `Edit Invoice ${invoice.invoice_number}`}
            </h2>
          </div>
          <button onClick={onClose} disabled={isSubmitting} className="p-1 rounded-lg text-surface-400 hover:bg-surface-100 disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={isArabic ? 'اسم العميل / المستشفى' : 'Customer Name'}
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              disabled={isSubmitting}
              required
            />
            <Input
              label={isArabic ? 'نسبة الخصم (%)' : 'Discount Percentage (%)'}
              type="number"
              min="0"
              max="100"
              value={discountPercentage}
              onChange={(e) => setDiscountPercentage(Number(e.target.value))}
              disabled={isSubmitting}
            />
          </div>

          {/* Add Product Search Controls */}
          <div className="bg-surface-50 p-4 rounded-xl border border-surface-200 space-y-3">
            <h4 className="text-xs font-bold text-surface-900">{isArabic ? 'إضافة منتج إضافي للفاتورة' : 'Add Additional Product'}</h4>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-7 relative">
                <Input
                  placeholder={isArabic ? 'بحث باسم المنتج أو الكود...' : 'Search product name or code...'}
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setSelectedProduct(null);
                  }}
                  disabled={isSubmitting}
                  icon={<Search className="w-4 h-4" />}
                />
                {productSearch && !selectedProduct && filteredProducts.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-surface-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-20 mt-1">
                    {filteredProducts.map((p) => (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => {
                          setSelectedProduct(p);
                          setProductSearch(p.name);
                        }}
                        className="w-full text-right px-3 py-2 text-xs hover:bg-brand-50 flex justify-between items-center border-b border-surface-100 last:border-none"
                      >
                        <span className="font-semibold text-surface-900">{p.name}</span>
                        <span className="text-emerald-600 font-bold">{formatCurrency(p.price, true)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="md:col-span-3">
                <Input
                  label={isArabic ? 'الكمية' : 'Qty'}
                  type="number"
                  min="1"
                  value={addQty}
                  onChange={(e) => setAddQty(Number(e.target.value))}
                  disabled={isSubmitting}
                />
              </div>

              <div className="md:col-span-2">
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  className="w-full"
                  onClick={handleAddProduct}
                  disabled={!selectedProduct || isSubmitting}
                  icon={<Plus className="w-4 h-4" />}
                >
                  {isArabic ? 'إضافة' : 'Add'}
                </Button>
              </div>
            </div>
          </div>

          {/* Current Items Table */}
          <div className="overflow-x-auto border border-surface-200 rounded-xl">
            <table className="w-full text-xs text-right">
              <thead className="bg-surface-100 text-surface-900 font-bold border-b border-surface-200">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">الصنف</th>
                  <th className="p-3 text-center w-24">الكمية</th>
                  <th className="p-3 text-right">سعر الوحدة</th>
                  <th className="p-3 text-right">الإجمالي</th>
                  <th className="p-3 text-center w-16">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-surface-50">
                    <td className="p-3 font-mono">{idx + 1}</td>
                    <td className="p-3 font-semibold text-surface-900">{item.product_name_snapshot}</td>
                    <td className="p-3 text-center">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleUpdateItemQuantity(idx, Number(e.target.value))}
                        disabled={isSubmitting}
                        className="w-16 px-2 py-1 border border-surface-200 rounded text-center font-bold disabled:bg-surface-100"
                      />
                    </td>
                    <td className="p-3 text-right">{formatCurrency(item.unit_price, true)}</td>
                    <td className="p-3 text-right font-bold text-surface-900">{formatCurrency(item.total, true)}</td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={isSubmitting}
                        className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Edit Totals Summary */}
          <div className="flex justify-between items-center bg-surface-50 p-4 rounded-xl border border-surface-200">
            <div className="text-xs space-y-1">
              <div>المجموع الفرعي: <span className="font-bold">{formatCurrency(subtotal, true)}</span></div>
              <div>قيمة الخصم: <span className="font-bold text-amber-700">{formatCurrency(discountAmount, true)}</span></div>
            </div>

            <div className="text-base font-bold text-emerald-700 bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-200">
              الصافي النهائي: {formatCurrency(finalTotal, true)}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              {isArabic ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              disabled={isSubmitting}
              icon={!isSubmitting ? <Save className="w-4 h-4" /> : undefined}
            >
              {isSubmitting
                ? (isArabic ? 'جاري حفظ التعديلات...' : 'Saving changes...')
                : (isArabic ? 'حفظ التعديلات' : 'Save Changes')}
            </Button>
          </div>
        </form>

        <ConfirmModal
          isOpen={showConfirm}
          title={isArabic ? 'تأكيد تعديل الفاتورة' : 'Confirm Edit Invoice'}
          message={isArabic ? 'هل تريد حفظ التعديلات على هذه الفاتورة؟' : 'Do you want to save changes to this invoice?'}
          confirmText={isSubmitting ? (isArabic ? 'جاري حفظ التعديلات...' : 'Saving changes...') : (isArabic ? 'نعم، حفظ التعديلات' : 'Yes, save changes')}
          cancelText={isArabic ? 'إلغاء' : 'Cancel'}
          variant="primary"
          isLoading={isSubmitting}
          onConfirm={handleConfirmSave}
          onCancel={() => !isSubmitting && setShowConfirm(false)}
        />
      </div>
    </div>
  );
};
