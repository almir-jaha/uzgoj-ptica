-- Seed podaci za vrsta_ptica i faze_ciklusa
-- Predefinisani UUID-evi za stabilne reference

DO $$
DECLARE
  kan_boja  UUID := 'a1a1a1a1-0001-0001-0001-000000000001';
  kan_stasa UUID := 'a2a2a2a2-0002-0002-0002-000000000002';
  kan_pjev  UUID := 'a3a3a3a3-0003-0003-0003-000000000003';
  stiglic   UUID := 'a4a4a4a4-0004-0004-0004-000000000004';
  zeba      UUID := 'a5a5a5a5-0005-0005-0005-000000000005';
  zelenac   UUID := 'a6a6a6a6-0006-0006-0006-000000000006';
BEGIN

-- ============================================================
-- VRSTA PTICA
-- ============================================================
INSERT INTO vrsta_ptica (id, naziv, naziv_latinskih_imena, nazivi_jezicima, podatci_inkubacija)
VALUES
  (kan_boja,
   'Kanarinac boja',
   ARRAY['Serinus canaria domestica'],
   '{"en": "Color Canary", "de": "Farbkanarien", "hr": "Kanarinac boja"}',
   '{"inkubacija_dana": 13, "prstenovanje_dana": 7, "odvajanje_dana": 30}'
  ),
  (kan_stasa,
   'Kanarinac stasa',
   ARRAY['Serinus canaria domestica'],
   '{"en": "Type Canary", "de": "Positurkanarien", "hr": "Kanarinac stasa"}',
   '{"inkubacija_dana": 13, "prstenovanje_dana": 7, "odvajanje_dana": 30}'
  ),
  (kan_pjev,
   'Kanarinac pjevač',
   ARRAY['Serinus canaria domestica'],
   '{"en": "Song Canary", "de": "Gesangskanarien", "hr": "Kanarinac pjevač"}',
   '{"inkubacija_dana": 13, "prstenovanje_dana": 7, "odvajanje_dana": 30}'
  ),
  (stiglic,
   'Štiglić',
   ARRAY['Carduelis carduelis'],
   '{"en": "European Goldfinch", "de": "Distelfink", "hr": "Štiglić"}',
   '{"inkubacija_dana": 13, "prstenovanje_dana": 6, "odvajanje_dana": 25}'
  ),
  (zeba,
   'Zeba',
   ARRAY['Fringilla coelebs'],
   '{"en": "Common Chaffinch", "de": "Buchfink", "hr": "Zeba"}',
   '{"inkubacija_dana": 13, "prstenovanje_dana": 7, "odvajanje_dana": 25}'
  ),
  (zelenac,
   'Zelenac',
   ARRAY['Chloris chloris'],
   '{"en": "European Greenfinch", "de": "Grünfink", "hr": "Zelenac"}',
   '{"inkubacija_dana": 13, "prstenovanje_dana": 7, "odvajanje_dana": 28}'
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- FAZE CIKLUSA — Kanarinac boja
-- Akumulirani dani: Inkubacija(13) → Prstenovanje(+7=20) → Odvajanje(+30=50)
-- ============================================================
INSERT INTO faze_ciklusa (vrsta_ptica_id, redoslijed, naziv, boja, broj_dana, opis)
VALUES
  (kan_boja, 1, 'Inkubacija',    '#f59e0b', 13, 'Sjedenje na jajima — 13 dana od prvog jajeta'),
  (kan_boja, 2, 'Prstenovanje',  '#3b82f6',  7, 'Prstenovanje pilića — 7 dana nakon izlijeganja'),
  (kan_boja, 3, 'Odvajanje',     '#22c55e', 30, 'Odvajanje od roditelja — 30 dana nakon izlijeganja')
ON CONFLICT DO NOTHING;

-- ============================================================
-- FAZE CIKLUSA — Kanarinac stasa
-- ============================================================
INSERT INTO faze_ciklusa (vrsta_ptica_id, redoslijed, naziv, boja, broj_dana, opis)
VALUES
  (kan_stasa, 1, 'Inkubacija',   '#f59e0b', 13, 'Sjedenje na jajima'),
  (kan_stasa, 2, 'Prstenovanje', '#3b82f6',  7, 'Prstenovanje pilića'),
  (kan_stasa, 3, 'Odvajanje',    '#22c55e', 30, 'Odvajanje od roditelja')
ON CONFLICT DO NOTHING;

-- ============================================================
-- FAZE CIKLUSA — Kanarinac pjevač
-- ============================================================
INSERT INTO faze_ciklusa (vrsta_ptica_id, redoslijed, naziv, boja, broj_dana, opis)
VALUES
  (kan_pjev, 1, 'Inkubacija',   '#f59e0b', 13, 'Sjedenje na jajima'),
  (kan_pjev, 2, 'Prstenovanje', '#3b82f6',  7, 'Prstenovanje pilića'),
  (kan_pjev, 3, 'Odvajanje',    '#22c55e', 30, 'Odvajanje od roditelja')
ON CONFLICT DO NOTHING;

-- ============================================================
-- FAZE CIKLUSA — Štiglić
-- Inkubacija(13) → Prstenovanje(+6=19) → Odvajanje(+25=44)
-- ============================================================
INSERT INTO faze_ciklusa (vrsta_ptica_id, redoslijed, naziv, boja, broj_dana, opis)
VALUES
  (stiglic, 1, 'Inkubacija',   '#f59e0b', 13, 'Sjedenje na jajima — 13 dana'),
  (stiglic, 2, 'Prstenovanje', '#3b82f6',  6, 'Prstenovanje pilića — 6 dana nakon izlijeganja'),
  (stiglic, 3, 'Odvajanje',    '#22c55e', 25, 'Odvajanje od roditelja')
ON CONFLICT DO NOTHING;

-- ============================================================
-- FAZE CIKLUSA — Zeba
-- ============================================================
INSERT INTO faze_ciklusa (vrsta_ptica_id, redoslijed, naziv, boja, broj_dana, opis)
VALUES
  (zeba, 1, 'Inkubacija',   '#f59e0b', 13, 'Sjedenje na jajima'),
  (zeba, 2, 'Prstenovanje', '#3b82f6',  7, 'Prstenovanje pilića'),
  (zeba, 3, 'Odvajanje',    '#22c55e', 25, 'Odvajanje od roditelja')
ON CONFLICT DO NOTHING;

-- ============================================================
-- FAZE CIKLUSA — Zelenac
-- ============================================================
INSERT INTO faze_ciklusa (vrsta_ptica_id, redoslijed, naziv, boja, broj_dana, opis)
VALUES
  (zelenac, 1, 'Inkubacija',   '#f59e0b', 13, 'Sjedenje na jajima'),
  (zelenac, 2, 'Prstenovanje', '#3b82f6',  7, 'Prstenovanje pilića'),
  (zelenac, 3, 'Odvajanje',    '#22c55e', 28, 'Odvajanje od roditelja')
ON CONFLICT DO NOTHING;

END $$;
