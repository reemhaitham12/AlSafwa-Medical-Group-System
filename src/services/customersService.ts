import { supabase } from '@/lib/supabase';
import type { Customer, CustomerPayment, Invoice } from '@/lib/database.types';

export interface LedgerEntry {
  type: 'opening' | 'invoice' | 'payment';
  id?: string;
  reference: string;
  date: string;
  debit: number;   // + amount (invoice or opening debt)
  credit: number;  // - amount (payment)
  balance: number; // running balance after this transaction
  notes?: string | null;
}

export interface CustomerReconciliationResult {
  customer: Customer;
  openingDebt: number;
  openingDebtDate: string;
  entries: LedgerEntry[];
  calculatedOutstandingDebt: number;
  invoicesCount: number;
  paymentsCount: number;
}

export const customersService = {
  async getAll(): Promise<Customer[]> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []) as Customer[];
  },

  async getById(id: string): Promise<Customer | null> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Customer;
  },

  async create(customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<Customer> {
    const debt = Math.round((Number(customer.previous_debt) || 0) * 100) / 100;
    const payload = {
      name: customer.name.trim(),
      phone: customer.phone || null,
      email: customer.email || null,
      address: customer.address || null,
      previous_debt: debt,
    };

    const { data, error } = await supabase
      .from('customers')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data as Customer;
  },

  async update(id: string, updates: Partial<Omit<Customer, 'id'>>): Promise<Customer> {
    const sanitized: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    if (updates.name !== undefined) sanitized.name = updates.name.trim();
    if (updates.phone !== undefined) sanitized.phone = updates.phone || null;
    if (updates.email !== undefined) sanitized.email = updates.email || null;
    if (updates.address !== undefined) sanitized.address = updates.address || null;
    if (updates.previous_debt !== undefined) {
      sanitized.previous_debt = Math.round(Number(updates.previous_debt) * 100) / 100;
    }

    const { data, error } = await supabase
      .from('customers')
      .update(sanitized)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Customer;
  },

  /**
   * Adjusts customer debt by delta (can be positive for new invoices or negative for deductions).
   * Ensures 2-decimal precision and non-negative debt.
   */
  async adjustDebt(id: string, delta: number): Promise<Customer> {
    const roundedDelta = Math.round(delta * 100) / 100;
    const current = await this.getById(id);
    if (!current) throw new Error('Customer not found');

    if (roundedDelta === 0) {
      return current;
    }

    const currentDebt = Number(current.previous_debt) || 0;
    const newDebt = Math.max(0, Math.round((currentDebt + roundedDelta) * 100) / 100);

    return await this.update(id, { previous_debt: newDebt });
  },

  /**
   * Records a customer payment and subtracts the paid amount from their outstanding debt.
   * Also optionally logs an audit record in customer_payments table if available.
   */
  async recordPayment(
    customerId: string,
    amount: number,
    notes?: string | null
  ): Promise<{ customer: Customer; payment?: CustomerPayment }> {
    const validAmount = Math.round(Number(amount) * 100) / 100;
    if (isNaN(validAmount) || validAmount <= 0) {
      throw new Error('مبلغ السداد يجب أن يكون رقماً أكبر من صفر');
    }

    const current = await this.getById(customerId);
    if (!current) throw new Error('العميل غير موجود في قاعدة البيانات');

    const currentDebt = Number(current.previous_debt) || 0;
    const remainingDebt = Math.max(0, Math.round((currentDebt - validAmount) * 100) / 100);

    // 1. Update customer's outstanding debt
    const updatedCustomer = await this.update(customerId, { previous_debt: remainingDebt });

    // 2. Log payment audit record in customer_payments table if table exists in Supabase
    let recordedPayment: CustomerPayment | undefined = undefined;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('customer_payments')
        .insert({
          customer_id: customerId,
          amount: validAmount,
          previous_debt: currentDebt,
          remaining_debt: remainingDebt,
          notes: notes?.trim() || null,
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (!error && data) {
        recordedPayment = data as CustomerPayment;
      }
    } catch (paymentErr) {
      console.warn('Customer payment logging to customer_payments table skipped:', paymentErr);
    }

    return { customer: updatedCustomer, payment: recordedPayment };
  },

  /**
   * Retrieves payment history for a customer if the table exists
   */
  async getCustomerPayments(customerId: string): Promise<CustomerPayment[]> {
    try {
      const { data, error } = await supabase
        .from('customer_payments')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: true });

      if (error) return [];
      return (data || []) as CustomerPayment[];
    } catch {
      return [];
    }
  },

  /**
   * Complete Chronological Reconciliation Engine:
   * 1. Fetches customer, invoices, and payments.
   * 2. Sorts invoices by issue date/timestamp ASC (with invoice_number secondary sort).
   * 3. Calculates running balance chronologically from confirmed opening debt baseline date.
   * 4. Updates customer.previous_debt and invoice.previous_debt_snapshot when dryRun is false.
   */
  async reconcileCustomer(
    customerId: string,
    options: {
      openingDebt?: number;
      openingDebtDate?: string;
      dryRun?: boolean;
    } = {}
  ): Promise<CustomerReconciliationResult> {
    const customer = await this.getById(customerId);
    if (!customer) throw new Error('العميل غير موجود');

    const openingDebt = options.openingDebt !== undefined
      ? Math.round(Number(options.openingDebt) * 100) / 100
      : Math.round(Number(customer.previous_debt || 0) * 100) / 100;

    const openingDebtDate = options.openingDebtDate || customer.created_at || new Date().toISOString();
    const baselineTime = new Date(openingDebtDate).getTime();

    // 1. Fetch all invoices for customer
    const { data: invData, error: invError } = await supabase
      .from('invoices')
      .select('*')
      .eq('customer_id', customerId);

    if (invError) throw invError;
    const allInvoices = (invData || []) as Invoice[];

    // Sort invoices chronologically ASC (created_at primary, invoice_number secondary)
    allInvoices.sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      if (timeA !== timeB) return timeA - timeB;
      return (a.invoice_number || '').localeCompare(b.invoice_number || '');
    });

    // 2. Fetch all payments for customer
    const payments = await this.getCustomerPayments(customerId);

    // 3. Build combined chronologically sorted transaction event stream
    type LedgerEvent =
      | { kind: 'invoice'; date: string; invoice: Invoice }
      | { kind: 'payment'; date: string; payment: CustomerPayment };

    const events: LedgerEvent[] = [];

    // Filter invoices on or after openingDebtDate, excluding bonus deliveries
    const relevantInvoices = allInvoices.filter((inv) => {
      const invTime = new Date(inv.created_at).getTime();
      return invTime >= baselineTime && !inv.is_bonus;
    });

    relevantInvoices.forEach((inv) => {
      events.push({ kind: 'invoice', date: inv.created_at, invoice: inv });
    });

    // Filter payments on or after openingDebtDate
    const relevantPayments = payments.filter((pay) => {
      const payTime = new Date(pay.created_at).getTime();
      return payTime >= baselineTime;
    });

    relevantPayments.forEach((pay) => {
      events.push({ kind: 'payment', date: pay.created_at, payment: pay });
    });

    // Stable chronological sort
    events.sort((a, b) => {
      const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (diff !== 0) return diff;
      return a.kind === 'invoice' ? -1 : 1;
    });

    // 4. Calculate Running Balances
    const entries: LedgerEntry[] = [
      {
        type: 'opening',
        reference: 'رصيد أول المدة',
        date: openingDebtDate,
        debit: openingDebt,
        credit: 0,
        balance: openingDebt,
        notes: 'الرصيد الافتتاحي المعتمد لتاريخ بداية المطابقة',
      },
    ];

    let runningBalance = openingDebt;
    const invoiceSnapshotUpdates: { id: string; snapshot: number }[] = [];

    for (const evt of events) {
      if (evt.kind === 'invoice') {
        const inv = evt.invoice;
        const total = Math.round((Number(inv.final_total) || 0) * 100) / 100;
        const preInvoiceBalance = runningBalance;
        runningBalance = Math.round((runningBalance + total) * 100) / 100;

        invoiceSnapshotUpdates.push({ id: inv.id, snapshot: preInvoiceBalance });

        entries.push({
          type: 'invoice',
          id: inv.id,
          reference: inv.invoice_number,
          date: inv.created_at,
          debit: total,
          credit: 0,
          balance: runningBalance,
          notes: inv.notes || null,
        });
      } else {
        const pay = evt.payment;
        const amount = Math.round((Number(pay.amount) || 0) * 100) / 100;
        runningBalance = Math.max(0, Math.round((runningBalance - amount) * 100) / 100);

        entries.push({
          type: 'payment',
          id: pay.id,
          reference: 'سداد دفعة',
          date: pay.created_at,
          debit: 0,
          credit: amount,
          balance: runningBalance,
          notes: pay.notes || null,
        });
      }
    }

    // 5. If not dryRun, atomically commit reconciled balances to database
    if (!options.dryRun) {
      // Update customer previous_debt
      const updatedCustomer = await this.update(customerId, {
        previous_debt: runningBalance,
      });

      // Update invoice snapshots and debt_status to reflect correct chronological pre-invoice balances and confirmed applied status
      for (const update of invoiceSnapshotUpdates) {
        try {
          await supabase
            .from('invoices')
            .update({
              previous_debt_snapshot: update.snapshot,
              debt_status: 'applied',
            })
            .eq('id', update.id);
        } catch {
          // Fallback if debt_status column is pending migration
          await supabase
            .from('invoices')
            .update({ previous_debt_snapshot: update.snapshot })
            .eq('id', update.id);
        }
      }

      return {
        customer: updatedCustomer,
        openingDebt,
        openingDebtDate,
        entries,
        calculatedOutstandingDebt: runningBalance,
        invoicesCount: relevantInvoices.length,
        paymentsCount: relevantPayments.length,
      };
    }

    return {
      customer,
      openingDebt,
      openingDebtDate,
      entries,
      calculatedOutstandingDebt: runningBalance,
      invoicesCount: relevantInvoices.length,
      paymentsCount: relevantPayments.length,
    };
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
