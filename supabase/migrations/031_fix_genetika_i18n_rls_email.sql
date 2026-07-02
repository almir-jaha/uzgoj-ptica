-- Migracija 031: Ispravi RLS policy za genetika_polja_i18n
-- Problem: subquery na auth.users daje "permission denied for table users"
--          jer authenticated role nema direktnu SELECT dozvolu na auth.users
-- Fix: koristiti auth.email() koji čita email direktno iz JWT tokena (bez DB query-ja)

DROP POLICY IF EXISTS "genetika_polja_admin_write" ON genetika_polja_i18n;

CREATE POLICY "genetika_polja_admin_write" ON genetika_polja_i18n
  FOR ALL TO authenticated
  USING (auth.email() = 'almir.jaha@gmail.com')
  WITH CHECK (auth.email() = 'almir.jaha@gmail.com');
