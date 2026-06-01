-- Status evidencije ptice: aktivna, uginula, prodata, poklonjena, ostalo
ALTER TABLE ptice ADD COLUMN IF NOT EXISTS status_evidencije TEXT DEFAULT 'aktivna';
ALTER TABLE ptice ADD COLUMN IF NOT EXISTS datum_statusa DATE;
ALTER TABLE ptice ADD COLUMN IF NOT EXISTS napomena_statusa TEXT;
