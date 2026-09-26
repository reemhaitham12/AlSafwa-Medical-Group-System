-- ============================================================
-- Products & Inventory: New Tables Migration
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Current Stock Batches
-- Each row is one batch of a product currently in stock.
-- The same product can have multiple rows with different expiry dates.
CREATE TABLE IF NOT EXISTS public.inventory_stock (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name_snapshot TEXT NOT NULL,
  quantity      INTEGER NOT NULL CHECK (quantity >= 0),
  expiry_date DATE NOT NULL,           -- Product expiry date (NOT entry date)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Incoming Shipment Batches
-- Each row is one incoming batch of a product.
-- The same product can have multiple rows with different expiry dates.
CREATE TABLE IF NOT EXISTS public.inventory_incoming (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name_snapshot TEXT NOT NULL,
  quantity      INTEGER NOT NULL CHECK (quantity >= 0),
  expiry_date   DATE NOT NULL,           -- Product expiry date (NOT shipment date)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Enable Row Level Security
-- ============================================================
ALTER TABLE public.inventory_stock    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_incoming ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS Policies: inventory_stock
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view inventory_stock"   ON public.inventory_stock;
DROP POLICY IF EXISTS "Authenticated users can insert inventory_stock"  ON public.inventory_stock;
DROP POLICY IF EXISTS "Authenticated users can update inventory_stock"  ON public.inventory_stock;
DROP POLICY IF EXISTS "Authenticated users can delete inventory_stock"  ON public.inventory_stock;

CREATE POLICY "Authenticated users can view inventory_stock"
ON public.inventory_stock FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert inventory_stock"
ON public.inventory_stock FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update inventory_stock"
ON public.inventory_stock FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete inventory_stock"
ON public.inventory_stock FOR DELETE
TO authenticated
USING (true);

-- ============================================================
-- RLS Policies: inventory_incoming
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view inventory_incoming"   ON public.inventory_incoming;
DROP POLICY IF EXISTS "Authenticated users can insert inventory_incoming"  ON public.inventory_incoming;
DROP POLICY IF EXISTS "Authenticated users can update inventory_incoming"  ON public.inventory_incoming;
DROP POLICY IF EXISTS "Authenticated users can delete inventory_incoming"  ON public.inventory_incoming;

CREATE POLICY "Authenticated users can view inventory_incoming"
ON public.inventory_incoming FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert inventory_incoming"
ON public.inventory_incoming FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update inventory_incoming"
ON public.inventory_incoming FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete inventory_incoming"
ON public.inventory_incoming FOR DELETE
TO authenticated
USING (true);

-- ============================================================
-- Explicit grants for authenticated and service_role
-- ============================================================
GRANT ALL ON public.inventory_stock    TO authenticated;
GRANT ALL ON public.inventory_incoming TO authenticated;
GRANT ALL ON public.inventory_stock    TO service_role;
GRANT ALL ON public.inventory_incoming TO service_role;

-- ============================================================
-- Indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_inventory_stock_product_id
  ON public.inventory_stock(product_id);

CREATE INDEX IF NOT EXISTS idx_inventory_incoming_product_id
  ON public.inventory_incoming(product_id);
