import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from './Button';
import { useLanguage } from '@/hooks/useLanguage';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'danger';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  const { isArabic } = useLanguage();

  if (!isOpen) return null;

  const iconBg = variant === 'danger' ? 'bg-red-50 text-red-600' : 'bg-brand-50 text-brand-600';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-surface-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-surface-200 relative" dir="rtl">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="absolute top-4 left-4 text-surface-400 hover:text-surface-600 p-1 rounded-lg transition-colors disabled:opacity-50"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-full ${iconBg} flex items-center justify-center shrink-0`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-surface-900">{title}</h3>
            <p className="text-xs text-surface-600 mt-1 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={isLoading}>
            {cancelText || (isArabic ? 'إلغاء' : 'Cancel')}
          </Button>
          <Button variant={variant} size="sm" onClick={onConfirm} isLoading={isLoading} disabled={isLoading}>
            {confirmText || (isArabic ? 'تأكيد' : 'Confirm')}
          </Button>
        </div>
      </div>
    </div>
  );
};
