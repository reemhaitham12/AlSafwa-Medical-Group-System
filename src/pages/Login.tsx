import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Activity, Lock, Mail, Globe, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { APP_CONFIG } from '@/utils/constants';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, isConfigured } = useAuth();
  const { isArabic, toggleLanguage, direction } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError(isArabic ? 'برجاء إدخال البريد الإلكتروني وكلمة المرور' : 'Please fill in all fields');
      return;
    }

    if (!isConfigured) {
      setError(
        isArabic
          ? 'تنبيه: مفاتيح Supabase غير مضافة في ملف .env. يمكن التنقل للاستعراض المباشر.'
          : 'Supabase credentials not configured in .env. Navigating in preview mode.'
      );
      setTimeout(() => navigate('/dashboard'), 1200);
      return;
    }

    try {
      setIsSubmitting(true);
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || (isArabic ? 'فشل تسجيل الدخول. تحقق من البيانات.' : 'Failed to sign in. Check credentials.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoBypass = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-surface-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans" dir={direction}>
      {/* Top right language switcher */}
      <div className="absolute top-6 right-6">
        <button
          onClick={toggleLanguage}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-200 bg-white text-xs font-semibold text-surface-700 hover:bg-surface-50 shadow-xs transition-colors"
        >
          <Globe className="w-3.5 h-3.5 text-brand-500" />
          <span>{isArabic ? 'English' : 'العربية'}</span>
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo & Brand Header */}
        <div className="flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-brand-500 text-white flex items-center justify-center font-bold text-2xl shadow-md mb-3">
            <Activity className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-surface-900 tracking-tight text-center">
            {isArabic ? APP_CONFIG.nameAr : APP_CONFIG.nameEn}
          </h2>
          <p className="mt-1 text-xs text-surface-500 font-medium text-center">
            {isArabic ? APP_CONFIG.systemNameAr : APP_CONFIG.systemNameEn}
          </p>
        </div>

        {/* Form Container */}
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-6 shadow-sm border border-surface-200 sm:rounded-xl sm:px-10">
            {error && (
              <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {!isConfigured && (
              <div className="mb-5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">{isArabic ? 'بيئة العمل بدون Supabase keys' : 'No Supabase Keys Set'}</p>
                  <p className="mt-0.5 text-amber-800">
                    {isArabic
                      ? 'يمكنك استعراض النظام بالكامل عبر الزر أدناه لحين إضافة المتغيرات.'
                      : 'You can explore the system architecture using the preview mode button below.'}
                  </p>
                </div>
              </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <Input
                label={isArabic ? 'البريد الإلكتروني' : 'Email Address'}
                type="email"
                required
                placeholder="user@alsafwa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="w-4 h-4" />}
              />

              <Input
                label={isArabic ? 'كلمة المرور' : 'Password'}
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock className="w-4 h-4" />}
              />

              <div>
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full py-2.5"
                  isLoading={isSubmitting}
                  icon={<ArrowRight className="w-4 h-4" />}
                >
                  {isArabic ? 'تسجيل الدخول' : 'Sign In'}
                </Button>
              </div>
            </form>

            {!isConfigured && (
              <div className="mt-6 border-t border-surface-100 pt-5 text-center">
                <button
                  type="button"
                  onClick={handleDemoBypass}
                  className="text-xs text-brand-600 hover:text-brand-700 font-semibold underline underline-offset-4"
                >
                  {isArabic ? 'الدخول لاستعراض واجهة النظام (Preview Shell)' : 'Bypass to Preview Dashboard'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
