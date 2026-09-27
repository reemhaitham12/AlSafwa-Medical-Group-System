import { supabase } from '@/lib/supabase';
import type { Invoice, InvoiceItem } from '@/lib/database.types';

export interface CreateInvoicePayload {
  customer_id?: string | null;
  customer_name_snapshot: string;
  subtotal: number;
  discount_percentage: number;
  discount_amount: number;
  final_total: number;
  notes?: string | null;
  is_bonus?: boolean;
  created_by?: string | null;
  items: {
    product_id: string | null;
    product_name_snapshot: string;
    quantity: number;
    unit_price: number;
    total: number;
  }[];
}

export interface UpdateInvoicePayload {
  customer_id?: string | null;
  customer_name_snapshot: string;
  subtotal: number;
  discount_percentage: number;
  discount_amount: number;
  final_total: number;
  notes?: string | null;
  is_bonus?: boolean;
  items: {
    product_id: string | null;
    product_name_snapshot: string;
    quantity: number;
    unit_price: number;
    total: number;
  }[];
}

export const invoicesService = {
  async getAll(): Promise<Invoice[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select('*, items:invoice_items(*), customer:customers(*)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as Invoice[];
  },

  async getInvoicesByDateRange(startDateIso?: string, endDateIso?: string): Promise<Invoice[]> {
    let query = supabase
      .from('invoices')
      .select('*, items:invoice_items(*), customer:customers(*)');

    if (startDateIso) {
      query = query.gte('created_at', startDateIso);
    }
    if (endDateIso) {
      query = query.lte('created_at', endDateIso);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as Invoice[];
  },

  async getById(id: string): Promise<Invoice | null> {
    const { data, error } = await supabase
      .from('invoices')
      .select('*, items:invoice_items(*), customer:customers(*)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Invoice;
  },

  async getNextInvoiceNumber(): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('invoice_number')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error || !data || data.length === 0) {
        return 'INV-000001';
      }

      const lastNum = data[0].invoice_number;
      const match = lastNum.match(/INV-(\d+)/);
      if (match) {
        const nextInt = parseInt(match[1], 10) + 1;
        return `INV-${String(nextInt).padStart(6, '0')}`;
      }
      return 'INV-000001';
    } catch {
      return 'INV-000001';
    }
  },

  async create(payload: CreateInvoicePayload): Promise<Invoice> {
    const { items, ...invoiceData } = payload;

    // 1. Get current authenticated user id
    const { data: { user } } = await supabase.auth.getUser();

    // 2. Insert invoice header
    const { data: newInvoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        ...invoiceData,
        notes: invoiceData.notes?.trim() || null,
        is_bonus: Boolean(invoiceData.is_bonus),
        created_by: user?.id || invoiceData.created_by || null,
      })
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    // 3. Insert snapshot items into invoice_items
    if (items && items.length > 0) {
      const itemsToInsert = items.map((item) => ({
        invoice_id: newInvoice.id,
        product_id: item.product_id,
        product_name_snapshot: item.product_name_snapshot,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;
    }

    return (await this.getById(newInvoice.id)) as Invoice;
  },

  async update(id: string, payload: UpdateInvoicePayload): Promise<Invoice> {
    const { items, ...invoiceData } = payload;

    const updateHeaderPayload: Record<string, any> = {
      customer_id: invoiceData.customer_id ?? null,
      customer_name_snapshot: invoiceData.customer_name_snapshot,
      subtotal: Number(invoiceData.subtotal) || 0,
      discount_percentage: Number(invoiceData.discount_percentage) || 0,
      discount_amount: Number(invoiceData.discount_amount) || 0,
      final_total: Number(invoiceData.final_total) || 0,
      updated_at: new Date().toISOString(),
    };

    if (invoiceData.notes !== undefined) {
      updateHeaderPayload.notes = invoiceData.notes?.trim() || null;
    }
    if (invoiceData.is_bonus !== undefined) {
      updateHeaderPayload.is_bonus = Boolean(invoiceData.is_bonus);
    }

    // 1. Update invoice header with explicit verification
    const { data: updatedHeaderData, error: headerError } = await supabase
      .from('invoices')
      .update(updateHeaderPayload)
      .eq('id', id)
      .select();

    if (headerError) {
      console.error('Supabase header update error:', headerError);
      throw headerError;
    }

    if (!updatedHeaderData || updatedHeaderData.length === 0) {
      throw new Error('فشل تحديث الفاتورة: لم يتم العثور على الفاتورة في قاعدة البيانات');
    }

    // 2. Delete existing items for this invoice
    const { error: deleteItemsError } = await supabase
      .from('invoice_items')
      .delete()
      .eq('invoice_id', id);

    if (deleteItemsError) {
      console.error('Supabase delete items error:', deleteItemsError);
      throw new Error(`فشل تحديث أصناف الفاتورة: ${deleteItemsError.message}`);
    }

    // 3. Insert updated snapshot items
    if (items && items.length > 0) {
      const itemsToInsert = items.map((item) => ({
        invoice_id: id,
        product_id: item.product_id || null,
        product_name_snapshot: item.product_name_snapshot,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        total: Number(item.total),
      }));

      const { error: insertItemsError } = await supabase
        .from('invoice_items')
        .insert(itemsToInsert);

      if (insertItemsError) {
        console.error('Supabase insert items error:', insertItemsError);
        throw new Error(`فشل حفظ أصناف الفاتورة: ${insertItemsError.message}`);
      }
    }

    const updatedInvoice = await this.getById(id);
    if (!updatedInvoice) {
      throw new Error('فشل تحميل بيانات الفاتورة المحدثة');
    }

    return updatedInvoice;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async deleteAll(): Promise<void> {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) throw error;
  }
};
