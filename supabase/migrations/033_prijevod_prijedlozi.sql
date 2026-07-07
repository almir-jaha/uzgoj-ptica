-- Migracija 033: Community prijevodi
-- Korisnici mogu predložiti bolji prijevod bilo kojeg i18n termina direktno iz UI-a.
-- Admin pregleda pending prijedloge i prihvata/odbija ih (prihvatanje ažurira i18n fajl).

CREATE TABLE IF NOT EXISTS prijevod_prijedlozi (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  termin_kljuc      TEXT NOT NULL,                 -- dot-path ključ iz i18n strukture, npr. 'nav.sezone'
  jezik             TEXT NOT NULL CHECK (jezik IN ('bs','hr','sr','sl','en','de','fr','it','es','nl','pl','tr','zh','bg','hu','ro','pt')),
  trenutni_prijevod TEXT NOT NULL,
  prijedlog         TEXT NOT NULL,
  komentar          TEXT,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','prihvaćen','odbijen')),
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE prijevod_prijedlozi ENABLE ROW LEVEL SECURITY;

-- Korisnik može ubaciti samo vlastite prijedloge
CREATE POLICY "prijevod_prijedlozi_insert_own" ON prijevod_prijedlozi
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Korisnik može čitati samo vlastite prijedloge
CREATE POLICY "prijevod_prijedlozi_select_own" ON prijevod_prijedlozi
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Admin može sve (pregled pending liste, prihvatanje/odbijanje)
-- NAPOMENA: koristi se auth.uid() = fiksni admin UUID (isti pattern kao genetika_polja_i18n RLS,
-- vidi migraciju 032 — auth.email() može biti null/nepouzdan u nekim JWT konfiguracijama)
CREATE POLICY "prijevod_prijedlozi_admin_all" ON prijevod_prijedlozi
  FOR ALL TO authenticated
  USING (auth.uid() = 'f0b63962-eef0-45e0-83d7-77282a6ef68d'::uuid)
  WITH CHECK (auth.uid() = 'f0b63962-eef0-45e0-83d7-77282a6ef68d'::uuid);

GRANT ALL ON prijevod_prijedlozi TO authenticated;

CREATE INDEX IF NOT EXISTS idx_prijevod_prijedlozi_status ON prijevod_prijedlozi(status);
CREATE INDEX IF NOT EXISTS idx_prijevod_prijedlozi_user ON prijevod_prijedlozi(user_id);
