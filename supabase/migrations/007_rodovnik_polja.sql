-- Polja za rodovnik na pticama
ALTER TABLE ptice ADD COLUMN IF NOT EXISTS rezultati TEXT;
ALTER TABLE ptice ADD COLUMN IF NOT EXISTS napomena_rodovnik TEXT;
ALTER TABLE ptice ADD COLUMN IF NOT EXISTS slika_url TEXT;

-- Profil uzgajivača (proširenje user_settings)
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS naziv_uzgajivacnice TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS ime_prezime TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS adresa TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS telefon TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS slika_url TEXT;

-- Supabase Storage bucketi za slike
INSERT INTO storage.buckets (id, name, public)
VALUES ('ptice', 'ptice', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('uzgajivaci', 'uzgajivaci', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS politike
CREATE POLICY "Javno čitanje slika ptica"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'ptice');

CREATE POLICY "Korisnik uploada slike svojih ptica"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ptice' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Korisnik briše svoje slike ptica"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'ptice' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Javno čitanje slika uzgajivača"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'uzgajivaci');

CREATE POLICY "Korisnik uploada svoju sliku"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'uzgajivaci' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Korisnik briše svoju sliku"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'uzgajivaci' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Korisnik mijenja svoju sliku"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id IN ('ptice', 'uzgajivaci') AND (storage.foldername(name))[1] = auth.uid()::text);
