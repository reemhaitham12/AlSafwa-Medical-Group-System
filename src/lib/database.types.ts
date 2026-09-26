export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  item_number: number | null;
  name: string;
  product_code: string | null;
  category: string | null;
  price: number;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string | null;
  customer_name_snapshot: string;
  subtotal: number;
  discount_percentage: number;
  discount_amount: number;
  final_total: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Optional expanded relations
  items?: InvoiceItem[];
  customer?: Customer;
  creator?: Profile;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string | null;
  product_name_snapshot: string;
  quantity: number;
  unit_price: number;
  total: number;
  created_at: string;
}

export interface InventoryStock {
  id: string;
  product_id: string | null;
  product_name_snapshot: string;
  quantity: number;
  expiry_date: string; // DATE stored as YYYY-MM-DD string (NOT NULL)
  created_at: string;
  updated_at: string;
}

export interface InventoryIncoming {
  id: string;
  product_id: string | null;
  product_name_snapshot: string;
  quantity: number;
  expiry_date: string; // DATE stored as YYYY-MM-DD string (NOT NULL)
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'> & { created_at?: string; updated_at?: string };
        Update: Partial<Omit<Profile, 'id'>>;
      };
      products: {
        Row: Product;
        Insert: Omit<Product, 'id' | 'created_at' | 'updated_at'> & { id?: string; item_number?: number | null; product_code?: string | null; created_at?: string; updated_at?: string };
        Update: Partial<Omit<Product, 'id'>>;
      };
      customers: {
        Row: Customer;
        Insert: Omit<Customer, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<Customer, 'id'>>;
      };
      invoices: {
        Row: Invoice;
        Insert: Omit<Invoice, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<Invoice, 'id'>>;
      };
      invoice_items: {
        Row: InvoiceItem;
        Insert: Omit<InvoiceItem, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<InvoiceItem, 'id'>>;
      };
      inventory_stock: {
        Row: InventoryStock;
        Insert: Omit<InventoryStock, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<InventoryStock, 'id'>>;
      };
      inventory_incoming: {
        Row: InventoryIncoming;
        Insert: Omit<InventoryIncoming, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<InventoryIncoming, 'id'>>;
      };
    };
  };
}
