import { productsService } from '@/services/productsService';
import { invoicesService } from '@/services/invoicesService';
import { inventoryService } from '@/services/inventoryService';
import type { Product, InventoryStock, InventoryIncoming } from '@/lib/database.types';

export interface CustomerDemandItem {
  invoiceId: string;
  invoiceItemId: string;
  invoiceNumber: string;
  invoiceDate: string;
  customerId: string | null;
  customerName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isBonus: boolean;
}

export interface CustomerDemandSummary {
  customerName: string;
  customerId: string | null;
  totalQuantity: number;
  invoiceCount: number;
  invoices: {
    invoiceNumber: string;
    invoiceDate: string;
    quantity: number;
    isBonus: boolean;
  }[];
}

export interface ProductDemandDetailsData {
  product: Product;
  totalRequested: number;
  currentStock: number;
  incoming: number;
  netShortage: number; // Total Requested - Current Stock - Incoming
  status: 'shortage' | 'surplus' | 'covered';
  customerItems: CustomerDemandItem[];
  customerSummaries: CustomerDemandSummary[];
  stockBatches: InventoryStock[];
  incomingBatches: InventoryIncoming[];
}

export interface ProductDemandReportItem {
  productId: string;
  productName: string;
  productCode: string | null;
  itemNumber: number | null;
  category: string | null;
  price: number;
  totalRequested: number;
  currentStock: number;
  incoming: number;
  netShortage: number; // Total Requested - Current Stock - Incoming
  status: 'shortage' | 'surplus' | 'covered';
  customerRows: {
    customerName: string;
    invoiceNumber: string;
    quantity: number;
    isBonus: boolean;
  }[];
}

/**
 * Normalizes text for reliable matching between catalog names and invoice/batch snapshots
 */
function normalizeName(name: string | null | undefined): string {
  if (!name) return '';
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Determines whether an invoice item or inventory batch matches a given product.
 * Matches first by product_id UUID, then falls back to normalized product name snapshot.
 */
export function matchesProduct(
  entityProductId: string | null | undefined,
  snapshotName: string | null | undefined,
  targetProduct: Product
): boolean {
  if (entityProductId && targetProduct.id && entityProductId === targetProduct.id) {
    return true;
  }
  if (!snapshotName || !targetProduct.name) {
    return false;
  }
  return normalizeName(snapshotName) === normalizeName(targetProduct.name);
}

export const productDemandService = {
  /**
   * Fetches full demand and stock details for a single product by ID.
   */
  async getProductDemandDetails(productId: string): Promise<ProductDemandDetailsData> {
    const [allProducts, allInvoices, allStock, allIncoming] = await Promise.all([
      productsService.getAll(),
      invoicesService.getAll(),
      inventoryService.getAllStock(),
      inventoryService.getAllIncoming(),
    ]);

    const product = allProducts.find((p) => p.id === productId);
    if (!product) {
      throw new Error('المنتج المطلوب غير موجود في قاعدة البيانات');
    }

    // 1. Find matching invoice items across all invoices (retaining invoice details)
    const customerItems: CustomerDemandItem[] = [];
    allInvoices.forEach((invoice) => {
      if (invoice.items && Array.isArray(invoice.items)) {
        invoice.items.forEach((item) => {
          if (matchesProduct(item.product_id, item.product_name_snapshot, product)) {
            const customerName =
              invoice.customer?.name?.trim() ||
              invoice.customer_name_snapshot?.trim() ||
              'عميل نقدي';

            customerItems.push({
              invoiceId: invoice.id,
              invoiceItemId: item.id,
              invoiceNumber: invoice.invoice_number,
              invoiceDate: invoice.created_at,
              customerId: invoice.customer_id || null,
              customerName,
              quantity: Number(item.quantity) || 0,
              unitPrice: Number(item.unit_price) || 0,
              totalPrice: Number(item.total) || 0,
              isBonus: Boolean(invoice.is_bonus),
            });
          }
        });
      }
    });

    // Sort customer items by invoice date descending (most recent first)
    customerItems.sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());

    // 2. Aggregate customer summaries so manager can instantly see each customer's total demand
    const customerMap = new Map<string, CustomerDemandSummary>();
    customerItems.forEach((ci) => {
      const key = ci.customerName.trim().toLowerCase();
      if (!customerMap.has(key)) {
        customerMap.set(key, {
          customerName: ci.customerName,
          customerId: ci.customerId,
          totalQuantity: 0,
          invoiceCount: 0,
          invoices: [],
        });
      }
      const entry = customerMap.get(key)!;
      entry.totalQuantity += ci.quantity;
      entry.invoiceCount += 1;
      entry.invoices.push({
        invoiceNumber: ci.invoiceNumber,
        invoiceDate: ci.invoiceDate,
        quantity: ci.quantity,
        isBonus: ci.isBonus,
      });
    });

    const customerSummaries = Array.from(customerMap.values()).sort(
      (a, b) => b.totalQuantity - a.totalQuantity
    );

    // 3. Find matching inventory stock batches
    const matchingStock = allStock.filter((b) =>
      matchesProduct(b.product_id, b.product_name_snapshot, product)
    );

    // 4. Find matching incoming batches
    const matchingIncoming = allIncoming.filter((b) =>
      matchesProduct(b.product_id, b.product_name_snapshot, product)
    );

    // 5. Compute core calculations
    // Total Requested = sum of quantities requested for this product across relevant invoices
    const totalRequested = customerItems.reduce((sum, item) => sum + item.quantity, 0);

    // Current Stock = sum of product's current stock batches
    const currentStock = matchingStock.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);

    // Incoming = sum of its incoming stock quantities
    const incoming = matchingIncoming.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);

    // Net Shortage = Total Requested - Current Stock - Incoming
    // Note: Never silently replaced by zero! Negative means surplus.
    const netShortage = totalRequested - currentStock - incoming;

    const status: 'shortage' | 'surplus' | 'covered' =
      netShortage > 0 ? 'shortage' : netShortage < 0 ? 'surplus' : 'covered';

    return {
      product,
      totalRequested,
      currentStock,
      incoming,
      netShortage,
      status,
      customerItems,
      customerSummaries,
      stockBatches: matchingStock,
      incomingBatches: matchingIncoming,
    };
  },

  /**
   * Fetches demand and stock calculations across all products for the complete report.
   */
  async getAllProductsDemandReportData(): Promise<ProductDemandReportItem[]> {
    const [allProducts, allInvoices, allStock, allIncoming] = await Promise.all([
      productsService.getAll(),
      invoicesService.getAll(),
      inventoryService.getAllStock(),
      inventoryService.getAllIncoming(),
    ]);

    // Pre-group invoice items by product
    const itemsByProduct = new Map<string, {
      customerName: string;
      invoiceNumber: string;
      quantity: number;
      isBonus: boolean;
      created_at: string;
    }[]>();

    allProducts.forEach((p) => {
      itemsByProduct.set(p.id, []);
    });

    allInvoices.forEach((inv) => {
      if (inv.items && Array.isArray(inv.items)) {
        inv.items.forEach((item) => {
          const matchedProd = allProducts.find((p) =>
            matchesProduct(item.product_id, item.product_name_snapshot, p)
          );
          if (matchedProd) {
            const list = itemsByProduct.get(matchedProd.id) || [];
            const customerName =
              inv.customer?.name?.trim() ||
              inv.customer_name_snapshot?.trim() ||
              'عميل نقدي';

            list.push({
              customerName,
              invoiceNumber: inv.invoice_number,
              quantity: Number(item.quantity) || 0,
              isBonus: Boolean(inv.is_bonus),
              created_at: inv.created_at,
            });
            itemsByProduct.set(matchedProd.id, list);
          }
        });
      }
    });

    // Pre-group stock and incoming
    const stockByProduct = new Map<string, number>();
    allStock.forEach((b) => {
      const matchedProd = allProducts.find((p) =>
        matchesProduct(b.product_id, b.product_name_snapshot, p)
      );
      if (matchedProd) {
        stockByProduct.set(
          matchedProd.id,
          (stockByProduct.get(matchedProd.id) || 0) + (Number(b.quantity) || 0)
        );
      }
    });

    const incomingByProduct = new Map<string, number>();
    allIncoming.forEach((b) => {
      const matchedProd = allProducts.find((p) =>
        matchesProduct(b.product_id, b.product_name_snapshot, p)
      );
      if (matchedProd) {
        incomingByProduct.set(
          matchedProd.id,
          (incomingByProduct.get(matchedProd.id) || 0) + (Number(b.quantity) || 0)
        );
      }
    });

    // Build the report items
    const reportItems: ProductDemandReportItem[] = allProducts.map((p) => {
      const customerRows = (itemsByProduct.get(p.id) || []).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      const totalRequested = customerRows.reduce((sum, r) => sum + r.quantity, 0);
      const currentStock = stockByProduct.get(p.id) || 0;
      const incoming = incomingByProduct.get(p.id) || 0;
      const netShortage = totalRequested - currentStock - incoming;
      const status: 'shortage' | 'surplus' | 'covered' =
        netShortage > 0 ? 'shortage' : netShortage < 0 ? 'surplus' : 'covered';

      return {
        productId: p.id,
        productName: p.name,
        productCode: p.product_code || null,
        itemNumber: p.item_number ?? null,
        category: p.category || null,
        price: p.price,
        totalRequested,
        currentStock,
        incoming,
        netShortage,
        status,
        customerRows,
      };
    });

    return reportItems;
  },
};
