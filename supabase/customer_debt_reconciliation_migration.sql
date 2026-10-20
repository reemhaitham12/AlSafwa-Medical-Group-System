-- ==============================================================================
-- AlSafwa Medical Group: Customer Debt Reconciliation & Payments Migration
-- VERSION: 2.0 (Complete Chronological Ledger & Opening Debt Baseline)
--
-- Safety Guarantees:
-- 1. Non-destructive: Uses ADD COLUMN IF NOT EXISTS and CREATE TABLE IF NOT EXISTS.
-- 2. Preserves all existing customers, invoices, and debt amounts.
-- 3. Enables PostgREST schema cache refresh via NOTIFY pgrst.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Enhance public.customers with Opening Debt and Baseline Date
-- ------------------------------------------------------------------------------
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS previous_debt NUMERIC(12,2) NOT NULL DEFAULT 0
  CHECK (previous_debt >= 0);

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS opening_debt NUMERIC(12,2) NOT NULL DEFAULT 0
  CHECK (opening_debt >= 0);

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS opening_debt_date TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Backfill opening_debt from previous_debt for existing records if opening_debt is 0
UPDATE public.customers
SET opening_debt = previous_debt
WHERE (opening_debt IS NULL OR opening_debt = 0) AND previous_debt > 0;

COMMENT ON COLUMN public.customers.opening_debt IS
  'Customer opening debt balance as of opening_debt_date.';

COMMENT ON COLUMN public.customers.opening_debt_date IS
  'Baseline timestamp from which subsequent invoices and payments are calculated.';

COMMENT ON COLUMN public.customers.previous_debt IS
  'Current live running outstanding debt balance after all reconciled invoices and payments.';

-- ------------------------------------------------------------------------------
-- 2. Ensure public.invoices has previous_debt_snapshot
-- ------------------------------------------------------------------------------
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS previous_debt_snapshot NUMERIC(12,2) NOT NULL DEFAULT 0
  CHECK (previous_debt_snapshot >= 0);

COMMENT ON COLUMN public.invoices.previous_debt_snapshot IS
  'Running customer debt snapshot immediately before this invoice was added.';

-- ------------------------------------------------------------------------------
-- 3. Create public.customer_payments Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  previous_debt NUMERIC(12,2) NOT NULL DEFAULT 0,
  remaining_debt NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_payments_customer_id
ON public.customer_payments(customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_payments_created_at
ON public.customer_payments(created_at);

ALTER TABLE public.customer_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customer payments select" ON public.customer_payments;
DROP POLICY IF EXISTS "Customer payments insert" ON public.customer_payments;
DROP POLICY IF EXISTS "Customer payments delete" ON public.customer_payments;

CREATE POLICY "Customer payments select"
ON public.customer_payments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Customer payments insert"
ON public.customer_payments FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Customer payments delete"
ON public.customer_payments FOR DELETE
TO authenticated
WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_payments TO authenticated;

-- ------------------------------------------------------------------------------
-- 4. Notify PostgREST to reload schema cache
-- ------------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

-- ------------------------------------------------------------------------------
-- 5. Verification Query
-- ------------------------------------------------------------------------------
SELECT table_name, column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('customers', 'invoices', 'customer_payments')
  AND column_name IN ('previous_debt', 'opening_debt', 'opening_debt_date', 'previous_debt_snapshot', 'amount', 'remaining_debt')
ORDER BY table_name, column_name;
