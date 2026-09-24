import React, { useEffect, useState } from 'react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/context/ToastContext';
import { productsService } from '@/services/productsService';
import { customersService } from '@/services/customersService';
import { invoicesService } from '@/services/invoicesService';
import type { Product, Customer } from '@/lib/database.types';
import { formatCurrency } from '@/utils/formatters';
import { Save, ArrowLeft, Plus, Trash2, ShieldCheck, Edit3 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface InvoiceItemDraft {
  product_id: string | null;
  product_name_snapshot: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export const CreateInvoice: React.FC = () => {
  const { isArabic } = useLanguage();
  const { user, isConfigured } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const editInvoiceId = searchParams.get('edit');
  const isEditMode = Boolean(editInvoiceId);

  const [nextInvoiceNumber, setNextInvoiceNumber] = useState('INV-000001');

  // Customer State
  const [customerName, setCustomerName] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customersList, setCustomersList] = useState<Customer[]>([]);

  // Product Selection State
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [itemQty, setItemQty] = useState(1);

  // Refs for keyboard navigation
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const quantityInputRef = React.useRef<HTMLInputElement>(null);

  // Invoice Items & Calculations State
  const [items, setItems] = useState<InvoiceItemDraft[]>([]);
  const [discountPercentage, setDiscountPercentage] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const fetchInitialData = async () => {
    if (!isConfigured || !user) return;
    setLoadingData(true);
    try {
      // 1. Fetch products catalog
      try {
        const prods = await productsService.getAll();
        setProductsList(prods || []);
      } catch (pErr: any) {
        console.error('Error loading products for invoice page:', pErr);
        showError(
          isArabic
            ? `فشل تحميل المنتجات: ${pErr.message || 'خطأ في قاعدة البيانات'}`
            : `Failed to load products: ${pErr.message || 'Database error'}`
        );
      }

      // 2. Fetch customers directory
      try {
        const custs = await customersService.getAll();
        setCustomersList(custs || []);
      } catch (cErr) {
        console.error('Error fetching customers directory:', cErr);
      }

      // 3. Edit Mode vs Create Mode
      if (editInvoiceId) {
        try {
          const inv = await invoicesService.getById(editInvoiceId);
          if (!inv) {
            showError(isArabic ? 'لم يتم العثور على الفاتورة المطلوبة' : 'Invoice not found');
            navigate('/invoices');
            return;
          }
          setNextInvoiceNumber(inv.invoice_number);
          setCustomerName(inv.customer_name_snapshot || '');
          setSelectedCustomerId(inv.customer_id || null);
          setDiscountPercentage(Number(inv.discount_percentage) || 0);

          if (inv.items && Array.isArray(inv.items)) {
            setItems(
              inv.items.map((it) => ({
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
        } catch (invErr: any) {
          console.error('Error loading invoice for edit:', invErr);
          showError(
            isArabic
              ? `فشل تحميل بيانات الفاتورة: ${invErr.message || 'خطأ'}`
              : `Failed to load invoice details: ${invErr.message || 'Error'}`
          );
          navigate('/invoices');
        }
      } else {
        // Create Mode reset & fetch next sequence
        setCustomerName('');
        setSelectedCustomerId(null);
        setItems([]);
        setDiscountPercentage(0);
        setProductSearch('');
        setSelectedProduct(null);
        setItemQty(1);

        try {
          const num = await invoicesService.getNextInvoiceNumber();
          setNextInvoiceNumber(num);
        } catch (nErr) {
          console.error('Error fetching invoice sequence:', nErr);
        }
      }
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (isConfigured && user) {
      fetchInitialData();
    }
  }, [isConfigured, user, editInvoiceId]);

  useEffect(() => {
    if (!loadingData) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loadingData]);

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const discountAmount = (subtotal * (Number(discountPercentage) || 0)) / 100;
  const finalTotal = Math.max(0, subtotal - discountAmount);

  const handleSelectCustomer = (cust: Customer) => {
    setSelectedCustomerId(cust.id);
    setCustomerName(cust.name);
  };

  const handleAddItem = (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    if (!selectedProduct) return;

    const qty = Math.max(1, itemQty || 1);
    const unitPrice = Number(selectedProduct.price) || 0;
    const itemTotal = qty * unitPrice;

    const newItem: InvoiceItemDraft = {
      product_id: selectedProduct.id,
      product_name_snapshot: selectedProduct.name || '',
      quantity: qty,
      unit_price: unitPrice,
      total: itemTotal,
    };

    setItems((prev) => [...prev, newItem]);
    setSelectedProduct(null);
    setProductSearch('');
    setItemQty(1);

    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();

      const term = productSearch.trim();
      if (!term) return;

      let matchedProduct: Product | undefined = undefined;

      // 1. Try exact numeric item_number match first
      const numericTerm = Number(term);
      if (!isNaN(numericTerm) && term !== '') {
        matchedProduct = productsList.find((p) => p.item_number === numericTerm);
      }

      // 2. If no numeric item_number match, check filtered list
      if (!matchedProduct) {
        if (filteredProducts.length === 1) {
          matchedProduct = filteredProducts[0];
        } else if (filteredProducts.length > 1) {
          // Try exact product name match (case-insensitive)
          const exactName = filteredProducts.find(
            (p) => p.name.trim().toLowerCase() === term.toLowerCase()
          );
          if (exactName) {
            matchedProduct = exactName;
          }
        }
      }

      // 3. If a product was unambiguously matched:
      if (matchedProduct) {
        setSelectedProduct(matchedProduct);
        setProductSearch(
          matchedProduct.item_number != null
            ? `${matchedProduct.item_number} — ${matchedProduct.name}`
            : matchedProduct.name
        );
        setItemQty(1);

        setTimeout(() => {
          quantityInputRef.current?.focus();
          quantityInputRef.current?.select();
        }, 50);
      }
    }
  };

  const handleQuantityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();

      if (selectedProduct) {
        handleAddItem();
      }
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateQty = (index: number, newQty: number) => {
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

  const resetFormForNextInvoice = async () => {
    setCustomerName('');
    setSelectedCustomerId(null);
    setItems([]);
    setDiscountPercentage(0);
    setProductSearch('');
    setSelectedProduct(null);
    setItemQty(1);

    try {
      const nextNum = await invoicesService.getNextInvoiceNumber();
      setNextInvoiceNumber(nextNum);
    } catch {
      setNextInvoiceNumber('INV-000001');
    }
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    if (!customerName.trim()) {
      showError(isArabic ? 'برجاء إدخال اسم العميل أو المشتري' : 'Please enter customer name');
      return;
    }

    if (items.length === 0) {
      showError(isArabic ? 'برجاء إضافة صنف واحد على الأقل للفاتورة' : 'Please add at least one product item');
      return;
    }

    if (isEditMode) {
      setShowConfirm(true);
    } else {
      executeCreateInvoice();
    }
  };

  const executeCreateInvoice = async () => {
    const currentInvoiceNumber = nextInvoiceNumber;
    try {
      setIsSubmitting(true);
      const createdInvoice = await invoicesService.create({
        customer_id: selectedCustomerId,
        customer_name_snapshot: customerName.trim(),
        subtotal,
        discount_percentage: Number(discountPercentage) || 0,
        discount_amount: discountAmount,
        final_total: finalTotal,
        items,
      });

      const assignedNum = createdInvoice.invoice_number || currentInvoiceNumber;

      showSuccess(
        isArabic
          ? `تم حفظ الفاتورة ${assignedNum} بنجاح`
          : `Invoice ${assignedNum} saved successfully`
      );

      await resetFormForNextInvoice();
    } catch (err: any) {
      console.error('Save Invoice Error:', err);
      showError(err.message || (isArabic ? 'فشل حفظ الفاتورة في السحابة' : 'Failed to save invoice to cloud'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmEditSave = async () => {
    if (!editInvoiceId || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await invoicesService.update(editInvoiceId, {
        customer_id: selectedCustomerId,
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
      navigate('/invoices');
    } catch (err: any) {
      console.error('Update Invoice Error:', err);
      showError(err.message || (isArabic ? 'فشل تعديل الفاتورة' : 'Failed to update invoice'));
      setShowConfirm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProducts = productsList.filter((p) => {
    if (!p) return false;
    const term = (productSearch || '').trim().toLowerCase();
    if (!term) return true;

    // Item Number match (exact or numeric start)
    const itemNumStr = p.item_number != null ? String(p.item_number) : '';
    if (itemNumStr === term || itemNumStr.startsWith(term)) {
      return true;
    }

    // Product Name match (case-insensitive)
    const nameMatch = p.name && p.name.toLowerCase().includes(term);
    return nameMatch;
  });

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-surface-900">
              {isEditMode
                ? (isArabic ? `تعديل الفاتورة (${nextInvoiceNumber})` : `Edit Invoice (${nextInvoiceNumber})`)
                : (isArabic ? 'إنشاء فاتورة بيع جديدة' : 'Create New Sales Invoice')}
            </h1>
            <span className="px-3 py-1 rounded-lg text-xs font-mono font-bold bg-brand-50 text-brand-700 border border-brand-200 flex items-center gap-1.5">
              {isEditMode && <Edit3 className="w-3.5 h-3.5 text-brand-600" />}
              {nextInvoiceNumber}
            </span>
          </div>
          <p className="text-xs text-surface-500 mt-0.5">
            {isEditMode
              ? (isArabic ? 'تعديل أصناف الفاتورة والعميل والخصومات وتحديث البيانات في السحابة' : 'Update items, customer details, and discount values in Supabase')
              : (isArabic ? 'إدخال الأصناف وحفظ لقطات الأسعار في قاعدة البيانات السحابية' : 'Build invoice and save immutable snapshots to Supabase')}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => navigate('/invoices')}
          icon={<ArrowLeft className="w-4 h-4" />}
        >
          {isArabic ? 'رجوع للفواتير' : 'Back to Invoices'}
        </Button>
      </div>

      {loadingData ? (
        <LoadingSpinner label={isArabic ? 'جاري تحميل بيانات الفاتورة...' : 'Loading invoice details...'} />
      ) : (
        <form onSubmit={handleSubmitForm} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 columns: Customer & Product Items Table */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Details */}
            <Card title={isArabic ? 'بيانات العميل / المستشفى' : 'Customer Information'}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label={isArabic ? 'رقم الفاتورة' : 'Invoice Number'}
                    value={nextInvoiceNumber}
                    readOnly
                    className="bg-surface-50 font-mono font-bold text-brand-600 cursor-not-allowed"
                  />
                  <Input
                    label={isArabic ? 'اسم العميل / المستشفى *' : 'Customer / Hospital Name *'}
                    placeholder={isArabic ? 'أدخل اسم العميل أو الجهة...' : 'Enter customer or hospital name...'}
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      setSelectedCustomerId(null);
                    }}
                    required
                  />
                </div>

                {/* Existing Customer Quick Select */}
                {customersList.length > 0 && (
                  <div>
                    <label className="block text-[11px] font-semibold text-surface-500 mb-1.5">
                      {isArabic ? 'أو اختر عميل مسجل من القائمة:' : 'Or pick an existing customer:'}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {customersList.map((c) => (
                        <button
                          type="button"
                          key={c.id}
                          onClick={() => handleSelectCustomer(c)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                            selectedCustomerId === c.id
                              ? 'bg-brand-500 text-white border-brand-500'
                              : 'bg-white border-surface-200 text-surface-700 hover:bg-surface-50'
                          }`}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Product Selector & Search */}
            <Card title={isArabic ? 'إضافة منتجات من كتالوج الصفوة' : 'Add Products from Catalog'}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="md:col-span-7 relative">
                    <Input
                      ref={searchInputRef}
                      label={isArabic ? 'بحث وتحديد المنتج (برقم الصنف أو الاسم)' : 'Search Product (by Item # or Name)'}
                      placeholder={isArabic ? 'اكتب رقم الصنف (مثال: 1 أو 14) أو اسم المنتج (مثال: ALBUMIN)...' : 'Type Item # (e.g. 1 or 14) or Product Name...'}
                      value={productSearch}
                      enterKeyHint="next"
                      onChange={(e) => {
                        setProductSearch(e.target.value);
                        setSelectedProduct(null);
                      }}
                      onKeyDown={handleSearchKeyDown}
                    />
                    {productSearch && !selectedProduct && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-surface-200 rounded-xl shadow-xl max-h-56 overflow-y-auto z-30 mt-1">
                        {filteredProducts.length > 0 ? (
                          filteredProducts.map((p) => (
                            <button
                              type="button"
                              key={p.id}
                              onClick={() => {
                                setSelectedProduct(p);
                                setProductSearch(p.item_number != null ? `${p.item_number} — ${p.name}` : p.name);
                                setItemQty(1);
                                setTimeout(() => {
                                  quantityInputRef.current?.focus();
                                  quantityInputRef.current?.select();
                                }, 50);
                              }}
                              className="w-full text-right px-4 py-2.5 text-xs hover:bg-brand-50 flex justify-between items-center border-b border-surface-100 last:border-none transition-colors"
                            >
                              <div className="flex items-center gap-2.5">
                                {p.item_number != null && (
                                  <span className="px-2 py-0.5 rounded bg-brand-100 text-brand-800 font-mono font-extrabold text-xs shrink-0">
                                    #{p.item_number}
                                  </span>
                                )}
                                <div>
                                  <span className="font-bold text-surface-900 block">{p.name}</span>
                                  {p.category && <span className="text-[10px] text-surface-400">{p.category}</span>}
                                </div>
                              </div>
                              <span className="text-emerald-600 font-bold shrink-0 mr-2">{formatCurrency(p.price, true)}</span>
                            </button>
                          ))
                        ) : (
                          <div className="p-3 text-center text-xs text-surface-400">
                            {isArabic ? 'لا توجد منتجات مطابقة' : 'No matching products'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-3">
                    <Input
                      ref={quantityInputRef}
                      label={isArabic ? 'الكمية' : 'Quantity'}
                      type="number"
                      min="1"
                      value={itemQty}
                      enterKeyHint="add"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setItemQty(Number(e.target.value))}
                      onKeyDown={handleQuantityKeyDown}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Button
                      type="button"
                      variant="primary"
                      className="w-full py-2"
                      onClick={handleAddItem}
                      disabled={!selectedProduct}
                      icon={<Plus className="w-4 h-4" />}
                    >
                      {isArabic ? 'إضافة' : 'Add'}
                    </Button>
                  </div>
                </div>

                {selectedProduct && (
                  <div className="p-3 bg-brand-50 border border-brand-200 rounded-lg text-xs text-brand-900 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      {selectedProduct.item_number != null && (
                        <span className="px-2 py-0.5 rounded bg-brand-600 text-white font-mono font-bold">
                          #{selectedProduct.item_number}
                        </span>
                      )}
                      <div>
                        <span>الصنف المحدد: </span>
                        <strong className="text-brand-950">{selectedProduct.name}</strong>
                      </div>
                    </div>
                    <div className="font-bold text-emerald-700">
                      سعر الوحدة: {formatCurrency(selectedProduct.price, true)}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Added Items Snapshot Table */}
            <Card title={isArabic ? `جدول أصناف الفاتورة (${items.length})` : `Invoice Items Table (${items.length})`}>
              <div className="overflow-x-auto border border-surface-200 rounded-xl">
                <table className="w-full text-xs text-right">
                  <thead className="bg-surface-100 text-surface-900 font-bold border-b border-surface-200">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">الصنف</th>
                      <th className="p-3 text-center w-24">الكمية</th>
                      <th className="p-3 text-right">سعر الوحدة</th>
                      <th className="p-3 text-right">السعر الإجمالي</th>
                      <th className="p-3 text-center w-16">إزالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100">
                    {items.length > 0 ? (
                      items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-surface-50/80">
                          <td className="p-3 font-mono text-surface-400">{idx + 1}</td>
                          <td className="p-3 font-semibold text-surface-900">{item.product_name_snapshot}</td>
                          <td className="p-3 text-center">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleUpdateQty(idx, Number(e.target.value))}
                              className="w-16 px-2 py-1 border border-surface-200 rounded text-center font-bold"
                            />
                          </td>
                          <td className="p-3 text-right text-surface-600">{formatCurrency(item.unit_price, true)}</td>
                          <td className="p-3 text-right font-bold text-surface-900">{formatCurrency(item.total, true)}</td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-surface-400">
                          {isArabic ? 'لم يتم إضافة أصناف بعد. ابحث عن منتج وأضفه للفاتورة أعلاه.' : 'No items added yet.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 p-3 rounded-lg bg-surface-50 border border-surface-200 text-xs text-surface-500 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  {isArabic
                    ? 'يتم تخزين اسم المنتج وسعر الوحدة كلقطة (Snapshot) ثابته تمنع أي تغييرات مستقبلية في الأسعار من التأثير على هذه الفاتورة.'
                    : 'Product names and unit prices are stored as immutable snapshots in invoice_items.'}
                </span>
              </div>
            </Card>
          </div>

          {/* Right 1 column: Summary & Save Button */}
          <div className="space-y-6">
            <Card title={isArabic ? 'ملخص الحساب والخصم' : 'Totals & Calculations'}>
              <div className="space-y-4 text-xs">
                <div className="flex justify-between py-2 border-b border-surface-100">
                  <span className="text-surface-600">{isArabic ? 'المجموع الفرعي (Subtotal):' : 'Subtotal:'}</span>
                  <span className="font-bold text-surface-900 text-sm">{formatCurrency(subtotal, true)}</span>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-surface-700">
                    {isArabic ? 'نسبة الخصم (%):' : 'Discount Percentage (%):'}
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={discountPercentage}
                    onChange={(e) => setDiscountPercentage(Number(e.target.value))}
                  />
                </div>

                <div className="flex justify-between py-2 border-b border-surface-100 text-amber-700 font-medium">
                  <span>{isArabic ? 'قيمة الخصم:' : 'Discount Amount:'}</span>
                  <span className="font-bold">{formatCurrency(discountAmount, true)}</span>
                </div>

                <div className="flex justify-between py-3 px-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-base font-extrabold">
                  <span>{isArabic ? 'الصافي النهائي:' : 'Final Total:'}</span>
                  <span className="text-emerald-700 text-lg">{formatCurrency(finalTotal, true)}</span>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full py-3 text-sm font-bold shadow-md"
                    isLoading={isSubmitting}
                    disabled={isSubmitting}
                    icon={<Save className="w-4 h-4" />}
                  >
                    {isSubmitting
                      ? isEditMode
                        ? (isArabic ? 'جاري حفظ التعديلات...' : 'Saving changes...')
                        : (isArabic ? 'جاري الحفظ...' : 'Saving...')
                      : isEditMode
                      ? (isArabic ? 'حفظ التعديلات' : 'Save Changes')
                      : (isArabic ? 'حفظ الفاتورة في السحابة' : 'Save Invoice to Supabase')}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </form>
      )}

      {/* Confirmation Modal for Edit Mode */}
      <ConfirmModal
        isOpen={showConfirm}
        title={isArabic ? 'تأكيد تعديل الفاتورة' : 'Confirm Edit Invoice'}
        message={isArabic ? 'هل تريد حفظ التعديلات على هذه الفاتورة؟' : 'Do you want to save changes to this invoice?'}
        confirmText={isSubmitting ? (isArabic ? 'جاري حفظ التعديلات...' : 'Saving changes...') : (isArabic ? 'نعم، حفظ التعديلات' : 'Yes, save changes')}
        cancelText={isArabic ? 'إلغاء' : 'Cancel'}
        variant="primary"
        isLoading={isSubmitting}
        onConfirm={handleConfirmEditSave}
        onCancel={() => !isSubmitting && setShowConfirm(false)}
      />
    </div>
  );
};
