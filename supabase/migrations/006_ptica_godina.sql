-- Godina uzgoja/rodjenja ptice (npr. 2026)
-- Koristiti umjesto parsiranja oznake prstena za filtriranje po sezoni
ALTER TABLE ptice ADD COLUMN IF NOT EXISTS godina SMALLINT;

CREATE INDEX IF NOT EXISTS ptice_godina_idx ON ptice(user_id, godina);
