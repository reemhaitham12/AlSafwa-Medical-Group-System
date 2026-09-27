import { supabase } from '@/lib/supabase';
import type { InventoryStock, InventoryIncoming } from '@/lib/database.types';

// ─── Payload Types ───────────────────────────────────────────
export interface InventoryStockPayload {
  product_id: string | null;
  product_name_snapshot: string;
  quantity: number;
  expiry_date: string; // YYYY-MM-DD (DATE NOT NULL in Supabase)
}

export interface InventoryIncomingPayload {
  product_id: string | null;
  product_name_snapshot: string;
  quantity: number;
  expiry_date: string; // YYYY-MM-DD (DATE NOT NULL in Supabase)
}

// ─── Helpers ──────────────────────────────────────────────────
function logSupabaseError(action: string, error: any) {
  console.error(`[inventoryService.${action}] Supabase Error:`, {
    message: error?.message,
    details: error?.details,
    hint: error?.hint,
    code: error?.code,
    raw: error,
  });
}

function sanitizeUuid(id: string | null | undefined): string | null {
  if (!id || typeof id !== 'string') return null;
  const trimmed = id.trim();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(trimmed) ? trimmed : null;
}

function formatErrorMessage(action: string, error: any): Error {
  logSupabaseError(action, error);
  const parts: string[] = [];
  if (error?.message) parts.push(error.message);
  if (error?.details) parts.push(`(${error.details})`);
  if (error?.hint) parts.push(`[${error.hint}]`);
  const fullMsg = parts.join(' ') || 'حدث خطأ في الاتصال بقاعدة البيانات';
  const customError = new Error(fullMsg);
  (customError as any).raw = error;
  (customError as any).code = error?.code;
  return customError;
}

// ─── inventory_stock CRUD ─────────────────────────────────────
export const inventoryService = {
  // ── Stock ──────────────────────────────────────────────────

  async getAllStock(): Promise<InventoryStock[]> {
    const { data, error } = await supabase
      .from('inventory_stock')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) {
      throw formatErrorMessage('getAllStock', error);
    }
    return (data || []) as InventoryStock[];
  },

  async createStock(payload: InventoryStockPayload): Promise<InventoryStock> {
    const sanitized = {
      product_id: sanitizeUuid(payload.product_id),
      product_name_snapshot: (payload.product_name_snapshot || '').trim() || 'منتج غير محدد',
      quantity: Math.max(0, Math.floor(Number(payload.quantity) || 0)),
      expiry_date: payload.expiry_date.trim(),
    };

    console.log('[inventoryService.createStock] Sending payload to public.inventory_stock:', sanitized);

    const { data, error } = await supabase
      .from('inventory_stock')
      .insert(sanitized)
      .select()
      .single();

    if (error) {
      throw formatErrorMessage('createStock', error);
    }
    return data as InventoryStock;
  },

  async updateStock(id: string, updates: Partial<InventoryStockPayload>): Promise<InventoryStock> {
    const sanitized: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.quantity !== undefined) {
      sanitized.quantity = Math.max(0, Math.floor(Number(updates.quantity) || 0));
    }
    if (updates.expiry_date !== undefined) {
      sanitized.expiry_date = updates.expiry_date.trim();
    }
    if (updates.product_name_snapshot !== undefined) {
      sanitized.product_name_snapshot = updates.product_name_snapshot.trim() || 'منتج غير محدد';
    }
    if (updates.product_id !== undefined) {
      sanitized.product_id = sanitizeUuid(updates.product_id);
    }

    console.log('[inventoryService.updateStock] Updating row id:', id, 'payload:', sanitized);

    const { data, error } = await supabase
      .from('inventory_stock')
      .update(sanitized)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw formatErrorMessage('updateStock', error);
    }
    return data as InventoryStock;
  },

  async deleteStock(id: string): Promise<void> {
    console.log('[inventoryService.deleteStock] Deleting row id:', id);
    const { error } = await supabase
      .from('inventory_stock')
      .delete()
      .eq('id', id);

    if (error) {
      throw formatErrorMessage('deleteStock', error);
    }
  },

  // ── Incoming ───────────────────────────────────────────────

  async getAllIncoming(): Promise<InventoryIncoming[]> {
    const { data, error } = await supabase
      .from('inventory_incoming')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) {
      throw formatErrorMessage('getAllIncoming', error);
    }
    return (data || []) as InventoryIncoming[];
  },

  async createIncoming(payload: InventoryIncomingPayload): Promise<InventoryIncoming> {
    const sanitized = {
      product_id: sanitizeUuid(payload.product_id),
      product_name_snapshot: (payload.product_name_snapshot || '').trim() || 'منتج غير محدد',
      quantity: Math.max(0, Math.floor(Number(payload.quantity) || 0)),
      expiry_date: payload.expiry_date.trim(),
    };

    console.log('[inventoryService.createIncoming] Sending payload to public.inventory_incoming:', sanitized);

    const { data, error } = await supabase
      .from('inventory_incoming')
      .insert(sanitized)
      .select()
      .single();

    if (error) {
      throw formatErrorMessage('createIncoming', error);
    }
    return data as InventoryIncoming;
  },

  async updateIncoming(id: string, updates: Partial<InventoryIncomingPayload>): Promise<InventoryIncoming> {
    const sanitized: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.quantity !== undefined) {
      sanitized.quantity = Math.max(0, Math.floor(Number(updates.quantity) || 0));
    }
    if (updates.expiry_date !== undefined) {
      sanitized.expiry_date = updates.expiry_date.trim();
    }
    if (updates.product_name_snapshot !== undefined) {
      sanitized.product_name_snapshot = updates.product_name_snapshot.trim() || 'منتج غير محدد';
    }
    if (updates.product_id !== undefined) {
      sanitized.product_id = sanitizeUuid(updates.product_id);
    }

    console.log('[inventoryService.updateIncoming] Updating row id:', id, 'payload:', sanitized);

    const { data, error } = await supabase
      .from('inventory_incoming')
      .update(sanitized)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw formatErrorMessage('updateIncoming', error);
    }
    return data as InventoryIncoming;
  },

  async deleteIncoming(id: string): Promise<void> {
    console.log('[inventoryService.deleteIncoming] Deleting row id:', id);
    const { error } = await supabase
      .from('inventory_incoming')
      .delete()
      .eq('id', id);

    if (error) {
      throw formatErrorMessage('deleteIncoming', error);
    }
  },
};
