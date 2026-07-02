// Šifarnik
export interface VrstaPtica {
  id: string;
  naziv: string;
  naziv_latinskih_imena?: string[];
  nazivi_jezicima?: Record<string, string>;
  podatci_inkubacija?: Record<string, any>;
  napomena?: string;
  custom_fields?: Record<string, any>;
  grupa?: string; // 'kanarinac_finke' | 'golubovi' | 'papagaji' | 'ostalo'
  created_at: string;
  updated_at: string;
}

// Sekcija: prostorna podjela unutar uzgajivačnice (boks, prostorija, soba)
export interface Sekcija {
  id: string;
  uzgajivacnica_id: string;
  user_id: string;
  naziv: string;
  opis?: string;
  kapacitet_kaveza?: number;
  redoslijed: number;
  created_at: string;
  updated_at: string;
}

// Uzgajivačnica (korisnik može imati više: ptice, golubovi, itd.)
export interface Uzgajivacnica {
  id: string;
  user_id: string;
  naziv: string;
  opis?: string;
  prsten_prefiks?: string;
  ime_prezime?: string;
  adresa?: string;
  telefon?: string;
  slika_url?: string;
  app_url?: string;
  napomena?: string;
  created_at: string;
  updated_at: string;
}

// GLOBALNA EVIDENCIJA PTICA - ključno je user_id FK
export interface Ptica {
  id: string;
  user_id: string;
  uzgajivacnica_id?: string;
  vrsta_ptica_id: string;
  spol: 'M' | 'Ž' | '?';
  prstena_oznaka?: string;
  prsten_redni_broj?: number;
  naziv?: string;
  otac_id?: string; // nullable - ako je kupljena
  majka_id?: string; // nullable - ako je kupljena
  datum_rodjenja?: string;
  godina?: number;
  boja?: string;
  status_ptica?: string;
  rezultati?: string;
  napomena_rodovnik?: string;
  slika_url?: string;
  napomena?: string;
  // Status evidencije — dostupnost za parenje
  status_evidencije?: 'aktivna' | 'mlada' | 'vanjska' | 'uginula' | 'prodata' | 'poklonjena' | 'ostalo';
  datum_statusa?: string;
  napomena_statusa?: string;
  genetika?: Record<string, unknown>; // dinamički atributi po vrsti (mutacije, ocjene, performanse)
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  user_id: string;
  prsten_prefiks?: string;
  naziv_uzgajivacnice?: string;
  ime_prezime?: string;
  adresa?: string;
  telefon?: string;
  slika_url?: string;
  app_url?: string;
  updated_at: string;
}

// Sezona
export interface Sezona {
  id: string;
  user_id: string;
  uzgajivacnica_id?: string;
  godina: number;
  naziv?: string;
  broj_kaveza: number;
  datum_pocetka: string;
  datum_kraja?: string;
  status: 'aktiva' | 'završena';
  created_at: string;
  updated_at: string;
}

// Šifarnik faza po vrsti
export interface FazaCiklusa {
  id: string;
  vrsta_ptica_id: string;
  redoslijed: number;
  naziv: string;
  nazivi_jezicima?: Record<string, string>;
  boja: string;
  broj_dana: number;
  opis?: string;
  created_at: string;
  updated_at: string;
}

// Kavez
export interface Kavez {
  id: string;
  sezona_id: string;
  user_id: string;
  sekcija_id?: string;
  oznaka: number;
  trenutna_faza_id?: string;
  status: 'prazan' | 'aktivan' | 'alarm';
  napomena?: string;
  updated_from: number;
  created_at: string;
  updated_at: string;
}

// Par - ISTA PTICA MOŽE BITI U VIŠE PAROVA KROZ GODINE
export interface Par {
  id: string;
  sezona_id: string;
  ptica1_id: string;
  ptica2_id: string;
  status: 'aktivan' | 'završen' | 'razdvojen';
  datum_formiranja: string;
  napomena?: string;
  created_at: string;
  updated_at: string;
}

// Ciklus (leglo)
export interface Ciklus {
  id: string;
  par_id: string;
  kavez_id: string;
  sezona_id: string;
  vrsta_ptica_id: string;
  datum_prvog_jajeta: string | null;
  status: 'aktivan' | 'završen' | 'neuspješan';
  napomena_paznje?: string; // vanredna pažnja na kavezu (bolest, liječenje...)
  broj_jaja?: number;
  broj_izlijegljenih?: number;
  napomena?: string;
  created_at: string;
  updated_at: string;
}

// Aktivnost ciklusa
export interface AktivnostCiklusa {
  id: string;
  ciklus_id: string;
  faza_id: string;
  datum: string | null; // null = aktivnost nije obavljena
  potreban_datum: string;
  napomena?: string;
  created_at: string;
  updated_at: string;
}

// Istorija (archive snapshot)
export interface Istorija {
  id: string;
  sezona_id: string;
  kavez_id?: string;
  par_id?: string;
  ciklus_id?: string;
  tip_entiteta: 'sezona' | 'kavez' | 'par' | 'ciklus';
  data_snapshot?: Record<string, any>;
  datum_arhiva: string;
  created_at: string;
}

// Offline queue
export interface OfflineAction {
  id?: string;
  timestamp: number;
  action: 'create' | 'update' | 'delete';
  table: string;
  data: Record<string, any>;
  synced?: boolean;
}

// UI helpers
export interface KavezWithDetails extends Kavez {
  trenutna_faza?: FazaCiklusa;
  aktivni_ciklus?: Ciklus & {
    par: Par & {
      ptica1: Ptica;
      ptica2: Ptica;
    };
  };
  sledeca_aktivnost?: AktivnostCiklusa;
}

export interface PticaWithRodovnik extends Ptica {
  otac?: Ptica;
  majka?: Ptica;
  vrsta?: VrstaPtica;
}

// Zdravstveni dnevnik ptica
export type ZdravljeTip = 'bolest' | 'preventiva' | 'vakcinacija' | 'zapazanje' | 'ostalo';

export interface Zdravlje {
  id: string;
  user_id: string;
  uzgajivacnica_id?: string;
  sezona_id?: string;         // sezona u kojoj je tretman obavljen (za arhiviranje)
  sekcija_id?: string;        // masovni tretman za sekciju (referenca)
  ptica_id?: string;          // null = masovni uzgajivačnica-level tretman
  datum: string;
  tip: ZdravljeTip;
  naziv: string;
  opis?: string;
  lijek?: string;
  trajanje_dana?: number;
  created_at: string;
  updated_at: string;
}

// Genetička polja sa prevodima na sve jezike (17 jezika)
export interface GenetikaPoljaI18n {
  id: string;
  polje_kljuc: string;                          // 'vizuelna_mutacija', 'stav', itd.
  vrsta_grupa: 'kanarinac_finke' | 'golubovi' | 'papagaji' | 'ostalo';
  tip: 'select' | 'text' | 'tags' | 'stars' | 'number';
  sekcija: 'genetika' | 'ocjena';
  redoslijed: number;
  nazivi_jezicima: Record<string, string>;      // { "bs": "Mutacija", "en": "Mutation", ... }
  opisi_jezicima?: Record<string, string>;
  placeholder_jezicima?: Record<string, string>;
  opcije?: string[];                            // Za select/tags (BS vrijednosti — što se čuva u DB)
  opcije_jezicima?: Record<string, string[]>;  // Prevedeni labeli { "en": ["Lutino","Albino"], ... }
  min_vrijednost?: number;                      // Za number/stars
  max_vrijednost?: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}
