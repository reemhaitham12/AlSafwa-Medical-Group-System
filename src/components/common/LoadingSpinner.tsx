import React from 'react';

export const LoadingSpinner: React.FC<{ fullScreen?: boolean; label?: string }> = ({
  fullScreen = false,
  label = 'Loading...',
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center p-6 gap-3">
      <div className="relative w-10 h-10">
        <div className="w-10 h-10 rounded-full border-4 border-surface-200 animate-spin border-t-brand-500"></div>
      </div>
      {label && <p className="text-xs font-medium text-surface-500">{label}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
};
