import React, { useEffect, useState } from 'react';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { invoicesService } from '@/services/invoicesService';
import { productsService } from '@/services/productsService';
import { customersService } from '@/services/customersService';
import type { Invoice } from '@/lib/database.types';
import { formatCurrency } from '@/utils/formatters';
import {
  FileText,
  Users,
  Package,
  PlusCircle,
  Database,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface CustomerSalesSummary {
  name: string;
  invoiceCount: number;
  totalSales: number;
}

export const Dashboard: React.FC = () => {
  const { isArabic } = useLanguage();
  const { user, profile, isConfigured } = useAuth();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [productCount, setProductCount] = useState<number>(0);
  const [customerCount, setCustomerCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isConfigured && user) {
      setLoading(true);
      Promise.all([
        invoicesService.getAll(),
        productsService.getAll(),
        customersService.getAll(),
      ])
        .then(([invs, prods, custs]) => {
          setInvoices(invs);
          setProductCount(prods.length);
          setCustomerCount(custs.length);
        })
        .catch((err) => console.error('Error fetching dashboard stats:', err))
        .finally(() => setLoading(false));
    }
  }, [isConfigured, user]);

  // Real calculations
  const totalSales = invoices.reduce((sum, inv) => sum + Number(inv.final_total || 0), 0);

  // Group sales by customer snapshot name
  const customerSalesMap: Record<string, CustomerSalesSummary> = {};
  invoices.forEach((inv) => {
    const name = inv.customer_name_snapshot || 'غير محدد';
    if (!customerSalesMap[name]) {
      customerSalesMap[name] = { name, invoiceCount: 0, totalSales: 0 };
    }
    customerSalesMap[name].invoiceCount += 1;
    customerSalesMap[name].totalSales += Number(inv.final_total || 0);
  });

  const customerSalesList = Object.values(customerSalesMap).sort(
    (a, b) => b.totalSales - a.totalSales
  );

  return (
    <div className="space-y-6" dir={isArabic ? 'rtl' : 'ltr'}>
      {/* Top Banner / Welcome */}
      <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-surface-900">
              {isArabic ? `مرحباً بك، ${profile?.full_name || 'الصفوة ميديكال'}` : `Welcome back, ${profile?.full_name || 'AlSafwa User'}`}
            </h1>
          </div>
          <p className="text-xs text-surface-500">
            {isArabic
              ? 'مجموعة الصفوة ميديكال - لوحة متابعة الفواتير والمبيعات السحابية الحقيقية'
              : 'AlSafwa Medical Group - Live Cloud Database Analytics'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/create-invoice"
            className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{isArabic ? 'إنشاء فاتورة جديدة' : 'Create New Invoice'}</span>
          </Link>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner label={isArabic ? 'جاري حساب إحصائيات المبيعات من السحابة...' : 'Calculating sales analytics...'} />
      ) : (
        <>
          {/* Quick Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Sales */}
            <Card className="hover:border-emerald-300 bg-emerald-50/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-emerald-800">{isArabic ? 'إجمالي اﻹيرادات والمبيعات' : 'Overall Total Sales'}</p>
                  <h3 className="text-xl font-extrabold text-emerald-700 mt-1">
                    {formatCurrency(totalSales, isArabic)}
                  </h3>
                  <p className="text-[11px] text-emerald-600 mt-0.5">{isArabic ? 'مجموع الصافي من السحابة' : 'Real Supabase Revenue'}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
            </Card>

            {/* Total Invoices */}
            <Card className="hover:border-brand-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-surface-500">{isArabic ? 'عدد الفواتير الصادرة' : 'Total Invoices'}</p>
                  <h3 className="text-2xl font-bold text-surface-900 mt-1">{invoices.length}</h3>
                  <p className="text-[11px] text-surface-400 mt-0.5">{isArabic ? 'مسجلة في Supabase' : 'Stored Invoices'}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
              </div>
            </Card>

            {/* Products Catalog */}
            <Card className="hover:border-brand-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-surface-500">{isArabic ? 'كتالوج المنتجات' : 'Products Catalog'}</p>
                  <h3 className="text-2xl font-bold text-surface-900 mt-1">{productCount}</h3>
                  <p className="text-[11px] text-surface-400 mt-0.5">{isArabic ? 'أصناف الصفوة المعتمدة' : 'GPL Approved Products'}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
              </div>
            </Card>

            {/* Active Customers */}
            <Card className="hover:border-brand-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-surface-500">{isArabic ? 'العملاء المسجلين' : 'Active Customers'}</p>
                  <h3 className="text-2xl font-bold text-surface-900 mt-1">{customerCount}</h3>
                  <p className="text-[11px] text-surface-400 mt-0.5">{isArabic ? 'سجل المستشفيات' : 'Registered Clients'}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
              </div>
            </Card>
          </div>

          {/* Customer Sales Breakdown Table */}
          <Card title={isArabic ? 'تحليل مبيعات العملاء والمستشفيات (Real Supabase Data)' : 'Customer Sales Breakdown'}>
            {customerSalesList.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right">
                  <thead className="bg-surface-50 text-surface-700 font-bold border-b border-surface-200">
                    <tr>
                      <th className="px-4 py-3">{isArabic ? 'اسم العميل / الجهة' : 'Customer Name'}</th>
                      <th className="px-4 py-3 text-center">{isArabic ? 'عدد الفواتير الصادرة' : 'Invoices Count'}</th>
                      <th className="px-4 py-3 text-left">{isArabic ? 'إجمالي المبيعات' : 'Total Sales'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100">
                    {customerSalesList.map((item, idx) => (
                      <tr key={idx} className="hover:bg-surface-50">
                        <td className="px-4 py-3 font-semibold text-surface-900">{item.name}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="brand">{item.invoiceCount}</Badge>
                        </td>
                        <td className="px-4 py-3 text-left font-extrabold text-emerald-700">
                          {formatCurrency(item.totalSales, isArabic)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-surface-400 text-xs">
                {isArabic ? 'لا توجد مبيعات أو فواتير صادرة حالياً' : 'No sales recorded yet'}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
};
