-- Migracija 027: Popravi RLS politiku za genetika_polja_i18n
-- Prethodni policy koristio je raw_user_meta_data->>'je_admin' koji nije postavljen.
-- Koristimo isti email pattern kao ostale admin politike u ovoj bazi.

DROP POLICY IF EXISTS "genetika_polja_admin_write" ON genetika_polja_i18n;

CREATE POLICY "genetika_polja_admin_write" ON genetika_polja_i18n
  FOR ALL
  TO authenticated
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'almir.jaha@gmail.com'
  )
  WITH CHECK (
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'almir.jaha@gmail.com'
  );
