import React, { useEffect, useState } from 'react';
import type { Invoice } from '@/lib/database.types';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/common/Button';
import { PrintableInvoice } from '@/components/invoices/PrintableInvoice';
import { downloadInvoicePDF } from '@/utils/pdfGenerator';
import { Printer, Download, X } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

interface InvoicePreviewModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
}

export const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({
  invoice,
  isOpen,
  onClose,
}) => {
  const { isArabic } = useLanguage();
  const { showError, showSuccess } = useToast();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = invoice ? `فاتورة - الصفوة ميديكال جروب (${invoice.invoice_number})` : 'فاتورة - الصفوة ميديكال جروب';
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  const handleDownloadPDF = async () => {
    try {
      setIsGeneratingPdf(true);
      await downloadInvoicePDF('printable-invoice', `Invoice_${invoice.invoice_number}.pdf`);
      showSuccess(isArabic ? 'تم تحميل ملف PDF بنجاح' : 'Invoice PDF downloaded successfully');
    } catch (err: any) {
      console.error('PDF Generation Error:', err);
      showError(isArabic ? 'فشل إنشاء ملف PDF' : 'Failed to generate PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/60 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-surface-200 relative my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Action Header Bar (Hidden during print) */}
        <div className="flex items-center justify-between border-b border-surface-100 pb-4 mb-6 print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-sm bg-brand-50 text-brand-700 px-3 py-1 rounded-lg border border-brand-200">
              {invoice.invoice_number}
            </span>
            <span className="text-xs text-surface-500 font-medium">
              {isArabic ? 'معاينة الفاتورة' : 'Invoice View'}
            </span>
          </div>

          <div className="flex items-center gap-2">
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
            <button
              type="button"
              onClick={onClose}
              title={isArabic ? 'إغلاق (Esc)' : 'Close (Esc)'}
              aria-label={isArabic ? 'إغلاق الفاتورة' : 'Close invoice preview'}
              className="p-1.5 rounded-lg text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-colors ml-2 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Container */}
        <PrintableInvoice invoice={invoice} />
      </div>
    </div>
  );
};
