-- Migracija 032: Zamijeni email check sa uid() u RLS policy-ju
-- Problem: auth.email() može biti null/nepouzdan u nekim JWT konfiguracijama,
--          što daje tihi UPDATE (success, 0 redova, bez greške)
-- Fix: koristiti auth.uid() koji je uvijek prisutan u JWT i nikad ne može biti null

DROP POLICY IF EXISTS "genetika_polja_admin_write" ON genetika_polja_i18n;

CREATE POLICY "genetika_polja_admin_write" ON genetika_polja_i18n
  FOR ALL TO authenticated
  USING (auth.uid() = 'f0b63962-eef0-45e0-83d7-77282a6ef68d'::uuid)
  WITH CHECK (auth.uid() = 'f0b63962-eef0-45e0-83d7-77282a6ef68d'::uuid);

-- Verifikacija
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'genetika_polja_i18n';
