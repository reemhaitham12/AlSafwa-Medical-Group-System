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
  const { profile } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-surface-900">
          {isArabic ? 'إعدادات النظام والشركة' : 'System & Company Settings'}
        </h1>
        <p className="text-xs text-surface-500 mt-0.5">
          {isArabic ? 'بيانات مجموعة الصفوة ميديكال وتفضيلات الحساب والواجهة' : 'AlSafwa Group organization profile, account session & preferences'}
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

        {/* System & Interface Preferences */}
        <Card title={isArabic ? 'تفضيلات النظام والواجهة' : 'System & Interface Preferences'}>
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between py-2">
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
            <div className="flex justify-between py-2">
              <span className="text-surface-500">{isArabic ? 'صلاحية الحساب' : 'Account Role'}</span>
              <span className="font-semibold">
                {profile?.role === 'viewer' ? (
                  <Badge variant="warning">{isArabic ? 'مشاهدة فقط (Viewer)' : 'View-Only (Viewer)'}</Badge>
                ) : (
                  <Badge variant="brand">{isArabic ? 'مدير كامل الصلاحيات (Admin)' : 'Administrator'}</Badge>
                )}
              </span>
            </div>
          </div>
        </Card>

        {/* Viewer Account Security Card (For Admin/Owner) */}
        <Card
          title={isArabic ? 'إدارة حساب المشاهدة (View-Only Viewer Account)' : 'Viewer Account Configuration'}
          subtitle={
            isArabic
              ? 'صلاحيات الحساب للقراءة والاستعراض فقط بدون تعديل أو حذف ومع إخفاء إجمالي المبيعات'
              : 'Read-only access configuration with hidden Total Sales metrics'
          }
          className="lg:col-span-2"
        >
          <div className="space-y-3 text-xs text-surface-600">
            <div className="p-3.5 bg-slate-50 border border-surface-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-surface-900 font-bold text-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>
                  {isArabic
                    ? 'سياسة أمان حساب المشاهد (View-Only Security & Permissions)'
                    : 'Viewer Account Security Policy'}
                </span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-surface-600 text-xs">
                <li>
                  {isArabic
                    ? 'يستطيع استعراض جميع الفواتير وقائمة المنتجات والعملاء وطلبيات المخزن والمخزون.'
                    : 'Can browse invoices, products catalog, customers directory, stock orders, and inventory.'}
                </li>
                <li>
                  {isArabic
                    ? 'زر المعاينة (أيقونة العين 👁️) وطباعة الفاتورة وتحميل PDF مفعل بالكامل لعرض الفاتورة.'
                    : 'View Invoice (eye icon), Print, and PDF download remain fully enabled.'}
                </li>
                <li>
                  {isArabic
                    ? 'يتم إخفاء بطاقة "إجمالي المبيعات" وتحليلات المبيعات المالية بالكامل من لوحة التحكم.'
                    : 'Total Sales metric card and monetary sales breakdown are completely hidden from Dashboard.'}
                </li>
                <li>
                  {isArabic
                    ? 'محمية ومؤمنة على مستوى قاعدة بيانات Supabase RLS وسياسات الحماية ضد أي محاولات إضافة أو تعديل أو حذف مباشرة.'
                    : 'Enforced at both UI layer and Supabase PostgreSQL RLS level against unauthorized write attempts.'}
                </li>
              </ul>
            </div>

            <div className="p-3 bg-brand-50 border border-brand-200 rounded-xl text-brand-900">
              <p className="font-bold mb-1">
                {isArabic ? '📌 خطوات إنشاء أو تعيين حساب المشاهدة:' : '📌 Setup & Assignment Steps:'}
              </p>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-brand-800">
                <li>
                  {isArabic
                    ? 'في لوحة تحكم Supabase > Authentication > Users: أضف بريد وكلمة مرور الحساب الجديد.'
                    : 'In Supabase Dashboard > Authentication > Users: add the new user email & password.'}
                </li>
                <li>
                  {isArabic
                    ? 'في محرر SQL Editor قم بتشغيل ملف الهجرة supabase/viewer_role_migration.sql.'
                    : 'In Supabase SQL Editor: execute supabase/viewer_role_migration.sql.'}
                </li>
                <li>
                  {isArabic
                    ? "لتعيين الدور كمشاهد قم بتنفيذ: UPDATE profiles SET role = 'viewer' WHERE email = 'viewer@alsafwa.com';"
                    : "Assign viewer role via SQL: UPDATE profiles SET role = 'viewer' WHERE email = 'viewer@alsafwa.com';"}
                </li>
              </ol>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
