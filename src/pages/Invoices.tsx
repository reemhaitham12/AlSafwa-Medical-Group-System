import React, { useEffect, useState } from 'react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Input } from '@/components/common/Input';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { InvoicePreviewModal } from '@/components/invoices/InvoicePreviewModal';
import { PrintableInvoice } from '@/components/invoices/PrintableInvoice';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/context/ToastContext';
import { invoicesService } from '@/services/invoicesService';
import type { Invoice } from '@/lib/database.types';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { downloadInvoicePDF } from '@/utils/pdfGenerator';
import {
  PlusCircle,
  Search,
  FileText,
  RefreshCw,
  Eye,
  Edit,
  Printer,
  Download,
  Trash2,
  AlertOctagon
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export const Invoices: React.FC = () => {
  const { isArabic } = useLanguage();
  const { user, isConfigured } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);
  const [deleteTargetInvoice, setDeleteTargetInvoice] = useState<Invoice | null>(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handlePrintInvoice = (inv: Invoice) => {
    setPrintInvoice(inv);
    setTimeout(() => {
      const originalTitle = document.title;
      document.title = `فاتورة - الصفوة ميديكال جروب (${inv.invoice_number})`;
      window.print();
      setTimeout(() => {
        document.title = originalTitle;
      }, 1000);
    }, 50);
  };

  const fetchInvoices = async () => {
    if (!isConfigured || !user) return;
    setLoading(true);
    try {
      const data = await invoicesService.getAll();
      setInvoices(data);
    } catch (err: any) {
      console.error('Failed to load invoices:', err);
      showError(isArabic ? 'فشل تحميل الفواتير من السحابة' : 'Failed to fetch cloud invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConfigured && user) {
      fetchInvoices();
    }
  }, [user, isConfigured]);

  const handleDeleteConfirm = async () => {
    if (!deleteTargetInvoice) return;
    try {
      setIsDeleting(true);
      await invoicesService.delete(deleteTargetInvoice.id);
      showSuccess(isArabic ? 'تم حذف الفاتورة بنجاح' : 'Invoice deleted successfully');
      setDeleteTargetInvoice(null);
      await fetchInvoices();
    } catch (err: any) {
      console.error('Delete invoice error:', err);
      showError(err.message || (isArabic ? 'فشل حذف الفاتورة' : 'Failed to delete invoice'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAllConfirm = async () => {
    try {
      setIsDeleting(true);
      await invoicesService.deleteAll();
      showSuccess(isArabic ? 'تم حذف جميع الفواتير بنجاح' : 'All invoices deleted successfully');
      setShowDeleteAllModal(false);
      await fetchInvoices();
    } catch (err: any) {
      console.error('Delete all invoices error:', err);
      showError(err.message || (isArabic ? 'فشل حذف جميع الفواتير' : 'Failed to delete all invoices'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadSinglePdf = async (inv: Invoice) => {
    setPreviewInvoice(inv);
    setTimeout(async () => {
      try {
        await downloadInvoicePDF('printable-invoice', `Invoice_${inv.invoice_number}.pdf`);
        showSuccess(isArabic ? 'تم تحميل ملف PDF بنجاح' : 'PDF downloaded successfully');
      } catch (err) {
        showError(isArabic ? 'فشل تحويل الفاتورة لملف PDF' : 'PDF export failed');
      }
    }, 300);
  };

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.customer_name_snapshot.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-surface-900">
            {isArabic ? 'سجل الفواتير والمبيعات' : 'Invoices & Sales Directory'}
          </h1>
          <p className="text-xs text-surface-500 mt-0.5">
            {isArabic ? 'استعراض وطباعة الفواتير المخزنة في السحابة' : 'Manage, edit, print, and export cloud invoices'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {invoices.length > 0 && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowDeleteAllModal(true)}
              icon={<AlertOctagon className="w-3.5 h-3.5" />}
            >
              {isArabic ? 'حذف كل الفواتير' : 'Delete All Invoices'}
            </Button>
          )}
          {isConfigured && (
            <Button
              variant="outline"
              size="sm"
              onClick={fetchInvoices}
              isLoading={loading}
              icon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              {isArabic ? 'تحديث' : 'Refresh'}
            </Button>
          )}
          <Link to="/create-invoice">
            <Button variant="primary" size="sm" icon={<PlusCircle className="w-4 h-4" />}>
              {isArabic ? 'فاتورة جديدة' : 'New Invoice'}
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter & Search */}
      <Card className="p-4">
        <div className="max-w-md">
          <Input
            placeholder={isArabic ? 'بحث برقم الفاتورة أو اسم العميل...' : 'Search by invoice number or customer name...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
      </Card>

      {/* Content Table / Grid */}
      <Card>
        {loading ? (
          <LoadingSpinner label={isArabic ? 'جاري تحميل الفواتير من السحابة...' : 'Fetching cloud invoices...'} />
        ) : filteredInvoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-surface-50 text-surface-700 font-bold border-b border-surface-200">
                <tr>
                  <th className="px-4 py-3.5 text-right">{isArabic ? 'رقم الفاتورة' : 'Invoice #'}</th>
                  <th className="px-4 py-3.5 text-right">{isArabic ? 'اسم العميل' : 'Customer Name'}</th>
                  <th className="px-4 py-3.5 text-right">{isArabic ? 'التاريخ' : 'Date'}</th>
                  <th className="px-4 py-3.5 text-right">{isArabic ? 'المجموع الفرعي' : 'Subtotal'}</th>
                  <th className="px-4 py-3.5 text-right">{isArabic ? 'الخصم' : 'Discount'}</th>
                  <th className="px-4 py-3.5 text-right">{isArabic ? 'الصافي النهائي' : 'Final Total'}</th>
                  <th className="px-4 py-3.5 text-center">{isArabic ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-surface-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-brand-600">
                      {inv.invoice_number}
                    </td>
                    <td className="px-4 py-3 font-semibold text-surface-900">
                      {inv.customer_name_snapshot}
                    </td>
                    <td className="px-4 py-3 text-surface-500">
                      {formatDate(inv.created_at, isArabic)}
                    </td>
                    <td className="px-4 py-3 text-surface-700">
                      {formatCurrency(inv.subtotal, isArabic)}
                    </td>
                    <td className="px-4 py-3 text-surface-500">
                      {inv.discount_percentage > 0 ? (
                        <Badge variant="warning">{inv.discount_percentage}% ({formatCurrency(inv.discount_amount, isArabic)})</Badge>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 font-bold text-emerald-600 text-sm">
                      {formatCurrency(inv.final_total, isArabic)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setPreviewInvoice(inv)}
                          title={isArabic ? 'معاينة الفاتورة (عرض)' : 'View Invoice'}
                          className="p-1.5 rounded-lg text-surface-600 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => navigate(`/create-invoice?edit=${inv.id}`)}
                          title={isArabic ? 'تعديل الفاتورة' : 'Edit Invoice'}
                          className="p-1.5 rounded-lg text-surface-600 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handlePrintInvoice(inv)}
                          title={isArabic ? 'طباعة الفاتورة' : 'Print Invoice'}
                          className="p-1.5 rounded-lg text-surface-600 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDownloadSinglePdf(inv)}
                          title={isArabic ? 'تحميل PDF' : 'Download PDF'}
                          className="p-1.5 rounded-lg text-surface-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setDeleteTargetInvoice(inv)}
                          title={isArabic ? 'حذف الفاتورة' : 'Delete Invoice'}
                          className="p-1.5 rounded-lg text-surface-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-surface-500 space-y-3">
            <FileText className="w-10 h-10 text-surface-300 mx-auto" />
            <p className="text-sm font-medium">
              {isArabic ? 'لا توجد فواتير مسجلة في قاعدة البيانات حالياً' : 'No invoices found in database'}
            </p>
            <p className="text-xs text-surface-400 max-w-sm mx-auto">
              {isArabic
                ? 'عند إضافة فواتير جديدة من شاشة "إنشاء فاتورة"، سيتم حفظها في Supabase واستعراضها هنا.'
                : 'Newly generated invoices will automatically persist in Supabase and appear here.'}
            </p>
          </div>
        )}
      </Card>

      {/* Invoice View Modal */}
      <InvoicePreviewModal
        invoice={previewInvoice}
        isOpen={Boolean(previewInvoice)}
        onClose={() => setPreviewInvoice(null)}
      />

      {/* Single Delete Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteTargetInvoice)}
        title={isArabic ? `حذف الفاتورة ${deleteTargetInvoice?.invoice_number}` : `Delete Invoice ${deleteTargetInvoice?.invoice_number}`}
        message={
          isArabic
            ? 'هل أنت تأكد من رغبتك في حذف هذه الفاتورة وأصنافها؟ لا يمكن التراجع عن هذا الإجراء.'
            : 'Are you sure you want to delete this invoice and its line items? This action cannot be undone.'
        }
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTargetInvoice(null)}
      />

      {/* Delete ALL Invoices Confirm Modal */}
      <ConfirmModal
        isOpen={showDeleteAllModal}
        title={isArabic ? 'هل أنت متأكد من حذف جميع الفواتير؟' : 'Are you sure you want to delete ALL invoices?'}
        message={
          isArabic
            ? 'سيتم حذف جميع الفواتير وبيانات أصنافها من السحابة، ولا يمكن التراجع عن هذه العملية.'
            : 'All invoices and line items will be permanently removed from the cloud database. This action cannot be undone.'
        }
        confirmText={isArabic ? 'تأكيد حذف كل الفواتير' : 'Confirm Delete All'}
        isLoading={isDeleting}
        onConfirm={handleDeleteAllConfirm}
        onCancel={() => setShowDeleteAllModal(false)}
      />

      {/* Printable Invoice element for direct row printing */}
      <PrintableInvoice invoice={printInvoice} className="hidden print:block" />
    </div>
  );
};
