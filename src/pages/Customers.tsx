import React, { useEffect, useState } from 'react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { customersService } from '@/services/customersService';
import type { Customer } from '@/lib/database.types';
import { Users, Plus, Search, Phone, Mail, MapPin } from 'lucide-react';

export const Customers: React.FC = () => {
  const { isArabic } = useLanguage();
  const { isConfigured } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchCustomers = async () => {
    if (!isConfigured) return;
    setLoading(true);
    try {
      const data = await customersService.getAll();
      setCustomers(data);
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [isConfigured]);

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.phone && c.phone.includes(searchTerm))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-surface-900">
            {isArabic ? 'سجل العملاء والمستشفيات' : 'Customers Directory'}
          </h1>
          <p className="text-xs text-surface-500 mt-0.5">
            {isArabic ? 'بيانات جهات الشراء والعملاء المخزنة في السحابة' : 'Cloud database registry of hospitals and medical clients'}
          </p>
        </div>

        <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />}>
          {isArabic ? 'إضافة عميل جديد' : 'Add Customer'}
        </Button>
      </div>

      {/* Filter */}
      <Card className="p-4">
        <div className="max-w-md">
          <Input
            placeholder={isArabic ? 'بحث باسم العميل أو رقم الهاتف...' : 'Search by name or phone...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
      </Card>

      {/* List */}
      <Card>
        {loading ? (
          <LoadingSpinner label={isArabic ? 'جاري تحميل العملاء...' : 'Fetching customers...'} />
        ) : filteredCustomers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-surface-50 text-surface-600 font-semibold border-b border-surface-200">
                <tr>
                  <th className="px-4 py-3">{isArabic ? 'اسم العميل / الجهة' : 'Customer Name'}</th>
                  <th className="px-4 py-3">{isArabic ? 'الهاتف' : 'Phone'}</th>
                  <th className="px-4 py-3">{isArabic ? 'البريد الإلكتروني' : 'Email'}</th>
                  <th className="px-4 py-3">{isArabic ? 'العنوان' : 'Address'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {filteredCustomers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-surface-50/80 transition-colors">
                    <td className="px-4 py-3 font-semibold text-surface-900">{cust.name}</td>
                    <td className="px-4 py-3 text-surface-600">
                      {cust.phone ? (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-surface-400" />
                          <span>{cust.phone}</span>
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-surface-600">
                      {cust.email ? (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-surface-400" />
                          <span>{cust.email}</span>
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-surface-600">
                      {cust.address ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-surface-400" />
                          <span>{cust.address}</span>
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-surface-500 space-y-3">
            <Users className="w-10 h-10 text-surface-300 mx-auto" />
            <p className="text-sm font-medium">
              {isArabic ? 'لا يوجد عملاء مسجلين في السحابة حتى الآن' : 'No customers found in database'}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};
