-- ==============================================================================
-- AlSafwa Medical Group: Customer Payments Audit Table Migration
-- VERSION: 1.0
--
-- Safety Guarantees:
-- 1. Non-destructive: Creates public.customer_payments IF NOT EXISTS.
-- 2. References public.customers with ON DELETE CASCADE.
-- 3. Enables RLS: Authenticated users can view; only admins can insert/delete.
-- 4. Retains full history of all customer payments and debt deductions.
-- ==============================================================================

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
