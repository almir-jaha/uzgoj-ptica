-- Masovni zdravstveni tretmani po sekciji
ALTER TABLE zdravlje ADD COLUMN IF NOT EXISTS sekcija_id UUID REFERENCES sekcije(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_zdravlje_sekcija_id ON zdravlje(sekcija_id);
