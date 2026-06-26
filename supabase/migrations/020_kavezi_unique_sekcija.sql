-- Zamijeni UNIQUE(sezona_id, oznaka) sa dvjema parcijalnim indeksima
-- koji dozvoljavaju isti broj kaveza unutar različitih sekcija

ALTER TABLE kavezi DROP CONSTRAINT IF EXISTS kavezi_sezona_id_oznaka_key;

-- Kavezi unutar sekcije: jedinstven broj u toj sekciji
CREATE UNIQUE INDEX IF NOT EXISTS kavezi_unique_u_sekciji
  ON kavezi (sezona_id, sekcija_id, oznaka)
  WHERE sekcija_id IS NOT NULL;

-- Kavezi bez sekcije: jedinstven broj unutar sezone
CREATE UNIQUE INDEX IF NOT EXISTS kavezi_unique_bez_sekcije
  ON kavezi (sezona_id, oznaka)
  WHERE sekcija_id IS NULL;
