import React from 'react';
import type { InvoiceDebtStatus } from '@/lib/database.types';

interface DebtStatusIndicatorProps {
  status?: InvoiceDebtStatus | null;
  className?: string;
  showLabel?: boolean;
}

export const DebtStatusIndicator: React.FC<DebtStatusIndicatorProps> = ({
  status = 'unreconciled',
  className = '',
  showLabel = false,
}) => {
  const currentStatus: InvoiceDebtStatus = status || 'unreconciled';

  let config = {
    color: 'bg-slate-400',
    ring: 'ring-slate-200',
    text: 'text-slate-600',
    label: 'لم يتم تحديث المديونية',
    badgeBg: 'bg-slate-50',
    badgeBorder: 'border-slate-200',
  };

  if (currentStatus === 'applied') {
    config = {
      color: 'bg-emerald-500',
      ring: 'ring-emerald-200',
      text: 'text-emerald-700',
      label: 'تم تحديث المديونية',
      badgeBg: 'bg-emerald-50',
      badgeBorder: 'border-emerald-200',
    };
  } else if (currentStatus === 'failed') {
    config = {
      color: 'bg-red-500 animate-pulse',
      ring: 'ring-red-200',
      text: 'text-red-700',
      label: 'فشل تحديث المديونية',
      badgeBg: 'bg-red-50',
      badgeBorder: 'border-red-200',
    };
  }

  if (showLabel) {
    return (
      <span
        title={config.label}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border ${config.badgeBg} ${config.badgeBorder} ${config.text} ${className}`}
      >
        <span className={`w-2 h-2 rounded-full ${config.color} shrink-0`} />
        <span>{config.label}</span>
      </span>
    );
  }

  return (
    <span
      title={config.label}
      aria-label={config.label}
      className={`inline-flex items-center justify-center cursor-help shrink-0 ${className}`}
    >
      <span
        className={`w-2.5 h-2.5 rounded-full ${config.color} ring-2 ${config.ring} shrink-0 transition-transform hover:scale-125`}
      />
    </span>
  );
};
