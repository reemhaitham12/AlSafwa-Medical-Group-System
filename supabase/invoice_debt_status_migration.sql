-- ==============================================================================
-- AlSafwa Medical Group: Invoice Debt Status Migration
-- VERSION: 1.0
--
-- Adds debt_status column to invoices table to track whether the invoice's
-- effect on the customer's outstanding debt has been successfully accounted for.
--
-- Statuses:
-- 'applied'      - Green dot 🟢: Debt effect has been verified and applied to customer balance.
-- 'unreconciled' - Gray dot ⚪: Debt effect has not yet been applied or confirmed.
-- 'failed'       - Red dot 🔴: Debt calculation or update failed.
--
-- Safety Guarantees:
-- 1. Non-destructive: ADD COLUMN IF NOT EXISTS — never drops tables or existing data.
-- 2. Existing invoices safely default to 'unreconciled' automatically.
-- 3. Enables PostgREST schema cache reload via NOTIFY pgrst.
-- ==============================================================================

-- 1. Add debt_status column to invoices table
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS debt_status VARCHAR(20) NOT NULL DEFAULT 'unreconciled'
  CHECK (debt_status IN ('applied', 'unreconciled', 'failed'));

COMMENT ON COLUMN public.invoices.debt_status IS
  'Status of invoice debt effect on customer debt: applied (green), unreconciled (gray), failed (red).';

-- 2. Notify PostgREST to reload schema cache immediately
NOTIFY pgrst, 'reload schema';

-- 3. Verification Query
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'invoices'
  AND column_name = 'debt_status';
