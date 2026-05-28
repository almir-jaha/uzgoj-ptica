-- Više uzgajivačnica po korisniku (ptice, golubovi, itd.)
-- Svaka uzgajivačnica ima vlastiti naziv, prsten prefiks i evidenciju ptica/sezona

CREATE TABLE IF NOT EXISTS uzgajivacnice (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  naziv TEXT NOT NULL DEFAULT 'Moja uzgajivačnica',
  prsten_prefiks TEXT,
  ime_prezime TEXT,
  adresa TEXT,
  telefon TEXT,
  slika_url TEXT,
  app_url TEXT,
  napomena TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE uzgajivacnice ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Korisnik upravlja samo svojim uzgajivacnicama"
  ON uzgajivacnice FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Anon može čitati uzgajivacnice (za javni profil ptice — QR sken)
CREATE POLICY "anon_read_uzgajivacnice"
  ON uzgajivacnice FOR SELECT TO anon
  USING (true);

GRANT ALL ON uzgajivacnice TO authenticated;
GRANT SELECT ON uzgajivacnice TO anon;

-- Dodaj uzgajivacnica_id na ptice i sezona (nullable — migrira se ispod)
ALTER TABLE ptice ADD COLUMN IF NOT EXISTS uzgajivacnica_id UUID REFERENCES uzgajivacnice(id) ON DELETE SET NULL;
ALTER TABLE sezona ADD COLUMN IF NOT EXISTS uzgajivacnica_id UUID REFERENCES uzgajivacnice(id) ON DELETE SET NULL;

-- Indeksi za brze upite
CREATE INDEX IF NOT EXISTS idx_ptice_uzgajivacnica_id ON ptice(uzgajivacnica_id);
CREATE INDEX IF NOT EXISTS idx_sezona_uzgajivacnica_id ON sezona(uzgajivacnica_id);
CREATE INDEX IF NOT EXISTS idx_uzgajivacnice_user_id ON uzgajivacnice(user_id);

-- Migracija: za svakog korisnika koji ima user_settings, kreiraj prvu uzgajivačnicu
INSERT INTO uzgajivacnice (user_id, naziv, prsten_prefiks, ime_prezime, adresa, telefon, slika_url, app_url)
SELECT
  us.user_id,
  COALESCE(NULLIF(TRIM(us.naziv_uzgajivacnice), ''), 'Moja uzgajivačnica'),
  us.prsten_prefiks,
  us.ime_prezime,
  us.adresa,
  us.telefon,
  us.slika_url,
  us.app_url
FROM user_settings us
ON CONFLICT DO NOTHING;

-- Poveži sve ptice korisnika na njegovu (prvu) uzgajivačnicu
UPDATE ptice p
SET uzgajivacnica_id = uz.id
FROM uzgajivacnice uz
WHERE uz.user_id = p.user_id
  AND p.uzgajivacnica_id IS NULL;

-- Poveži sve sezone korisnika na njegovu (prvu) uzgajivačnicu
UPDATE sezona s
SET uzgajivacnica_id = uz.id
FROM uzgajivacnice uz
WHERE uz.user_id = s.user_id
  AND s.uzgajivacnica_id IS NULL;
