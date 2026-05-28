-- Dodaj boja i status_ptica polja na tabelu ptice
ALTER TABLE ptice ADD COLUMN IF NOT EXISTS boja TEXT;
ALTER TABLE ptice ADD COLUMN IF NOT EXISTS status_ptica TEXT;
