import React from 'react';
import { AlertTriangle, ExternalLink, Key } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

export const SupabaseSetupNotice: React.FC = () => {
  const { isArabic } = useLanguage();

  return (
    <div className="bg-amber-50 border-b border-amber-200 p-4 text-amber-900 text-sm shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-amber-950">
              {isArabic ? 'تنبيه: قاعدة البيانات السحابية (Supabase) غير متصلة بعد' : 'Action Required: Supabase Cloud Database Not Connected'}
            </h4>
            <p className="text-amber-800 mt-0.5">
              {isArabic
                ? 'يرجى إدخال VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY في ملف .env لبدء تخزين المبيعات والبيانات السحابية.'
                : 'Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file or Vercel environment settings.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded transition-colors"
          >
            <Key className="w-3.5 h-3.5" />
            <span>{isArabic ? 'فتح لوحة Supabase' : 'Open Supabase Console'}</span>
            <ExternalLink className="w-3 h-3 ml-1" />
          </a>
        </div>
      </div>
    </div>
  );
};
