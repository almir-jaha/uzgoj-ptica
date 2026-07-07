-- Migracija 034: izvor/izvor_id kolone na prijevod_prijedlozi
-- Omogućava prijedloge za tri izvora termina:
--   'i18n'         — termin_kljuc je dot-path ključ iz src/lib/i18n/<jezik>.ts, izvor_id je NULL
--   'faza_ciklusa' — termin_kljuc je BS naziv faze, izvor_id je faze_ciklusa.id
--   'vrsta_ptica'  — termin_kljuc je BS naziv vrste, izvor_id je vrsta_ptica.id

ALTER TABLE prijevod_prijedlozi
  ADD COLUMN IF NOT EXISTS izvor TEXT NOT NULL DEFAULT 'i18n'
    CHECK (izvor IN ('i18n', 'faza_ciklusa', 'vrsta_ptica')),
  ADD COLUMN IF NOT EXISTS izvor_id UUID;

CREATE INDEX IF NOT EXISTS idx_prijevod_prijedlozi_izvor ON prijevod_prijedlozi(izvor, izvor_id);
