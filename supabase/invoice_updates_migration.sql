-- ============================================================
-- Invoice Updates Migration: notes + is_bonus columns
-- AlSafwa Medical Group Invoice Management System
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Add notes column to invoices table
--    Stores the optional invoice note shown in PDF/print
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;

-- 2. Add is_bonus column to invoices table
--    If true, invoice is a bonus — MUST NOT be counted in Total Sales
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS is_bonus BOOLEAN NOT NULL DEFAULT FALSE;

-- Existing invoices remain is_bonus = false (normal sales) automatically.
-- No data migration is required.

-- 3. Optional: Add descriptive comments
COMMENT ON COLUMN public.invoices.notes IS
  'Optional invoice note, displayed inside the PDF/print notes box';

COMMENT ON COLUMN public.invoices.is_bonus IS
  'If TRUE this invoice is a bonus delivery — excluded from Total Sales calculations';

-- 4. Verify the columns were added
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'invoices'
  AND column_name IN ('notes', 'is_bonus');
