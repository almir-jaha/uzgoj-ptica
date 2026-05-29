-- Fix: admin politike koje pristupaju auth.users uzrokuju 403 za sve korisnike
-- Rješenje: SECURITY DEFINER funkcija koja može pristupiti auth.users

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND email = 'almir.jaha@gmail.com'
  );
$$;

-- uzgajivacnice: zamijeni stare admin politike
DROP POLICY IF EXISTS "admin_reads_all_uzgajivacnice" ON uzgajivacnice;
DROP POLICY IF EXISTS "admin_updates_all_uzgajivacnice" ON uzgajivacnice;

CREATE POLICY "admin_reads_all_uzgajivacnice"
  ON uzgajivacnice FOR SELECT
  USING (public.is_admin_user());

CREATE POLICY "admin_updates_all_uzgajivacnice"
  ON uzgajivacnice FOR UPDATE
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- user_tiers: zamijeni stare admin politike
DROP POLICY IF EXISTS "admin_reads_all_tiers" ON user_tiers;
DROP POLICY IF EXISTS "admin_manages_all_tiers" ON user_tiers;

CREATE POLICY "admin_reads_all_tiers"
  ON user_tiers FOR SELECT
  USING (public.is_admin_user());

CREATE POLICY "admin_manages_all_tiers"
  ON user_tiers FOR ALL
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());
