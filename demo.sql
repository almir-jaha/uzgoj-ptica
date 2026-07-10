-- ============================================================
-- DEMO SEED — HatchPlan
-- User: almir_jahic@proton.me
-- ID: 69fcb4dd-1bc7-407b-b7c5-018ddba7c2af
-- Dvije uzgajivačnice: "Demo ptice" (kanarinac pjevač) i "Demo golubovi"
-- Svaka: 20 ptica (10M/10Ž), tekuća sezona sa 10 kaveza, svi kavezi
-- popunjeni aktivnim parom/ciklusom (nema praznih).
--
-- Skripta je idempotentna — briše prethodne demo podatke ovog
-- korisnika (sezona/kavezi/parovi/ciklusi/aktivnosti/ptice/uzgajivacnice)
-- prije nego ih ponovo kreira, pa se može sigurno ponovo pokrenuti.
-- ============================================================

DO $$
DECLARE
  demo_user UUID := '69fcb4dd-1bc7-407b-b7c5-018ddba7c2af';

  -- Vrste ptica (već u bazi iz seed 002) — dinamički lookup po nazivu
  kan_boja UUID := (SELECT id FROM vrsta_ptica WHERE naziv = 'Kanarinac pjevač' LIMIT 1);
  golub    UUID := (SELECT id FROM vrsta_ptica WHERE naziv ILIKE '%golub%' LIMIT 1);

  uz_ptice UUID := gen_random_uuid();
  uz_golub UUID := gen_random_uuid();

  sezona_kan UUID := gen_random_uuid();
  sezona_gol UUID := gen_random_uuid();

  faza_kan_ink UUID; faza_kan_prs UUID; faza_kan_odv UUID;
  faza_gol_ink UUID; faza_gol_prs UUID; faza_gol_odv UUID;

  kan_m_imena TEXT[] := ARRAY['Zlatko','Žuti','Pjevač','Sunce','Limar','Kralj','Vjetar','Plavi','Iskra','Feniks'];
  kan_f_imena TEXT[] := ARRAY['Luna','Bijela','Mala','Šarena','Zlatica','Nina','Cvijeta','Perka','Zora','Vila'];
  gol_m_imena TEXT[] := ARRAY['Sivi','Bijeli','Brzi','Šarac','Galeb','Kralj','Munja','Vjetar','Oblak','Soko'];
  gol_f_imena TEXT[] := ARRAY['Snježna','Siva','Laka','Perla','Vila','Zora','Dama','Bela','Nina','Ljepotica'];

  kan_m_ids UUID[] := ARRAY[]::UUID[];
  kan_f_ids UUID[] := ARRAY[]::UUID[];
  gol_m_ids UUID[] := ARRAY[]::UUID[];
  gol_f_ids UUID[] := ARRAY[]::UUID[];

  kan_kavez_ids UUID[] := ARRAY[]::UUID[];
  gol_kavez_ids UUID[] := ARRAY[]::UUID[];

  new_id UUID;
  par_id UUID;
  ciklus_id UUID;
  i INT;
  offset_dana INT;

BEGIN

-- ============================================================
-- ČIŠĆENJE — prethodni demo podaci ovog korisnika
-- ============================================================
DELETE FROM sezona WHERE user_id = demo_user;         -- kaskadno: kavezi, parovi, ciklusi, aktivnosti
DELETE FROM ptice WHERE user_id = demo_user;
DELETE FROM uzgajivacnice WHERE user_id = demo_user;

-- ============================================================
-- UZGAJIVAČNICE
-- ============================================================
INSERT INTO uzgajivacnice (id, user_id, naziv) VALUES
  (uz_ptice, demo_user, 'Demo ptice'),
  (uz_golub, demo_user, 'Demo golubovi');

-- ============================================================
-- SEZONE — tekuća sezona po uzgajivačnici
-- ============================================================
INSERT INTO sezona (id, user_id, uzgajivacnica_id, godina, naziv, broj_kaveza, datum_pocetka, status) VALUES
  (sezona_kan, demo_user, uz_ptice, 2026, 'Sezona 2026', 10, '2026-01-15', 'aktiva'),
  (sezona_gol, demo_user, uz_golub, 2026, 'Sezona 2026', 10, '2026-01-15', 'aktiva');

-- ============================================================
-- FAZE — dohvati ID-eve
-- ============================================================
SELECT id INTO faza_kan_ink FROM faze_ciklusa WHERE vrsta_ptica_id = kan_boja AND redoslijed = 1;
SELECT id INTO faza_kan_prs FROM faze_ciklusa WHERE vrsta_ptica_id = kan_boja AND redoslijed = 2;
SELECT id INTO faza_kan_odv FROM faze_ciklusa WHERE vrsta_ptica_id = kan_boja AND redoslijed = 3;

SELECT id INTO faza_gol_ink FROM faze_ciklusa WHERE vrsta_ptica_id = golub AND redoslijed = 1;
SELECT id INTO faza_gol_prs FROM faze_ciklusa WHERE vrsta_ptica_id = golub AND redoslijed = 2;
SELECT id INTO faza_gol_odv FROM faze_ciklusa WHERE vrsta_ptica_id = golub AND redoslijed = 3;

-- ============================================================
-- PTICE — Demo ptice (kanarinac pjevač): 10 mužjaka + 10 ženki
-- ============================================================
FOR i IN 1..10 LOOP
  new_id := gen_random_uuid();
  INSERT INTO ptice (id, user_id, uzgajivacnica_id, vrsta_ptica_id, spol, naziv, prstena_oznaka)
  VALUES (new_id, demo_user, uz_ptice, kan_boja, 'M', kan_m_imena[i], 'BA-2026-' || lpad(i::text, 3, '0'));
  kan_m_ids := array_append(kan_m_ids, new_id);

  new_id := gen_random_uuid();
  INSERT INTO ptice (id, user_id, uzgajivacnica_id, vrsta_ptica_id, spol, naziv, prstena_oznaka)
  VALUES (new_id, demo_user, uz_ptice, kan_boja, 'Ž', kan_f_imena[i], 'BA-2026-' || lpad((i + 10)::text, 3, '0'));
  kan_f_ids := array_append(kan_f_ids, new_id);
END LOOP;

-- ============================================================
-- PTICE — Demo golubovi: 10 mužjaka + 10 ženki
-- ============================================================
FOR i IN 1..10 LOOP
  new_id := gen_random_uuid();
  INSERT INTO ptice (id, user_id, uzgajivacnica_id, vrsta_ptica_id, spol, naziv, prstena_oznaka)
  VALUES (new_id, demo_user, uz_golub, golub, 'M', gol_m_imena[i], 'GO-2026-' || lpad(i::text, 3, '0'));
  gol_m_ids := array_append(gol_m_ids, new_id);

  new_id := gen_random_uuid();
  INSERT INTO ptice (id, user_id, uzgajivacnica_id, vrsta_ptica_id, spol, naziv, prstena_oznaka)
  VALUES (new_id, demo_user, uz_golub, golub, 'Ž', gol_f_imena[i], 'GO-2026-' || lpad((i + 10)::text, 3, '0'));
  gol_f_ids := array_append(gol_f_ids, new_id);
END LOOP;

-- ============================================================
-- KAVEZI — 10 po sezoni, svi popunjeni (status aktivan, jedan alarm za demo)
-- ============================================================
FOR i IN 1..10 LOOP
  new_id := gen_random_uuid();
  INSERT INTO kavezi (id, sezona_id, user_id, oznaka, status, updated_from)
  VALUES (new_id, sezona_kan, demo_user, i, CASE WHEN i = 5 THEN 'alarm' ELSE 'aktivan' END, 0);
  kan_kavez_ids := array_append(kan_kavez_ids, new_id);
END LOOP;

FOR i IN 1..10 LOOP
  new_id := gen_random_uuid();
  INSERT INTO kavezi (id, sezona_id, user_id, oznaka, status, updated_from)
  VALUES (new_id, sezona_gol, demo_user, i, CASE WHEN i = 5 THEN 'alarm' ELSE 'aktivan' END, 0);
  gol_kavez_ids := array_append(gol_kavez_ids, new_id);
END LOOP;

-- ============================================================
-- PAROVI + CIKLUSI + AKTIVNOSTI — Demo ptice (10 parova, svaki kavez popunjen)
-- ============================================================
FOR i IN 1..10 LOOP
  par_id := gen_random_uuid();
  INSERT INTO parovi (id, sezona_id, ptica1_id, ptica2_id, status, datum_formiranja)
  VALUES (par_id, sezona_kan, kan_m_ids[i], kan_f_ids[i], 'aktivan', '2026-01-20'::date + (i * INTERVAL '2 days'));

  ciklus_id := gen_random_uuid();

  IF i = 5 THEN
    -- Alarm slučaj: aktivnost je zakasnila
    INSERT INTO ciklusi (id, par_id, kavez_id, sezona_id, vrsta_ptica_id, datum_prvog_jajeta, status, broj_jaja)
    VALUES (ciklus_id, par_id, kan_kavez_ids[i], sezona_kan, kan_boja, CURRENT_DATE - 14, 'aktivan', 4);
    INSERT INTO aktivnosti_ciklusa (ciklus_id, faza_id, potreban_datum) VALUES
      (ciklus_id, faza_kan_ink, CURRENT_DATE - 2),
      (ciklus_id, faza_kan_prs, CURRENT_DATE - 2 + 7),
      (ciklus_id, faza_kan_odv, CURRENT_DATE - 2 + 37);
  ELSE
    offset_dana := 3 + (i * 2); -- 5,7,9,11,(15),17,19,21,23 dana — različite faze za demo
    INSERT INTO ciklusi (id, par_id, kavez_id, sezona_id, vrsta_ptica_id, datum_prvog_jajeta, status, broj_jaja, broj_izlijegljenih)
    VALUES (
      ciklus_id, par_id, kan_kavez_ids[i], sezona_kan, kan_boja, CURRENT_DATE - offset_dana, 'aktivan',
      3 + (i % 3),
      CASE WHEN offset_dana >= 20 THEN 3 + (i % 2) ELSE NULL END
    );
    INSERT INTO aktivnosti_ciklusa (ciklus_id, faza_id, datum, potreban_datum) VALUES
      (ciklus_id, faza_kan_ink, CASE WHEN offset_dana >= 13 THEN (CURRENT_DATE - offset_dana + 13) END, CURRENT_DATE - offset_dana + 13),
      (ciklus_id, faza_kan_prs, CASE WHEN offset_dana >= 20 THEN (CURRENT_DATE - offset_dana + 20) END, CURRENT_DATE - offset_dana + 20),
      (ciklus_id, faza_kan_odv, CASE WHEN offset_dana >= 50 THEN (CURRENT_DATE - offset_dana + 50) END, CURRENT_DATE - offset_dana + 50);
  END IF;
END LOOP;

-- ============================================================
-- PAROVI + CIKLUSI + AKTIVNOSTI — Demo golubovi (10 parova, svaki kavez popunjen)
-- ============================================================
FOR i IN 1..10 LOOP
  par_id := gen_random_uuid();
  INSERT INTO parovi (id, sezona_id, ptica1_id, ptica2_id, status, datum_formiranja)
  VALUES (par_id, sezona_gol, gol_m_ids[i], gol_f_ids[i], 'aktivan', '2026-01-20'::date + (i * INTERVAL '2 days'));

  ciklus_id := gen_random_uuid();

  IF i = 5 THEN
    INSERT INTO ciklusi (id, par_id, kavez_id, sezona_id, vrsta_ptica_id, datum_prvog_jajeta, status, broj_jaja)
    VALUES (ciklus_id, par_id, gol_kavez_ids[i], sezona_gol, golub, CURRENT_DATE - 18, 'aktivan', 2);
    INSERT INTO aktivnosti_ciklusa (ciklus_id, faza_id, potreban_datum) VALUES
      (ciklus_id, faza_gol_ink, CURRENT_DATE - 3),
      (ciklus_id, faza_gol_prs, CURRENT_DATE - 3 + 7),
      (ciklus_id, faza_gol_odv, CURRENT_DATE - 3 + 37);
  ELSE
    offset_dana := 4 + (i * 2); -- 6,8,10,12,(16),18,20,22,24 dana
    INSERT INTO ciklusi (id, par_id, kavez_id, sezona_id, vrsta_ptica_id, datum_prvog_jajeta, status, broj_jaja, broj_izlijegljenih)
    VALUES (
      ciklus_id, par_id, gol_kavez_ids[i], sezona_gol, golub, CURRENT_DATE - offset_dana, 'aktivan',
      2,
      CASE WHEN offset_dana >= 20 THEN 2 ELSE NULL END
    );
    INSERT INTO aktivnosti_ciklusa (ciklus_id, faza_id, datum, potreban_datum) VALUES
      (ciklus_id, faza_gol_ink, CASE WHEN offset_dana >= 17 THEN (CURRENT_DATE - offset_dana + 17) END, CURRENT_DATE - offset_dana + 17),
      (ciklus_id, faza_gol_prs, CASE WHEN offset_dana >= 24 THEN (CURRENT_DATE - offset_dana + 24) END, CURRENT_DATE - offset_dana + 24),
      (ciklus_id, faza_gol_odv, CASE WHEN offset_dana >= 54 THEN (CURRENT_DATE - offset_dana + 54) END, CURRENT_DATE - offset_dana + 54);
  END IF;
END LOOP;

RAISE NOTICE 'Demo podaci uspješno ubačeni!';
RAISE NOTICE 'Demo ptice — uzgajivačnica: %, sezona: %', uz_ptice, sezona_kan;
RAISE NOTICE 'Demo golubovi — uzgajivačnica: %, sezona: %', uz_golub, sezona_gol;

END $$;
