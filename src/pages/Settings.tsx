import React from 'react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { APP_CONFIG } from '@/utils/constants';
import { Globe, ShieldCheck } from 'lucide-react';

export const Settings: React.FC = () => {
  const { isArabic, language, toggleLanguage } = useLanguage();
  const { profile, isConfigured } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-surface-900">
          {isArabic ? 'إعدادات النظام والشركة' : 'System & Company Settings'}
        </h1>
        <p className="text-xs text-surface-500 mt-0.5">
          {isArabic ? 'بيانات مجموعة الصفوة ميديكال وإعدادات اتصال السحابة' : 'AlSafwa Group profile & cloud configuration settings'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Profile */}
        <Card title={isArabic ? 'بيانات المؤسسة' : 'Organization Metadata'}>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-surface-100">
              <span className="text-surface-500">{isArabic ? 'اسم المجموعة (عربي)' : 'Company Name (Ar)'}</span>
              <span className="font-semibold text-surface-900">{APP_CONFIG.nameAr}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-surface-100">
              <span className="text-surface-500">{isArabic ? 'اسم المجموعة (إنجليزي)' : 'Company Name (En)'}</span>
              <span className="font-semibold text-surface-900">{APP_CONFIG.nameEn}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-surface-100">
              <span className="text-surface-500">{isArabic ? 'النظام' : 'System Core'}</span>
              <span className="font-semibold text-surface-900">{APP_CONFIG.systemNameEn}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-surface-500">{isArabic ? 'العملة الأساسية' : 'Default Currency'}</span>
              <span className="font-semibold text-emerald-600">EGP (ج.م)</span>
            </div>
          </div>
        </Card>

        {/* Database Connection */}
        <Card title={isArabic ? 'اتصال Supabase Cloud' : 'Supabase Cloud Database Status'}>
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-lg bg-surface-50 border border-surface-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-surface-700">{isArabic ? 'حالة الإعداد' : 'Config State'}</span>
                {isConfigured ? (
                  <Badge variant="success" className="gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{isArabic ? 'مفعل وجاهز' : 'Connected'}</span>
                  </Badge>
                ) : (
                  <Badge variant="warning">{isArabic ? 'مطلوب إدخال المفاتيح' : 'Env Missing'}</Badge>
                )}
              </div>
              <div className="flex justify-between text-surface-500">
                <span>VITE_SUPABASE_URL</span>
                <span className="font-mono text-[11px]">
                  {import.meta.env.VITE_SUPABASE_URL ? '••••••••.supabase.co' : 'Not Set'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                <p className="font-semibold text-surface-900">{isArabic ? 'لغة الواجهة' : 'Interface Language'}</p>
                <p className="text-surface-500">{language === 'ar' ? 'العربية (RTL)' : 'English (LTR)'}</p>
              </div>
              <Button variant="outline" size="sm" onClick={toggleLanguage} icon={<Globe className="w-3.5 h-3.5" />}>
                {isArabic ? 'تغيير إلى English' : 'Switch to العربية'}
              </Button>
            </div>
          </div>
        </Card>

        {/* User Account */}
        <Card title={isArabic ? 'حساب المستخدم الحالي' : 'Active User Session'}>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-surface-100">
              <span className="text-surface-500">{isArabic ? 'الاسم' : 'Full Name'}</span>
              <span className="font-semibold text-surface-900">{profile?.full_name || 'AlSafwa User'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-surface-100">
              <span className="text-surface-500">{isArabic ? 'البريد الإلكتروني' : 'Email'}</span>
              <span className="font-semibold text-surface-900">{profile?.email || 'N/A'}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
