import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'brand' | 'warning' | 'neutral' | 'danger';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'brand',
  className,
}) => {
  const variants = {
    success: 'bg-success-50 text-success-700 border-success-200',
    brand: 'bg-brand-50 text-brand-700 border-brand-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    neutral: 'bg-surface-100 text-surface-700 border-surface-200',
    danger: 'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
          variants[variant],
          className
        )
      )}
    >
      {children}
    </span>
  );
};
