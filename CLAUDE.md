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
| `src/routes/admin/+page.svelte` | Admin panel (vrste, korisnici, genetička polja) |

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
```

## Višejezičnost (i18n) — 17 jezika

**ZAVRŠENO.** Commit `4d98784`.

- `src/lib/i18n/` — BS (referentni), HR, EN, DE, ES, FR, IT, NL, PL, BG, HU, RO, PT, SL, SR, TR, ZH
- `$t` derived store — automatski osvježava pri promjeni jezika
- `JezikSelector.svelte` — integrisan u layout (desktop + mobile)
- BS i HR imaju pune prevode; ostali jezici koriste EN kao fallback za `genetikaPolja` sekciju

### i18n za DB zapise (DJELIMIČNO)

- **Vrste ptica:** `vrsta_ptica.nazivi_jezicima` JSONB — radi ✅
- **Faze ciklusa:** `faze_ciklusa.nazivi_jezicima` JSONB — radi ✅ (KavezKartica, aktivnosti)
- **Genetička polja — nazivi:** `genetika_polja_i18n.nazivi_jezicima` — derived store `genetikaLabels` ✅
- **Genetička polja — opcije:** `genetika_polja_i18n.opcije_jezicima` — derived store `genetikaOpcijeDisplay` ✅
- **Genetička polja — placeholderi:** `genetika_polja_i18n.placeholder_jezicima` — derived store `genetikaPlaceholderi` ✅

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

## Admin panel

Rute: `/admin`. Dostupan samo za `almir.jaha@gmail.com`.

Sekcije:
- Vrste ptica (CRUD + prevodi naziva)
- Korisnici (tier management)
- Genetička polja i prevodi (CRUD + i18n za sva 17 jezika)

Komponente:
- `NovoGenetikaPoljeModal.svelte` — create/edit genetičkog polja
- `GenetikaPoljeI18nForm.svelte` — forma za 17 jezičnih prevoda (naziv, opis, placeholder, opcije)

## Pending zadaci

- `genetikaI18n.ts` store ne sinhronizira automatski kad admin izmijeni polje — treba reload stranice
