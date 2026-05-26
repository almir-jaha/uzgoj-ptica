// Šifarnik
export interface VrstaPtica {
  id: string;
  naziv: string;
  naziv_latinskih_imena?: string[];
  nazivi_jezicima?: Record<string, string>;
  podatci_inkubacija?: Record<string, any>;
  napomena?: string;
  custom_fields?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// GLOBALNA EVIDENCIJA PTICA - ključno je user_id FK
export interface Ptica {
  id: string;
  user_id: string;
  vrsta_ptica_id: string;
  spol: 'M' | 'Ž' | '?';
  prstena_oznaka?: string;
  prsten_redni_broj?: number;
  naziv?: string;
  otac_id?: string; // nullable - ako je kupljena
  majka_id?: string; // nullable - ako je kupljena
  datum_rodjenja?: string;
  godina?: number;
  napomena?: string;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  user_id: string;
  prsten_prefiks?: string;
  updated_at: string;
}

// Sezona
export interface Sezona {
  id: string;
  user_id: string;
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
  datum_prvog_jajeta: string;
  status: 'aktivan' | 'završen' | 'neuspješan';
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
