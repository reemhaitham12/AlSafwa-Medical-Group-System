import React from 'react';
import { X } from 'lucide-react';
import { Sidebar } from './Sidebar';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-surface-900/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 max-w-xs w-full bg-white shadow-xl z-10 flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-surface-400 hover:text-surface-700 hover:bg-surface-100 z-20"
        >
          <X className="w-5 h-5" />
        </button>
        <Sidebar onCloseMobile={onClose} />
      </div>
    </div>
  );
};
