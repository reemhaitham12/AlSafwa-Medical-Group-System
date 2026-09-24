import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  action,
  children,
  className,
  ...props
}) => {
  return (
    <div
      className={twMerge(
        clsx(
          'bg-white rounded-xl border border-surface-200 shadow-sm p-5 md:p-6 transition-all',
          className
        )
      )}
      {...props}
    >
      {(title || subtitle || action) && (
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-surface-100">
          <div>
            {title && <h3 className="text-base font-semibold text-surface-900">{title}</h3>}
            {subtitle && <p className="text-xs text-surface-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
