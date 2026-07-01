-- Migracija 024: Tabela za genetika polja sa prevodima
-- Omogućava administratoru da dodaje nove genetika atribute sa prevodima na sve jezike

-- Kreiraj tabelu za genetika polja sa i18n prevodima
CREATE TABLE IF NOT EXISTS genetika_polja_i18n (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  polje_kljuc TEXT NOT NULL,
  vrsta_grupa TEXT NOT NULL,
  tip TEXT NOT NULL CHECK (tip IN ('select', 'text', 'tags', 'stars', 'number')),
  sekcija TEXT NOT NULL CHECK (sekcija IN ('genetika', 'ocjena')),
  redoslijed INTEGER NOT NULL DEFAULT 0,

  -- Prevodi na sve jezike — JSON struktura: { "bs": "Mutacija", "en": "Mutation", ... }
  nazivi_jezicima JSONB NOT NULL DEFAULT '{}',
  opisi_jezicima JSONB DEFAULT '{}',

  -- Opcije za select/tags (ako primjenjivo)
  opcije JSONB DEFAULT '[]',
  placeholder_jezicima JSONB DEFAULT '{}',

  -- Min/max za number/stars tipove
  min_vrijednost INTEGER,
  max_vrijednost INTEGER,

  -- Metadata
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint: ista polja se ne dodeljuju više puta
  UNIQUE(polje_kljuc, vrsta_grupa)
);

-- Kreiraj indeks za brže pretraživanje po vrsti grupe
CREATE INDEX IF NOT EXISTS idx_genetika_polja_grupa ON genetika_polja_i18n(vrsta_grupa);
CREATE INDEX IF NOT EXISTS idx_genetika_polja_kljuc ON genetika_polja_i18n(polje_kljuc);

-- RLS politike
ALTER TABLE genetika_polja_i18n ENABLE ROW LEVEL SECURITY;

-- Samo admini mogu pisati u genetika_polja_i18n
CREATE POLICY "genetika_polja_admin_write" ON genetika_polja_i18n
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid() AND (raw_user_meta_data->>'je_admin')::boolean = true
    )
  );

-- Svi korisnici mogu čitati genetika polja
CREATE POLICY "genetika_polja_read" ON genetika_polja_i18n
  FOR SELECT
  USING (true);
