-- ============================================================
-- HatchPlan — Import ptica iz Excel/CSV u bazu
-- ============================================================
--
-- KORACI:
--   1. Postavi USER_ID i UZGAJIVACNICA_ID ispod
--   2. Pokreni Korak 1 (kreiraj staging tabelu)
--   3. Unesi podatke u staging tabelu (vidi primjer INSERT-ova)
--      → ili kopiraj iz CSV via Supabase Table Editor
--   4. Pokreni Korak 2 (validacija — provjeri greške!)
--   5. Pokreni Korak 3 (import u ptice tabelu)
--   6. Pokreni Korak 4 (poveži roditelje)
--   7. Pokreni Korak 5 (provjeri rezultate, obriši staging)
--
-- EXCEL TEMPLATE — koloname koje staging tabela očekuje:
--   oznaka            — tvoj interni ID u fajlu (npr. 'P001', 'K-2024-01')
--   naziv             — ime ptice (može biti prazno)
--   spol              — M / Ž / ? (obavezno)
--   vrsta             — naziv vrste TOČNO kao u bazi (npr. 'Kanarinac stasa')
--   prstena_oznaka    — oznaka prstena (npr. '2026-BA-15')
--   prsten_redni_broj — redni broj prstena (broj)
--   godina            — godina uzgoja (broj, npr. 2024)
--   datum_rodjenja    — datum u formatu YYYY-MM-DD (može biti prazno)
--   boja              — opis boje (slobodan tekst)
--   status_evidencije — aktivna / mlada / vanjska / uginula / prodata / poklonjena / ostalo
--   otac_oznaka       — oznaka oca IZ ISTOG FAJLA (mora biti u koloni 'oznaka')
--   majka_oznaka      — oznaka majke IZ ISTOG FAJLA
--   napomena          — slobodna napomena
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- KONFIGURACIJA — postavi ove vrijednosti
-- ──────────────────────────────────────────────────────────
-- Uzgajivačev user_id (iz auth.users):
-- SELECT id, email FROM auth.users;

-- Uzgajivačnicu id (iz uzgajivacnice):
-- SELECT id, naziv FROM uzgajivacnice;

-- ──────────────────────────────────────────────────────────
-- KORAK 1: Kreiranje staging tabele
-- ──────────────────────────────────────────────────────────
DROP TABLE IF EXISTS import_ptice_staging;

CREATE TABLE import_ptice_staging (
    red_broj          SERIAL PRIMARY KEY,
    oznaka            TEXT NOT NULL UNIQUE,   -- tvoj interni ID (za referencu roditelja)
    naziv             TEXT,
    spol              TEXT DEFAULT '?',
    vrsta             TEXT NOT NULL,           -- naziv iz vrsta_ptica tabele
    prstena_oznaka    TEXT,
    prsten_redni_broj INTEGER,
    godina            INTEGER,
    datum_rodjenja    DATE,
    boja              TEXT,
    status_evidencije TEXT DEFAULT 'aktivna',
    otac_oznaka       TEXT,                   -- oznaka oca iz ovog fajla
    majka_oznaka      TEXT,                   -- oznaka majke iz ovog fajla
    napomena          TEXT,
    -- Interni UUID za import (auto-generisan)
    ptica_id UUID DEFAULT uuid_generate_v4()
);

-- ──────────────────────────────────────────────────────────
-- KORAK 1b: Unos podataka u staging tabelu
-- Zamijeni ove primjere sa stvarnim podacima.
-- Možeš i direktno importovati CSV u ovu tabelu
-- via Supabase Dashboard → Table Editor → Import CSV
-- ──────────────────────────────────────────────────────────

/*
INSERT INTO import_ptice_staging
    (oznaka, naziv, spol, vrsta, prstena_oznaka, prsten_redni_broj, godina, datum_rodjenja, boja, status_evidencije, otac_oznaka, majka_oznaka, napomena)
VALUES
    ('P001', 'Žuti šampion', 'M', 'Kanarinac stasa', '2022-BA-15', 15, 2022, '2022-03-10', 'Žuta', 'aktivna', NULL,   NULL,   NULL),
    ('P002', 'Bijelica',     'Ž', 'Kanarinac stasa', '2022-BA-22', 22, 2022, '2022-03-15', 'Bijela', 'aktivna', NULL,   NULL,   NULL),
    ('P003', 'Zlatko',       'M', 'Kanarinac stasa', '2023-BA-05',  5, 2023, '2023-04-01', 'Žuto-bijela', 'aktivna', 'P001', 'P002', 'Sin P001 i P002'),
    ('P004', NULL,           'Ž', 'Štiglić',         'XY-2021-08',  8, 2021, NULL,          NULL,  'vanjska', NULL,   NULL,   'Ptica od Ivana Kovača'),
    ('P005', 'Mladi',        'M', 'Kanarinac stasa', '2024-BA-11', 11, 2024, '2024-04-20', 'Žuta', 'mlada',  'P001', 'P002', NULL);
*/

-- ──────────────────────────────────────────────────────────
-- KORAK 2: Validacija — pokreni i provjeri greške!
-- ──────────────────────────────────────────────────────────

-- 2a. Provjeri da li sve vrste postoje u bazi
SELECT
    s.oznaka,
    s.vrsta AS "Vrsta iz fajla",
    v.naziv AS "Nađena u bazi"
FROM import_ptice_staging s
LEFT JOIN vrsta_ptica v ON lower(v.naziv) = lower(s.vrsta)
WHERE v.id IS NULL;
-- ↑ Ako ovo vrati redove, te vrste NE POSTOJE u bazi.
-- Ili ispravi naziv u staging tabeli, ili dodaj vrstu u bazu.

-- 2b. Provjeri da li svi oci postoje u staging tabeli
SELECT oznaka, otac_oznaka
FROM import_ptice_staging
WHERE otac_oznaka IS NOT NULL
  AND otac_oznaka NOT IN (SELECT oznaka FROM import_ptice_staging);
-- ↑ Ako ovo vrati redove, otac nije u fajlu — dodaj ga ili stavi NULL.

-- 2c. Provjeri da li sve majke postoje u staging tabeli
SELECT oznaka, majka_oznaka
FROM import_ptice_staging
WHERE majka_oznaka IS NOT NULL
  AND majka_oznaka NOT IN (SELECT oznaka FROM import_ptice_staging);

-- 2d. Provjeri nevažeće vrijednosti spola
SELECT oznaka, spol FROM import_ptice_staging
WHERE spol NOT IN ('M', 'Ž', '?');

-- 2e. Provjeri nevažeće vrijednosti status_evidencije
SELECT oznaka, status_evidencije FROM import_ptice_staging
WHERE status_evidencije NOT IN ('aktivna','mlada','vanjska','uginula','prodata','poklonjena','ostalo');

-- 2f. Pregled ukupno
SELECT
    count(*) AS ukupno_ptica,
    count(CASE WHEN otac_oznaka IS NOT NULL THEN 1 END) AS sa_ocem,
    count(CASE WHEN majka_oznaka IS NOT NULL THEN 1 END) AS sa_majkom
FROM import_ptice_staging;

-- ──────────────────────────────────────────────────────────
-- KORAK 3: Import u ptice tabelu (prolaz 1 — bez roditelja)
-- ZAMIJENI 'USER_ID_OVDJE' i 'UZGAJIVACNICA_ID_OVDJE'
-- ──────────────────────────────────────────────────────────

INSERT INTO ptice (
    id,
    user_id,
    uzgajivacnica_id,
    vrsta_ptica_id,
    spol,
    naziv,
    prstena_oznaka,
    prsten_redni_broj,
    godina,
    datum_rodjenja,
    boja,
    status_evidencije,
    napomena,
    created_at,
    updated_at
)
SELECT
    s.ptica_id,
    'USER_ID_OVDJE'::UUID,
    'UZGAJIVACNICA_ID_OVDJE'::UUID,
    v.id,
    COALESCE(s.spol, '?'),
    NULLIF(trim(s.naziv), ''),
    NULLIF(trim(s.prstena_oznaka), ''),
    s.prsten_redni_broj,
    s.godina,
    s.datum_rodjenja,
    NULLIF(trim(s.boja), ''),
    COALESCE(s.status_evidencije, 'aktivna'),
    NULLIF(trim(s.napomena), ''),
    now(),
    now()
FROM import_ptice_staging s
JOIN vrsta_ptica v ON lower(v.naziv) = lower(s.vrsta)
ON CONFLICT (id) DO NOTHING;

-- Provjeri koliko je uneseno
SELECT count(*) AS uneseno_ptica FROM ptice
WHERE user_id = 'USER_ID_OVDJE'::UUID;

-- ──────────────────────────────────────────────────────────
-- KORAK 4: Poveži roditelje (prolaz 2)
-- ──────────────────────────────────────────────────────────

-- Postavi oce
UPDATE ptice p
SET otac_id = otac.ptica_id, updated_at = now()
FROM import_ptice_staging s
JOIN import_ptice_staging otac ON otac.oznaka = s.otac_oznaka
WHERE p.id = s.ptica_id
  AND s.otac_oznaka IS NOT NULL;

-- Postavi majke
UPDATE ptice p
SET majka_id = majka.ptica_id, updated_at = now()
FROM import_ptice_staging s
JOIN import_ptice_staging majka ON majka.oznaka = s.majka_oznaka
WHERE p.id = s.ptica_id
  AND s.majka_oznaka IS NOT NULL;

-- ──────────────────────────────────────────────────────────
-- KORAK 5: Provjera rezultata i čišćenje
-- ──────────────────────────────────────────────────────────

-- Pregled importovanih ptica
SELECT
    p.id,
    s.oznaka,
    p.naziv,
    p.spol,
    v.naziv AS vrsta,
    p.prstena_oznaka,
    p.godina,
    p.status_evidencije,
    otac.naziv AS otac,
    majka.naziv AS majka
FROM import_ptice_staging s
JOIN ptice p ON p.id = s.ptica_id
JOIN vrsta_ptica v ON v.id = p.vrsta_ptica_id
LEFT JOIN ptice otac ON otac.id = p.otac_id
LEFT JOIN ptice majka ON majka.id = p.majka_id
ORDER BY s.red_broj;

-- Ako je sve OK, obriši staging tabelu:
-- DROP TABLE import_ptice_staging;

-- Ako nešto nije uredu i želiš poništiti cijeli import:
-- DELETE FROM ptice WHERE user_id = 'USER_ID_OVDJE'::UUID
--   AND id IN (SELECT ptica_id FROM import_ptice_staging);
-- DROP TABLE import_ptice_staging;
