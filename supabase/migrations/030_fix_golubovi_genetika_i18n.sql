-- Migracija 030: Ispravi golubovi genetička polja u genetika_polja_i18n
-- Haiku je ubacio golubova polja sa vrsta_grupa='kanarinac_finke' (pogrešno)
-- i stil_leta kao stars/ocjena umjesto tags/genetika

-- 1. Obriši pokvarene zapise za golubove (pogrešna grupa ili tip)
DELETE FROM genetika_polja_i18n
WHERE polje_kljuc IN (
  'boja_perja', 'tip_oka', 'specijalizacija',
  'stil_leta', 'ocjena_orijentacija', 'ocjena_konstitucija'
)
AND vrsta_grupa = 'kanarinac_finke';

-- 2. Ubaci ispravne golubovi zapise koji odgovaraju GENETIKA_SHEME.golubovi
INSERT INTO genetika_polja_i18n (
  id, polje_kljuc, vrsta_grupa, tip, sekcija, redoslijed,
  nazivi_jezicima, opcije, opcije_jezicima, opisi_jezicima, placeholder_jezicima
) VALUES
  (gen_random_uuid(), 'boja_perja', 'golubovi', 'select', 'genetika', 1,
    '{"bs": "Osnovna boja perja"}'::jsonb,
    '["", "Plava kova", "Plava prugasta", "Plava", "Crvena", "Žuta", "Bijela", "Crna", "Mješana"]'::jsonb,
    '{}'::jsonb, '{}'::jsonb, '{}'::jsonb),

  (gen_random_uuid(), 'tip_oka', 'golubovi', 'select', 'genetika', 2,
    '{"bs": "Tip oka (Eye sign)"}'::jsonb,
    '["", "Gravel", "Bull", "Yellow/Rich", "Pearl", "Žuto"]'::jsonb,
    '{}'::jsonb, '{}'::jsonb, '{}'::jsonb),

  (gen_random_uuid(), 'specijalizacija', 'golubovi', 'select', 'genetika', 3,
    '{"bs": "Specijalizacija pruge"}'::jsonb,
    '["", "Kratke staze / Brzina", "Srednje staze", "Duge staze / Maraton", "Sve pruge"]'::jsonb,
    '{}'::jsonb, '{}'::jsonb, '{}'::jsonb),

  (gen_random_uuid(), 'stil_leta', 'golubovi', 'tags', 'genetika', 4,
    '{"bs": "Stil letenja"}'::jsonb,
    '["Samostalan letač", "Prati jato", "Otporan na vjetar", "Brzi start", "Izdržljiv", "Dobar u kiši"]'::jsonb,
    '{}'::jsonb, '{}'::jsonb, '{}'::jsonb),

  (gen_random_uuid(), 'ocjena_orijentacija', 'golubovi', 'stars', 'ocjena', 5,
    '{"bs": "Sposobnost orijentacije"}'::jsonb,
    '[]'::jsonb, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb),

  (gen_random_uuid(), 'ocjena_konstitucija', 'golubovi', 'stars', 'ocjena', 6,
    '{"bs": "Stav i konstitucija"}'::jsonb,
    '[]'::jsonb, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb),

-- 3. Dodaj i18n zapise za custom polja koja postoje u custom_fields.genetika_polja
--    (Vrsta pruge, Linija, Porikelo, Zvjezdice, Broj)
  (gen_random_uuid(), 'vrsta_pruge', 'golubovi', 'select', 'genetika', 7,
    '{"bs": "Vrsta pruge"}'::jsonb,
    '["Kratka pruga", "Srednja pruga", "Duga pruga", "Allround"]'::jsonb,
    '{}'::jsonb, '{}'::jsonb, '{}'::jsonb),

  (gen_random_uuid(), 'linija', 'golubovi', 'tags', 'genetika', 8,
    '{"bs": "Linija tagovi"}'::jsonb,
    '["Van Loon", "Janssen", "Gaby"]'::jsonb,
    '{}'::jsonb, '{}'::jsonb, '{}'::jsonb),

  (gen_random_uuid(), 'porikelo', 'golubovi', 'text', 'genetika', 9,
    '{"bs": "Porijeklo"}'::jsonb,
    '[]'::jsonb, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb),

  (gen_random_uuid(), 'zvjezdice', 'golubovi', 'stars', 'genetika', 10,
    '{"bs": "Zvjezdice"}'::jsonb,
    '[]'::jsonb, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb),

  (gen_random_uuid(), 'broj', 'golubovi', 'number', 'genetika', 11,
    '{"bs": "Broj"}'::jsonb,
    '[]'::jsonb, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb);
