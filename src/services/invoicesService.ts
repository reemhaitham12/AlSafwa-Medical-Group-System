import { supabase } from '@/lib/supabase';
import type { Invoice, InvoiceDebtStatus } from '@/lib/database.types';
import { customersService } from '@/services/customersService';

export interface CreateInvoicePayload {
  customer_id?: string | null;
  customer_name_snapshot: string;
  subtotal: number;
  discount_percentage: number;
  discount_amount: number;
  final_total: number;
  /** Snapshot of the customer's previous_debt at creation time. Defaults to 0. */
  previous_debt_snapshot?: number;
  debt_status?: InvoiceDebtStatus;
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
  /** Snapshot of the customer's previous_debt at edit time. Defaults to 0. */
  previous_debt_snapshot?: number;
  debt_status?: InvoiceDebtStatus;
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

    // 2. Determine previous_debt_snapshot:
    // If customer_id is provided, retrieve the latest live outstanding debt from the database
    let previousDebtSnapshot = Number(invoiceData.previous_debt_snapshot) || 0;
    if (invoiceData.customer_id) {
      try {
        const cust = await customersService.getById(invoiceData.customer_id);
        if (cust) {
          previousDebtSnapshot = Math.round((Number(cust.previous_debt) || 0) * 100) / 100;
        }
      } catch (cErr) {
        console.error('Error fetching latest customer debt for snapshot:', cErr);
      }
    }

    // 3. Insert invoice header
    const { data: newInvoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        ...invoiceData,
        notes: invoiceData.notes?.trim() || null,
        is_bonus: Boolean(invoiceData.is_bonus),
        previous_debt_snapshot: previousDebtSnapshot,
        created_by: user?.id || invoiceData.created_by || null,
      })
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    // 4. Insert snapshot items into invoice_items
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

    // 5. Automatically add order final amount (after discount) to customer's outstanding debt
    let debtStatus: InvoiceDebtStatus = 'unreconciled';
    if (invoiceData.customer_id && !invoiceData.is_bonus) {
      const finalTotal = Math.round((Number(invoiceData.final_total) || 0) * 100) / 100;
      if (finalTotal > 0) {
        try {
          await customersService.adjustDebt(invoiceData.customer_id, finalTotal);
          debtStatus = 'applied';
        } catch (debtErr) {
          console.error('Failed to automatically increment customer debt:', debtErr);
          debtStatus = 'failed';
        }
      } else {
        debtStatus = 'applied';
      }
    } else if (invoiceData.is_bonus || !invoiceData.customer_id) {
      // Bonus or walk-in cash without a customer: debt effect is 0, successfully accounted for
      debtStatus = 'applied';
    }

    // Persist debt_status safely to database
    try {
      await supabase
        .from('invoices')
        .update({ debt_status: debtStatus })
        .eq('id', newInvoice.id);
    } catch (statusPersistErr) {
      console.warn('Could not persist debt_status (migration may be pending):', statusPersistErr);
    }

    return (await this.getById(newInvoice.id)) as Invoice;
  },

  async update(id: string, payload: UpdateInvoicePayload): Promise<Invoice> {
    const { items, ...invoiceData } = payload;

    // Fetch the existing invoice first to calculate the delta
    const oldInvoice = await this.getById(id);
    if (!oldInvoice) {
      throw new Error('لم يتم العثور على الفاتورة المراد تعديلها');
    }

    const oldCustomerId = oldInvoice.customer_id;
    const oldDebtContribution = oldInvoice.is_bonus
      ? 0
      : Math.round((Number(oldInvoice.final_total) || 0) * 100) / 100;

    const newCustomerId = invoiceData.customer_id ?? null;
    const newDebtContribution = invoiceData.is_bonus
      ? 0
      : Math.round((Number(invoiceData.final_total) || 0) * 100) / 100;

    const updateHeaderPayload: Record<string, any> = {
      customer_id: newCustomerId,
      customer_name_snapshot: invoiceData.customer_name_snapshot,
      subtotal: Number(invoiceData.subtotal) || 0,
      discount_percentage: Number(invoiceData.discount_percentage) || 0,
      discount_amount: Number(invoiceData.discount_amount) || 0,
      final_total: Number(invoiceData.final_total) || 0,
      updated_at: new Date().toISOString(),
    };

    // If customer changed, refresh previous_debt_snapshot for new customer
    if (oldCustomerId !== newCustomerId && newCustomerId) {
      try {
        const newCust = await customersService.getById(newCustomerId);
        updateHeaderPayload.previous_debt_snapshot = newCust
          ? Math.round((Number(newCust.previous_debt) || 0) * 100) / 100
          : 0;
      } catch {
        updateHeaderPayload.previous_debt_snapshot = Number(invoiceData.previous_debt_snapshot) || 0;
      }
    } else if (invoiceData.previous_debt_snapshot !== undefined) {
      updateHeaderPayload.previous_debt_snapshot = Number(invoiceData.previous_debt_snapshot) || 0;
    }

    if (invoiceData.notes !== undefined) {
      updateHeaderPayload.notes = invoiceData.notes?.trim() || null;
    }
    if (invoiceData.is_bonus !== undefined) {
      updateHeaderPayload.is_bonus = Boolean(invoiceData.is_bonus);
    }

    // 1. Update invoice header
    const { data: updatedHeaderData, error: headerError } = await supabase
      .from('invoices')
      .update(updateHeaderPayload)
      .eq('id', id)
      .select();

    if (headerError) throw headerError;
    if (!updatedHeaderData || updatedHeaderData.length === 0) {
      throw new Error('فشل تحديث الفاتورة: لم يتم العثور على الفاتورة في قاعدة البيانات');
    }

    // 2. Delete existing items for this invoice
    const { error: deleteItemsError } = await supabase
      .from('invoice_items')
      .delete()
      .eq('invoice_id', id);

    if (deleteItemsError) throw deleteItemsError;

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

      if (insertItemsError) throw insertItemsError;
    }

    // 4. Update customer debt: recalculate affected balances safely and prevent duplicate debt additions
    let debtStatus: InvoiceDebtStatus = oldInvoice.debt_status || 'unreconciled';
    const wasApplied = oldInvoice.debt_status === 'applied';

    try {
      if (oldCustomerId === newCustomerId) {
        if (newCustomerId) {
          // If previously applied, apply delta only. If NOT previously applied, apply full new contribution!
          const delta = wasApplied
            ? Math.round((newDebtContribution - oldDebtContribution) * 100) / 100
            : newDebtContribution;

          if (delta !== 0) {
            await customersService.adjustDebt(newCustomerId, delta);
          }
          debtStatus = 'applied';
        } else {
          debtStatus = 'applied';
        }
      } else {
        // Customer changed: remove old contribution from old customer if it was applied, add new contribution to new customer
        if (oldCustomerId && wasApplied && oldDebtContribution > 0) {
          await customersService.adjustDebt(oldCustomerId, -oldDebtContribution);
        }
        if (newCustomerId && newDebtContribution > 0) {
          await customersService.adjustDebt(newCustomerId, newDebtContribution);
        }
        debtStatus = 'applied';
      }
    } catch (adjErr) {
      console.error('Failed to adjust customer debt on invoice edit:', adjErr);
      debtStatus = 'failed';
    }

    // Persist updated debt_status
    try {
      await supabase
        .from('invoices')
        .update({ debt_status: debtStatus })
        .eq('id', id);
    } catch (statusPersistErr) {
      console.warn('Failed to persist debt_status on invoice edit:', statusPersistErr);
    }

    const updatedInvoice = await this.getById(id);
    if (!updatedInvoice) throw new Error('فشل تحميل بيانات الفاتورة المحدثة');
    return updatedInvoice;
  },

  async delete(id: string): Promise<void> {
    // If invoice has a customer and was not bonus, subtract its total from customer debt only if it was actually applied!
    try {
      const invoice = await this.getById(id);
      if (invoice && invoice.customer_id && !invoice.is_bonus && invoice.debt_status === 'applied') {
        const contribution = Math.round((Number(invoice.final_total) || 0) * 100) / 100;
        if (contribution > 0) {
          await customersService.adjustDebt(invoice.customer_id, -contribution);
        }
      }
    } catch (delDebtErr) {
      console.error('Failed to deduct customer debt on invoice deletion:', delDebtErr);
    }

    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Manually reconciles or retries applying a single invoice's debt effect to customer debt.
   */
  async reconcileInvoiceDebt(invoiceId: string): Promise<Invoice> {
    const invoice = await this.getById(invoiceId);
    if (!invoice) throw new Error('لم يتم العثور على الفاتورة');

    if (!invoice.customer_id) {
      try {
        await supabase.from('invoices').update({ debt_status: 'applied' }).eq('id', invoiceId);
      } catch {}
      return (await this.getById(invoiceId)) as Invoice;
    }

    if (invoice.is_bonus) {
      try {
        await supabase.from('invoices').update({ debt_status: 'applied' }).eq('id', invoiceId);
      } catch {}
      return (await this.getById(invoiceId)) as Invoice;
    }

    const contribution = Math.round((Number(invoice.final_total) || 0) * 100) / 100;
    try {
      if (contribution > 0) {
        await customersService.adjustDebt(invoice.customer_id, contribution);
      }
      await supabase.from('invoices').update({ debt_status: 'applied' }).eq('id', invoiceId);
    } catch (err: any) {
      try {
        await supabase.from('invoices').update({ debt_status: 'failed' }).eq('id', invoiceId);
      } catch {}
      throw err;
    }

    return (await this.getById(invoiceId)) as Invoice;
  },

  async deleteAll(): Promise<void> {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) throw error;
  }
};
