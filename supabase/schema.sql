CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE SEQUENCE IF NOT EXISTS invoice_number_seq
START WITH 1
INCREMENT BY 1;

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN 'INV-' || LPAD(nextval('invoice_number_seq')::TEXT, 6, '0');
END;
$$;

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  product_code TEXT UNIQUE,
  category TEXT DEFAULT 'General',
  price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL DEFAULT generate_invoice_number(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name_snapshot TEXT NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount_percentage NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (
    discount_percentage >= 0 AND discount_percentage <= 100
  ),
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  final_total NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (final_total >= 0),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name_snapshot TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  total NUMERIC(12,2) NOT NULL CHECK (total >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      SPLIT_PART(NEW.email, '@', 1)
    ),
    NEW.email
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Authenticated users can view products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can insert products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can update products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can delete products" ON public.products;

CREATE POLICY "Authenticated users can view products"
ON public.products FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert products"
ON public.products FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update products"
ON public.products FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete products"
ON public.products FOR DELETE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can update customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can delete customers" ON public.customers;

CREATE POLICY "Authenticated users can view customers"
ON public.customers FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert customers"
ON public.customers FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update customers"
ON public.customers FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete customers"
ON public.customers FOR DELETE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can view invoices" ON public.invoices;
DROP POLICY IF EXISTS "Authenticated users can create invoices" ON public.invoices;
DROP POLICY IF EXISTS "Authenticated users can update invoices" ON public.invoices;
DROP POLICY IF EXISTS "Authenticated users can delete invoices" ON public.invoices;

CREATE POLICY "Authenticated users can view invoices"
ON public.invoices FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create invoices"
ON public.invoices FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update invoices"
ON public.invoices FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete invoices"
ON public.invoices FOR DELETE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can view invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Authenticated users can create invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Authenticated users can update invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Authenticated users can delete invoice items" ON public.invoice_items;

CREATE POLICY "Authenticated users can view invoice items"
ON public.invoice_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create invoice items"
ON public.invoice_items FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update invoice items"
ON public.invoice_items FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete invoice items"
ON public.invoice_items FOR DELETE
TO authenticated
USING (true);

CREATE INDEX IF NOT EXISTS idx_products_name
ON public.products(name);

CREATE INDEX IF NOT EXISTS idx_products_code
ON public.products(product_code);

CREATE INDEX IF NOT EXISTS idx_customers_name
ON public.customers(name);

CREATE INDEX IF NOT EXISTS idx_invoices_customer_id
ON public.invoices(customer_id);

CREATE INDEX IF NOT EXISTS idx_invoices_created_by
ON public.invoices(created_by);

CREATE INDEX IF NOT EXISTS idx_invoices_created_at
ON public.invoices(created_at);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id
ON public.invoice_items(invoice_id);

CREATE INDEX IF NOT EXISTS idx_invoice_items_product_id
ON public.invoice_items(product_id);

-- Explicit table permissions for authenticated role under RLS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_items TO authenticated;

