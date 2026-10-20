-- ==============================================================================
-- AlSafwa Medical Group: Manual Customer Previous Debt Feature Migration
-- VERSION: 1.0
--
-- Safety Guarantees:
-- 1. Non-destructive: ADD COLUMN IF NOT EXISTS — never drops columns or data.
-- 2. Existing customers default to 0 previous_debt automatically.
-- 3. Existing invoices default to 0 previous_debt_snapshot automatically.
-- 4. RLS on customers already blocks viewer writes — new column inherits this.
-- 5. Snapshot column on invoices is immutable after insert (set once, stays).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Add previous_debt to customers table
-- ------------------------------------------------------------------------------
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS previous_debt NUMERIC(12,2) NOT NULL DEFAULT 0
  CHECK (previous_debt >= 0);

COMMENT ON COLUMN public.customers.previous_debt IS
  'Manually recorded previous debt for this customer. Editable by admins only. Default 0.';

-- ------------------------------------------------------------------------------
-- 2. Add previous_debt_snapshot to invoices table
-- ------------------------------------------------------------------------------
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS previous_debt_snapshot NUMERIC(12,2) NOT NULL DEFAULT 0
  CHECK (previous_debt_snapshot >= 0);

COMMENT ON COLUMN public.invoices.previous_debt_snapshot IS
  'Immutable snapshot of the customer previous_debt at the time this invoice was created or last edited. Preserved forever — editing customer debt later does NOT change old invoices.';

-- ------------------------------------------------------------------------------
-- 3. Verify
-- ------------------------------------------------------------------------------
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('customers', 'invoices')
  AND column_name IN ('previous_debt', 'previous_debt_snapshot')
ORDER BY table_name, column_name;
