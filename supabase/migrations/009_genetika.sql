-- Migracija 009: Dinamička genetika ptica
-- Dodaje `grupa` na vrsta_ptica i `genetika JSONB` na ptice

-- 1. Polje `grupa` na vrsta_ptica (kategorija koja određuje koja polja su vidljiva)
ALTER TABLE vrsta_ptica
  ADD COLUMN IF NOT EXISTS grupa TEXT NOT NULL DEFAULT 'ostalo';

-- 2. Ažuriraj postojeće vrste sa odgovarajućom grupom
UPDATE vrsta_ptica
SET grupa = 'kanarinac_finke'
WHERE naziv IN ('Kanarinac boja', 'Kanarinac stasa', 'Kanarinac pjevač',
                'Štiglić', 'Zeba', 'Zelenac');

-- 3. Polje `genetika` na ptice (fleksibilni JSONB za sve dinamičke atribute)
ALTER TABLE ptice
  ADD COLUMN IF NOT EXISTS genetika JSONB DEFAULT '{}'::jsonb;

-- 4. GIN index za efikasno pretraživanje po genetičkim atributima
CREATE INDEX IF NOT EXISTS idx_ptice_genetika ON ptice USING GIN (genetika);
