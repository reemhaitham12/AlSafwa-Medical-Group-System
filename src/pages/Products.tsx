import React, { useEffect, useState } from 'react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Badge } from '@/components/common/Badge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { productsService } from '@/services/productsService';
import type { Product } from '@/lib/database.types';
import { formatCurrency } from '@/utils/formatters';
import { Package, Plus, Search } from 'lucide-react';

export const Products: React.FC = () => {
  const { isArabic } = useLanguage();
  const { user, isConfigured } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchProducts = async () => {
    if (!isConfigured || !user) return;
    setLoading(true);
    try {
      const data = await productsService.getAll();
      setProducts(data);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConfigured && user) {
      fetchProducts();
    }
  }, [user, isConfigured]);

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.product_code && p.product_code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-surface-900">
            {isArabic ? 'كتالوج المنتجات والمستلزمات' : 'Products & Medical Supplies Catalog'}
          </h1>
          <p className="text-xs text-surface-500 mt-0.5">
            {isArabic ? 'قائمة المنتجات وأكوادها والأسعار المخزنة في السحابة' : 'Cloud database registry of products and prices'}
          </p>
        </div>

        <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />}>
          {isArabic ? 'إضافة منتج جديد' : 'Add Product'}
        </Button>
      </div>

      {/* Filter */}
      <Card className="p-4">
        <div className="max-w-md">
          <Input
            placeholder={isArabic ? 'بحث باسم المنتج أو كود الصنف...' : 'Search by name or product code...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
      </Card>

      {/* List */}
      <Card>
        {loading ? (
          <LoadingSpinner label={isArabic ? 'جاري تحميل المنتجات...' : 'Fetching products...'} />
        ) : filteredProducts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-surface-50 text-surface-600 font-semibold border-b border-surface-200">
                <tr>
                  <th className="px-4 py-3">{isArabic ? 'كود الصنف (اختياري)' : 'Product Code (Optional)'}</th>
                  <th className="px-4 py-3">{isArabic ? 'اسم المنتج' : 'Product Name'}</th>
                  <th className="px-4 py-3">{isArabic ? 'التصنيف' : 'Category'}</th>
                  <th className="px-4 py-3 text-right">{isArabic ? 'السعر (EGP)' : 'Price (EGP)'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {filteredProducts.map((prod) => (
                  <tr key={prod.id} className="hover:bg-surface-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-brand-600">
                      {prod.product_code || '-'}
                    </td>
                    <td className="px-4 py-3 font-medium text-surface-900">{prod.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant="neutral">{prod.category || 'General'}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-surface-900">
                      {formatCurrency(prod.price, isArabic)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-surface-500 space-y-3">
            <Package className="w-10 h-10 text-surface-300 mx-auto" />
            <p className="text-sm font-medium">
              {isArabic ? 'لا توجد منتجات مسجلة في السحابة حتى الآن' : 'No products found in database'}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};
