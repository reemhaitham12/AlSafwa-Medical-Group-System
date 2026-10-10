-- ==============================================================================
-- AlSafwa Medical Group: Secure Viewer Role & Hardened RLS Policies Migration
-- VERSION: 2.0 (Audited, Non-Recursive RLS, Dynamic Policy Cleanup, Least-Privilege)
--
-- Safety Guarantees:
-- 1. Non-destructive: Does NOT drop tables, columns, or modify business records.
-- 2. Preserves existing owner/admin access: Existing profiles receive 'admin'.
-- 3. Non-recursive Profiles RLS: No circular queries or RLS loops on public.profiles.
-- 4. Dynamic Policy Cleanup: Drops ALL existing permissive write policies dynamically
--    from pg_policies, preventing OR-logic bypasses without relying on hardcoded names.
-- 5. Sequence Privilege Hardening: Sequence usage is strictly encapsulated inside
--    SECURITY DEFINER function generate_invoice_number(). Direct sequence access
--    is revoked from authenticated and viewer users.
-- 6. Privacy Preservation: Profiles are scoped so non-admins only read minimal data
--    (their own profile and profiles linked to invoices/creators).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SCHEMA MIGRATION: Add role column to public.profiles safely
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'admin';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS check_profile_role;

ALTER TABLE public.profiles
  ADD CONSTRAINT check_profile_role
  CHECK (role IN ('admin', 'viewer'));

-- Guarantee current owner / existing profiles remain 'admin'
UPDATE public.profiles
SET role = 'admin'
WHERE role IS NULL OR role = '';

-- ------------------------------------------------------------------------------
-- 2. SECURE USER CREATION TRIGGER: handle_new_user()
-- Zero-Trust rule: Client-supplied user metadata is NEVER trusted for role.
-- New accounts default to 'viewer'. Existing profile role is NEVER overwritten.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      SPLIT_PART(NEW.email, '@', 1)
    ),
    NEW.email,
    'viewer' -- Safe default: every new signup is a viewer
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    email = EXCLUDED.email,
    updated_at = NOW();
    -- NOTICE: 'role' is intentionally NOT updated here.

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 3. AUTHORIZATION HELPERS
-- Defined with SECURITY DEFINER and search_path = public.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid()),
    'viewer'
  );
$$;

REVOKE ALL ON FUNCTION public.get_current_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT (public.get_current_user_role() = 'admin');
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ------------------------------------------------------------------------------
-- 4. DYNAMIC POLICY CLEANUP (Solves Legacy Policy OR-Bypass Risk)
-- Drops all existing policies on protected tables to ensure no unrecorded
-- legacy policy permits unauthorized write access.
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'profiles',
        'products',
        'customers',
        'invoices',
        'invoice_items',
        'inventory_stock',
        'inventory_incoming'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END;
$$;

-- Ensure RLS is active on all tables
ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_stock    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_incoming ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 5. PROFILES RLS (Non-recursive & Privacy Scoped)
-- ------------------------------------------------------------------------------
-- Admins can view all profiles; non-admins view own profile or creator profile
CREATE POLICY "Profiles read access"
ON public.profiles FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR auth.uid() = id
  OR id IN (SELECT created_by FROM public.invoices WHERE created_by IS NOT NULL)
);

-- Users can update their own profile name without recursion.
-- Role changes are rejected unless the user is an admin.
CREATE POLICY "Users update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND (
    public.is_admin()
    OR role = public.get_current_user_role()
  )
);

-- Admins can update any profile (e.g. promoting a user)
CREATE POLICY "Admins update any profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 6. PRODUCTS RLS
-- ------------------------------------------------------------------------------
CREATE POLICY "Products select"
ON public.products FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Products insert"
ON public.products FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Products update"
ON public.products FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Products delete"
ON public.products FOR DELETE
TO authenticated
USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 7. CUSTOMERS RLS
-- ------------------------------------------------------------------------------
CREATE POLICY "Customers select"
ON public.customers FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Customers insert"
ON public.customers FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Customers update"
ON public.customers FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Customers delete"
ON public.customers FOR DELETE
TO authenticated
USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 8. INVOICES RLS
-- ------------------------------------------------------------------------------
CREATE POLICY "Invoices select"
ON public.invoices FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Invoices insert"
ON public.invoices FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Invoices update"
ON public.invoices FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Invoices delete"
ON public.invoices FOR DELETE
TO authenticated
USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 9. INVOICE ITEMS RLS
-- ------------------------------------------------------------------------------
CREATE POLICY "Invoice items select"
ON public.invoice_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Invoice items insert"
ON public.invoice_items FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Invoice items update"
ON public.invoice_items FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Invoice items delete"
ON public.invoice_items FOR DELETE
TO authenticated
USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 10. INVENTORY STOCK RLS
-- ------------------------------------------------------------------------------
CREATE POLICY "Inventory stock select"
ON public.inventory_stock FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Inventory stock insert"
ON public.inventory_stock FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Inventory stock update"
ON public.inventory_stock FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Inventory stock delete"
ON public.inventory_stock FOR DELETE
TO authenticated
USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 11. INVENTORY INCOMING RLS
-- ------------------------------------------------------------------------------
CREATE POLICY "Inventory incoming select"
ON public.inventory_incoming FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Inventory incoming insert"
ON public.inventory_incoming FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Inventory incoming update"
ON public.inventory_incoming FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Inventory incoming delete"
ON public.inventory_incoming FOR DELETE
TO authenticated
USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 12. INVOICE NUMBER SEQUENCE PRIVILEGE HARDENING
-- Encapsulate sequence incrementing inside generate_invoice_number() SECURITY DEFINER.
-- Direct sequence calls from authenticated/viewer users are revoked.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow invocation if the caller is an authorized admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can generate new invoice numbers';
  END IF;

  RETURN 'INV-' || LPAD(nextval('public.invoice_number_seq')::TEXT, 6, '0');
END;
$$;

-- Revoke direct permissions on sequence from public and authenticated
REVOKE ALL ON SEQUENCE public.invoice_number_seq FROM PUBLIC;
REVOKE ALL ON SEQUENCE public.invoice_number_seq FROM authenticated;
REVOKE ALL ON SEQUENCE public.invoice_number_seq FROM anon;

-- Explicit table grants for authenticated role under RLS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles           TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products           TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices           TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_items      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_stock    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_incoming TO authenticated;

-- ==============================================================================
-- END OF MIGRATION SCRIPT
-- ==============================================================================
