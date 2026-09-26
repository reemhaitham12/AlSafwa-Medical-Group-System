import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Users,
  Package,
  Truck,
  Boxes,
  Settings,
  Activity,
  LogOut
} from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { APP_CONFIG } from '@/utils/constants';

interface SidebarProps {
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile }) => {
  const { isArabic } = useLanguage();
  const { profile, logout } = useAuth();

  const navItems = [
    { path: '/dashboard', label: isArabic ? 'لوحة التحكم' : 'Dashboard', icon: LayoutDashboard },
    { path: '/invoices', label: isArabic ? 'الفواتير' : 'Invoices', icon: FileText },
    { path: '/create-invoice', label: isArabic ? 'إنشاء فاتورة' : 'Create Invoice', icon: PlusCircle },
    { path: '/customers', label: isArabic ? 'العملاء' : 'Customers', icon: Users },
    { path: '/products', label: isArabic ? 'المنتجات' : 'Products', icon: Package },
    { path: '/stock-order', label: isArabic ? 'طلبيات المخزن' : 'Stock Order', icon: Truck },
    { path: '/inventory', label: isArabic ? 'المنتجات والمخزون' : 'Products & Inventory', icon: Boxes },
    { path: '/settings', label: isArabic ? 'الإعدادات' : 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-surface-200 flex flex-col h-full select-none shrink-0">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-surface-100 bg-white">
        <div className="w-9 h-9 rounded-lg bg-brand-500 text-white flex items-center justify-center font-bold text-lg shadow-sm">
          <Activity className="w-5 h-5" />
        </div>
        <div className="overflow-hidden">
          <h1 className="font-bold text-sm text-surface-900 leading-tight truncate">
            {isArabic ? APP_CONFIG.nameAr : APP_CONFIG.nameEn}
          </h1>
          <p className="text-[11px] text-surface-500 leading-none mt-0.5 font-medium">
            {isArabic ? APP_CONFIG.systemNameAr : APP_CONFIG.systemNameEn}
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-brand-50 text-brand-600 font-semibold shadow-xs'
                    : 'text-surface-600 hover:bg-surface-50 hover:text-surface-900'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User Info & Logout Footer */}
      <div className="p-4 border-t border-surface-100 bg-surface-50/50">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-surface-900 truncate">
              {profile?.full_name || 'AlSafwa User'}
            </p>
            <p className="text-[11px] text-surface-500 truncate">
              {profile?.email || 'Single Account'}
            </p>
          </div>
          <button
            onClick={() => logout()}
            title={isArabic ? 'تسجيل الخروج' : 'Logout'}
            className="p-1.5 rounded-md text-surface-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
