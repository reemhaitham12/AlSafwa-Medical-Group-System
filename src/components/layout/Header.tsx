import React from 'react';
import { Menu, Globe, ShieldCheck, User as UserIcon } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/common/Badge';

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const { language, toggleLanguage, isArabic } = useLanguage();
  const { profile, isConfigured } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-surface-200 px-4 md:px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left side: Mobile Toggle & Status */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-lg text-surface-600 hover:bg-surface-100 transition-colors"
          aria-label="Open mobile menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2">
          {isConfigured ? (
            <Badge variant="success" className="gap-1.5 py-1">
              <ShieldCheck className="w-3.5 h-3.5 text-success-600" />
              <span>{isArabic ? 'متصل بالسحابة' : 'Cloud DB Connected'}</span>
            </Badge>
          ) : (
            <Badge variant="warning" className="gap-1.5 py-1">
              <span>{isArabic ? 'في انتظار الإعداد' : 'Setup Required'}</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Right side: Language Switcher & User Profile */}
      <div className="flex items-center gap-3">
        {/* Language Switcher */}
        <button
          onClick={toggleLanguage}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-200 text-xs font-semibold text-surface-700 hover:bg-surface-50 transition-colors"
        >
          <Globe className="w-3.5 h-3.5 text-brand-500" />
          <span>{language === 'ar' ? 'English' : 'العربية'}</span>
        </button>

        {/* User Pill */}
        <div className="flex items-center gap-2 pl-2 border-l border-surface-200">
          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs">
            {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
          </div>
          <div className="hidden lg:block text-right">
            <span className="block text-xs font-semibold text-surface-900 leading-tight">
              {profile?.full_name || 'Staff User'}
            </span>
            <span className="block text-[10px] text-surface-500 leading-none">
              {profile?.email}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
