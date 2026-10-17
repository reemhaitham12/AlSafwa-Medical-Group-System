import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Badge } from '@/components/common/Badge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { productsService } from '@/services/productsService';
import {
  productDemandService,
  type ProductDemandReportItem,
} from '@/services/productDemandService';
import { ProductDemandReportModal } from '@/components/products/ProductDemandReportModal';
import type { Product } from '@/lib/database.types';
import { formatCurrency } from '@/utils/formatters';
import {
  Package,
  Plus,
  Search,
  Boxes,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';

export const Products: React.FC = () => {
  const { isArabic } = useLanguage();
  const { user, isConfigured, isViewer } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [reportItems, setReportItems] = useState<ProductDemandReportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const fetchProductsAndReport = async () => {
    if (!isConfigured || !user) return;
    setLoading(true);
    try {
      const [prodsData, reportData] = await Promise.all([
        productsService.getAll(),
        productDemandService.getAllProductsDemandReportData(),
      ]);
      setProducts(prodsData);
      setReportItems(reportData);
    } catch (err) {
      console.error('Failed to load products or report data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConfigured && user) {
      fetchProductsAndReport();
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
            {isArabic
              ? 'اضغط على أي صنف لعرض تفاصيل الطلبات وتوزيع المخزون وحساب العجز والفائض'
              : 'Click any product to view customer demand, stock distribution, and shortage calculation'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsReportModalOpen(true)}
            icon={<Boxes className="w-4 h-4" />}
          >
            {isArabic ? 'تقرير توزيع وطلب الأصناف (A4)' : 'Demand & Distribution Report (A4)'}
          </Button>

          {!isViewer && (
            <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />}>
              {isArabic ? 'إضافة منتج جديد' : 'Add Product'}
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={fetchProductsAndReport}
            icon={<RefreshCw className="w-4 h-4" />}
            title={isArabic ? 'تحديث' : 'Refresh'}
          />
        </div>
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
          <LoadingSpinner label={isArabic ? 'جاري تحميل المنتجات والطلبيات...' : 'Fetching products...'} />
        ) : filteredProducts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-surface-50 text-surface-600 font-semibold border-b border-surface-200">
                <tr>
                  <th className="px-4 py-3">{isArabic ? 'كود الصنف' : 'Product Code'}</th>
                  <th className="px-4 py-3">{isArabic ? 'اسم المنتج (اضغط للتفاصيل)' : 'Product Name (Click for Details)'}</th>
                  <th className="px-4 py-3">{isArabic ? 'التصنيف' : 'Category'}</th>
                  <th className="px-4 py-3 text-right">{isArabic ? 'السعر (EGP)' : 'Price (EGP)'}</th>
                  {!isViewer && (
                    <th className="px-4 py-3 text-center">{isArabic ? 'حالة الطلب' : 'Demand Action'}</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {filteredProducts.map((prod) => {
                  const reportItem = reportItems.find((r) => r.productId === prod.id);
                  const hasDemand = reportItem && reportItem.totalRequested > 0;

                  return (
                    <tr key={prod.id} className="hover:bg-surface-50/80 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-brand-600">
                        {prod.product_code || '-'}
                      </td>
                      <td className="px-4 py-3 font-medium text-surface-900">
                        {!isViewer ? (
                          <Link
                            to={`/products/${prod.id}`}
                            className="group inline-flex items-center gap-1.5 font-bold text-brand-700 hover:text-brand-900 hover:underline transition-colors"
                            title={isArabic ? 'اضغط لعرض تفاصيل الطلب وتوزيع المخزون' : 'Click to view demand and stock distribution'}
                          >
                            <span>{prod.name}</span>
                            <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                          </Link>
                        ) : (
                          <span>{prod.name}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="neutral">{prod.category || 'General'}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-surface-900">
                        {formatCurrency(prod.price, isArabic)}
                      </td>
                      {!isViewer && (
                        <td className="px-4 py-3 text-center">
                          <Link
                            to={`/products/${prod.id}`}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all border ${
                              hasDemand
                                ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                                : 'bg-surface-50 text-surface-600 border-surface-200 hover:bg-surface-100'
                            }`}
                          >
                            <span>{hasDemand ? `مطلوب (${reportItem.totalRequested})` : 'تفاصيل الطلب'}</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </Link>
                        </td>
                      )}
                    </tr>
                  );
                })}
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

      {/* Product Demand Distribution Report Modal */}
      <ProductDemandReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        reportItems={reportItems}
      />
    </div>
  );
};
