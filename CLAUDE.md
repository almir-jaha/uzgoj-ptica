# HatchPlan — Uzgoj ptica PWA

SvelteKit PWA za upravljanje uzgojem ptica (kavezi, parovi, ciklusi, zdravlje, genetika, rodovnik). Radi i offline (Dexie.js IndexedDB), sinhronizira kad ima mreže.

## Stack

- **Frontend:** Svelte 4 (ne Svelte 5), SvelteKit, Skeleton UI v2, Tailwind CSS v3
- **Backend:** Supabase (PostgreSQL, Auth, Realtime, Storage)
- **Offline:** Dexie.js (IndexedDB), offline queue za sync
- **Deploy:** Vercel (GitHub → auto-deploy), Supabase cloud (linked)

## Svelte 4 — kritična pravila

- `{@const}` mora biti **direktno dijete** `{#if}`, `{#each}` itd. — ne unutar `<div>`
- TypeScript `as` cast **nije dozvoljen** u Svelte template izrazima → koristiti `?.` optional chaining
- `$:` reaktivni blokovi prate sve varijable koje se **čitaju** unutar bloka — varijable kojima se samo dodjeljuje vrijednost nisu zavisnosti
- `bind:this={ref}` na Svelte komponenti daje instancu s exportovanim funkcijama
- `??` i `||` bez zagrada daju TypeScript upozorenja — uvijek koristiti zagrade: `(a ?? b) || c`

## Supabase — RLS napomene

- `auth.uid()` — uvijek pouzdan u JWT, nikad null za prijavljene korisnike
- `auth.email()` — može biti null u nekim JWT konfiguracijama, **ne koristiti u RLS**
- `SELECT email FROM auth.users WHERE id = auth.uid()` — daje "permission denied for table users" za authenticated role
- Silent UPDATE fail: kad RLS USING klauzula ne odgovara, Supabase vraća HTTP 204 bez greške ali 0 redova — dodati `.select('id')` nakon `.update()` i provjeriti `data.length`
- Admin UUID: `f0b63962-eef0-45e0-83d7-77282a6ef68d` (almir.jaha@gmail.com)
- `supabase db push --linked` — aplicira sve migracije; za pojedinačnu koristiti `supabase db query --linked --file migration.sql`

## Ključne datoteke

| Datoteka | Opis |
|---|---|
| `src/lib/db/schema.ts` | TypeScript interfejsi za sve DB tabele |
| `src/lib/db/dexie.ts` | Dexie baza, offline helpers |
| `src/lib/stores/auth.ts` | session, user, isAuthenticated |
| `src/lib/stores/admin.ts` | Admin CRUD (vrsta_ptica, genetika_polja_i18n) |
| `src/lib/stores/genetikaI18n.ts` | Derived stores: genetikaLabels, genetikaOpcijeDisplay, genetikaPlaceholderi |
| `src/lib/i18n/index.ts` | `t` store, `locale` store, `LANGUAGES` metadata |
| `src/lib/i18n/locale.ts` | Upravljanje jezikom, localStorage persistence |
| `src/lib/utils/genetika-schema.ts` | `getSchemaForVrsta()` — čita custom_fields.genetika_polja, fallback na GENETIKA_SHEME |
| `src/routes/admin/+page.svelte` | Admin panel (vrste, korisnici, genetička polja, prijedlozi prijevoda) |
| `src/routes/prijevodi/+page.svelte` | Centralna stranica za community prijevode — 3 sekcije (UI termini, faze, vrste) |
| `src/lib/stores/prijevodPrijedlozi.ts` | Community prijevodi — submitPrijedlog, loadSviPrijedlozi, prihvatiPrijedlog, odbijPrijedlog |
| `src/lib/server/i18nFileUpdater.ts` | Server-only — upisuje prihvaćeni i18n prijevod direktno u `src/lib/i18n/<jezik>.ts` |
| `src/lib/i18n/flatten.ts` | `flattenTranslations()` — ugniježđeni i18n objekat → ravna dot-path mapa |

## DB shema — migrations

```
001 create_schema          — osnovne tabele
002 seed_vrsta_ptica       — 6 vrsta + faze ciklusa
003-017                    — razne nadogradnje (push notif, prsten, rodovnik, zdravlje...)
018 zdravlje               — zdravstveni dnevnik
019-020 sekcije            — sekcije uzgajivačnice
021-022 zdravlje_sekcija   — sezona/sekcija na zdravlje
023 vrsta_ptica_i18n       — JSONB nazivi_jezicima na vrsta_ptica
024 genetika_polja_i18n    — nova tabela za genetička polja sa prevodima
025 seed_genetika_polja    — početni podaci (kanarinac, golubovi)
026 test_i18n_complete     — provjera i indeksi
027 fix_genetika_i18n_rls  — RLS policy za genetika_polja_i18n
028 faze_ciklusa_i18n      — JSONB nazivi_jezicima na faze_ciklusa
029 genetika_opcije_i18n   — opcije_jezicima kolona na genetika_polja_i18n
030 fix_golubovi            — ispravka Haiku greške (pogrešni vrsta_grupa i tip)
031 fix_rls_email          — zamjena subquery sa auth.email() (NEUSPJEŠNO)
032 fix_rls_uid            — auth.uid() = admin UUID (potvrđen na remote bazi 2026-07-06)
033 prijevod_prijedlozi    — community prijevodi (potvrđena na remote bazi 2026-07-07)
034 prijevod_prijedlozi_izvor — izvor/izvor_id kolone: 'i18n' | 'faza_ciklusa' | 'vrsta_ptica' (potvrđena 2026-07-07)
```

## Višejezičnost (i18n) — 17 jezika

**ZAVRŠENO.** Commit `4d98784`.

- `src/lib/i18n/` — BS (referentni), HR, EN, DE, ES, FR, IT, NL, PL, BG, HU, RO, PT, SL, SR, TR, ZH
- `$t` derived store — automatski osvježava pri promjeni jezika
- `JezikSelector.svelte` — integrisan u layout (desktop + mobile)
- **Svih 17 jezika su potpuno prevedena** (potvrđeno 2026-07-07) — nema više EN-placeholder tekstova ni u jednom jeziku. Preostala poklapanja sa EN vrijednošću (npr. "Total", "Cage(s)", "Pedigree", "Mutation") su legitimne jezičke koincidencije, ne propusti

### i18n za DB zapise (DJELIMIČNO)

- **Vrste ptica:** `vrsta_ptica.nazivi_jezicima` JSONB — radi ✅
- **Faze ciklusa:** `faze_ciklusa.nazivi_jezicima` JSONB — radi ✅ (KavezKartica, aktivnosti)
- **Genetička polja — nazivi:** `genetika_polja_i18n.nazivi_jezicima` — derived store `genetikaLabels` ✅
- **Genetička polja — opcije:** `genetika_polja_i18n.opcije_jezicima` — derived store `genetikaOpcijeDisplay` ✅
- **Genetička polja — placeholderi:** `genetika_polja_i18n.placeholder_jezicima` — derived store `genetikaPlaceholderi` ✅

### Audit i18n pokrivenosti po DB tabelama — ZAVRŠENO (2026-07-09)

Pregledane sve tabele u `schema.ts` (`ciklusi`, `istorija`, `kavezi`, `parovi`, `ptice`, `sekcije`, `sezona`, `uzgajivacnice`, `vrsta_ptica`, `zdravlje`, `faze_ciklusa`) radi provjere koje kolone nose tekst vidljiv korisniku i da li im treba `nazivi_jezicima`-stil i18n. Zaključak:

- **`vrsta_ptica.naziv`** i **`faze_ciklusa.naziv`** su jedine kolone kojima i18n treba i koje ga imaju — dijeljena referentna/taksonomska data, ista za sve korisnike aplikacije. Već potpuno riješeno (vidi gore).
- **`ciklusi`, `kavezi`, `parovi`, `ptice`, `sekcije`, `sezona`, `uzgajivacnice`** — sve tekstualne kolone (`napomena`, `opis`, `boja`, `rezultati`, `adresa`, `telefon`, `naziv` sekcije/sezone/ptice...) su **lični unosi konkretnog korisnika o njegovim vlastitim podacima**, ne dijeljeni termini koje bi community prevodio — `nazivi_jezicima` pattern im ne odgovara ni teorijski.
- **`istorija`** — tabela postoji od migracije 001, ali se **trenutno nigdje ne koristi u UI** (nema čitanja ni pisanja u aktivnom kodu). Ako se ikad implementira "pregled historije", `data_snapshot` treba čuvati pune `nazivi_jezicima` JSONB-ove iz izvora (ne već razriješen tekst) da bi historijski zapisi mogli biti lokalizovani naknadno.
- Enumi (`status` na ciklusima/kavezima/parovima, `status_evidencije` na pticama, `tip` na zdravlju) ne trebaju DB i18n — rješavaju se statički kroz `$t`, što je i potvrđeno kao ispravan pattern.
- Nekoliko kolona je otkriveno kao potpuno neaktivno/mrtvo (nikad se ne čita/piše u UI): `Kavez.napomena`, `Uzgajivacnica.napomena`, `VrstaPtica.naziv_latinskih_imena`, `VrstaPtica.podatci_inkubacija`.

**Usput pronađeni i popravljeni propusti** (hardkodirani BS stringovi i jedan funkcionalni bug, van same DB i18n teme):

- `KavezKartica.svelte` — hardkodiran "🥚 Čeka datum prvog jajeta" → `$t.kavezi.cekaDatumPrvogJajeta` (commit `6b27ea3`)
- `ptice/+page.svelte` — `STATUS_OPCIJE` (labeli za `status_evidencije`) hardkodiran BS → `$t.statusPtica.kratko.*`, reaktivan (commit `82c22c4`)
- `sezone` — default naziv sezone se snimao kao prevedeni tekst (`$t.sezona.nazivPlaceholder`) dok je prikaz poredio sa hardkodiranim BS obrascem `` `Sezona ${godina}` `` → korisnici na drugim jezicima su vidjeli suvišan/pogrešan badge uz naslov sezone. Ispravljeno: prazan naziv se sad snima kao `undefined` (commit `3cd7724`)
- `stores/zdravlje.ts` — `TIP_OPCIJE` (tip zdravstvenog zapisa: bolest/preventiva/vakcinacija/zapažanje/ostalo) hardkodiran BS → `tipOpcije` derived store, `$t.zdravlje.tip.*` (commit `150c9d4`)

Preostala poznata mjesta sa sličnim hardkodiranim stringovima (nisu popravljena, niska prioritet): `rodovnik-pdf.ts:198` i vjerovatno ostala 4 rodovnik PDF templata (`Tel:` prefiks mimo `rodovnikI18n` sistema); `admin/+page.svelte:753` (`vrsta.grupa` sirov prikaz) — admin-only, jedan BS-govoreći korisnik, nizak prioritet.

## Genetička polja — arhitektura

Dva sistema (oba u upotrebi):

1. **Stari sistem:** `vrsta_ptica.custom_fields.genetika_polja` (JSON na vrsta_ptica tabeli)
   - `getSchemaForVrsta()` u `genetika-schema.ts` čita ovdje prvo, pa fallback na `GENETIKA_SHEME`
   - Ptičije forme i dalje koriste ovaj sistem za prikaz

2. **Novi sistem:** tabela `genetika_polja_i18n`
   - Admin panel upravlja ovim
   - Stores u `genetikaI18n.ts` učitavaju pri prijavi, koriste se za prevode
   - Golubovi: 11 polja, kanarinac/finke: 7 polja

## Rodovnik PDF — 5 templata (ZAVRŠENO)

Svi templati u `src/lib/pdf/`. Jezici: BS/HR/EN. Paketi: `pdfmake`, `qrcode`.

## Javna stranica ptice — `/ptica/[id]` (ZAVRŠENO)

Samostalna, potpuno prevedena (17 jezika, `pticaJavno` i18n namespace) javna stranica dostupna preko QR koda iz rodovnik PDF-a (`buildQrUrl()` u `rodovnik-shared.ts`) i preko 📤 Podijeli dugmeta na `/ptice` i na samoj stranici. `ssr = false`, RLS: anon SELECT na `ptice`/`uzgajivacnice` (migracije 009, 011). `+layout.svelte` isključuje `/ptica/` rute iz AppShell-a bez obzira na auth stanje (spriječava dupli header) i ima svoj `JezikSelector`.

### Bug: Service Worker keš zaključavao neuspješne odgovore (RIJEŠENO 2026-07-09)

`src/sw.ts` — `NetworkFirst` keš za `*.supabase.co` je uključivao status `0` (opaque/CORS-blokiran/prekinut request) u `CacheableResponsePlugin` statuse. Ako se to jednom desi (npr. u Firefoxu), keširan je kao "uspješan" na 24h — svi naredni posjetioci su dobijali prazan/pogrešan odgovor umjesto svježeg iz baze, iako je RLS ispravan (potvrđeno direktnim REST pozivom mimo browsera). Fix: uklonjen status `0`, keš prihvata samo prave `200` odgovore. Ako se ovakav bug ikad ponovi za bilo koju stranicu — prvo posumnjaj na `sw.ts` keš, ne na RLS/bazu; deblokada za pogođenog korisnika: DevTools → Application → Service Workers → Unregister + Clear site data.

## Admin panel

Rute: `/admin`. Dostupan samo za `almir.jaha@gmail.com`.

Sekcije:
- Vrste ptica (CRUD + prevodi naziva)
- Korisnici (tier management)
- Genetička polja i prevodi (CRUD + i18n za sva 17 jezika)
- Prijedlozi prijevoda (community — Prihvati/Odbij pending prijedloge)

Komponente:
- `NovoGenetikaPoljeModal.svelte` — create/edit genetičkog polja
- `GenetikaPoljeI18nForm.svelte` — forma za 17 jezičnih prevoda (naziv, opis, placeholder, opcije)

## Community prijevodi (ZAVRŠENO, testirano lokalno 2026-07-07)

**Napomena:** prvobitni pokušaj (💬 ikona ožičena inline po cijeloj aplikaciji preko `TranslatableLabel.svelte`) je napušten — previše mjesta gdje `$t.xxx` strukturalno ne može nositi komponentu (`<svelte:head><title>`, HTML atributi, JS dodjele, data nizovi, nav traka) i previše rizika od loma layouta. Zamijenjeno centralnom `/prijevodi` stranicom.

Ruta `/prijevodi` — pretraga na vrhu (filtrira sve 3 sekcije uživo po ključu/BS originalu/trenutnom prijevodu, prikazuje broj rezultata i "no results" stanje) + 3 sekcije za korisnikov trenutni jezik (`$locale`):
1. **UI termini** — `flattenTranslations()` (`src/lib/i18n/flatten.ts`) pretvara `$t` (trenutni jezik) i `bs` (original) u ravne dot-path mape (`{ 'ptice.title': 'Ptice' }`); tabela: ključ | trenutni prijevod | 💬
2. **Faze ciklusa** — direktan `supabase.from('faze_ciklusa').select('*')`; tabela: naziv (BS) | `nazivi_jezicima[locale] ?? naziv` | 💬
3. **Vrste ptica** — direktan `supabase.from('vrsta_ptica').select('*')`; tabela: naziv (BS) | `nazivi_jezicima[locale] ?? naziv` | 💬

Klik na 💬 otvara `PrijedlogModal.svelte` (BS original, trenutni prijevod, prijedlog, komentar) → `submitPrijedlog()`.

- **Tabela:** `prijevod_prijedlozi` (migracija 033 + 034) — `termin_kljuc`, `izvor` (`'i18n'`/`'faza_ciklusa'`/`'vrsta_ptica'`), `izvor_id` (null za i18n, UUID reda za bazu), `jezik`, `trenutni_prijevod`, `prijedlog`, `komentar?`, `user_id`, `status`
- **RLS:** korisnik INSERT/SELECT samo vlastite; admin FOR ALL preko fiksnog admin UUID-a (isti pattern kao `genetika_polja_i18n`, migracija 032)
- **Admin prihvatanje grana se po `izvor`u** (`prihvatiPrijedlog()` u `prijevodPrijedlozi.ts`):
  - `'i18n'` → `POST /admin/prijevod-prijedlozi` (`+server.ts`) → `i18nFileUpdater.ts` upisuje direktno u `src/lib/i18n/<jezik>.ts`. **Radi samo lokalno (`npm run dev`)** — endpoint provjerava `dev` iz `$app/environment`, vraća 503 na produkciji (Vercel fajl-sistem je read-only/efemeran). Workflow: pokreni lokalno → prihvati → `git diff` pokaže izmjenu → commit + push
  - `'faza_ciklusa'` → `updateFazaNazivJezik()` (admin.ts) — merge-update jednog jezika u `nazivi_jezicima` JSONB preko Supabase, **radi svugdje** (i na Vercelu), nema fajl-write
  - `'vrsta_ptica'` → `updateVrstaNazivJezik()` (admin.ts) — isto, `vrsta_ptica.nazivi_jezicima`
- **Auth za file-write endpoint:** klijent šalje `Authorization: Bearer <access_token>`; server verifikuje preko `supabase.auth.getUser(token)` + `isAdmin(email)` (nema service-role ključa, ne treba)
- **Admin pregled prijedloga:** `PregledPrijedlogaModal.svelte` (commit `955a676`) — dugme "🔍 Pregledaj" na svakoj pending kartici u admin panelu otvara modal sa BS originalom (izveden preko `flattenTranslations()` za `izvor: 'i18n'`, ili direktno `termin_kljuc` za bazu), trenutnim prijevodom, prijedlogom i punim komentarom korisnika, plus Prihvati/Odbij dugmad koja zatvaraju modal nakon uspješne akcije

## Demo podaci — `demo.sql` (za snimanje video uputstva korisnicima)

Fajl `demo.sql` (root, **untracked u gitu**) — idempotentna PL/pgSQL skripta za demo korisnika, pokreće se preko `supabase db query --linked --file demo.sql`.

- **Demo korisnik:** `almir_jahic@proton.me`, UUID `69fcb4dd-1bc7-407b-b7c5-018ddba7c2af` (već postoji u `auth.users`, kreiran 2026-05-29 — skripta ga NE kreira, samo puni podatke)
- **Dvije uzgajivačnice:** "Demo ptice" (vrsta = Kanarinac pjevač, `vrsta_ptica.id` dinamički lookup po nazivu, **ne** hardkodiran UUID) i "Demo golubovi"
- **Svaka uzgajivačnica:** 20 ptica (10M/10Ž), tekuća sezona ("Sezona 2026", status `aktiva`) sa 10 kaveza — **svi kavezi popunjeni** aktivnim parom/ciklusom (9× status `aktivan`, 1× `alarm` za demo te funkcije), nema praznih
- Skripta na početku briše prethodne demo podatke ovog korisnika (`sezona`/`ptice`/`uzgajivacnice`, kaskadno i `kavezi`/`parovi`/`ciklusi`/`aktivnosti_ciklusa`) — sigurno se može ponovo pokrenuti prije svakog novog snimanja da se resetuje stanje

**Poznati propusti u originalnoj verziji skripte (ispravljeno 2026-07-09), zapamtiti za slične seed skripte ubuduće:**
1. Hardkodiran UUID za vrstu umjesto dinamičkog lookup-a po nazivu — lako se pukne kad se ID-evi razlikuju po okruženju/vremenu. Uvijek koristiti `(SELECT id FROM vrsta_ptica WHERE naziv = '...' LIMIT 1)`.
2. `(CURRENT_DATE - N + X)::text` cast na `aktivnosti_ciklusa.datum` (kolona je `DATE`) puca sa `column "datum" is of type date but expression is of type text` kad se u istom `UNION ALL`/`VALUES` miješa sa `NULL` — nikad ne castati datumski izraz na `::text` kad cilja DATE kolonu.
3. `vrsta_ptica` tabela ima više sličnih redova (npr. tri "kanarinac"-slična unosa: "Kanarinac / Fauna evrope...", "Kanarinac pjevač", "Tigrice") — provjeriti `SELECT id, naziv, grupa FROM vrsta_ptica` prije pisanja bilo koje seed/demo skripte da se ne pogodi pogrešan red.
