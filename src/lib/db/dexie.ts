import Dexie, { type Table } from 'dexie';
import type {
  VrstaPtica,
  Ptica,
  Sezona,
  FazaCiklusa,
  Kavez,
  Par,
  Ciklus,
  AktivnostCiklusa,
  Istorija,
  OfflineAction,
  UserSettings
} from './schema';

export class UzgojPticaDB extends Dexie {
  vrsta_ptica!: Table<VrstaPtica>;
  ptice!: Table<Ptica>;
  sezona!: Table<Sezona>;
  faze_ciklusa!: Table<FazaCiklusa>;
  kavezi!: Table<Kavez>;
  parovi!: Table<Par>;
  ciklusi!: Table<Ciklus>;
  aktivnosti_ciklusa!: Table<AktivnostCiklusa>;
  istorija!: Table<Istorija>;
  offlineQueue!: Table<OfflineAction & { id?: number }>;
  user_settings!: Table<UserSettings>;

  constructor() {
    super('UzgojPticaDB');
    this.version(1).stores({
      vrsta_ptica: 'id',
      ptice: 'id, user_id, vrsta_ptica_id, otac_id, majka_id',
      sezona: 'id, user_id, godina',
      faze_ciklusa: 'id, vrsta_ptica_id, redoslijed',
      kavezi: 'id, sezona_id, [sezona_id+oznaka], status, user_id',
      parovi: 'id, sezona_id, ptica1_id, ptica2_id, status',
      ciklusi: 'id, par_id, kavez_id, sezona_id, status, vrsta_ptica_id',
      aktivnosti_ciklusa: 'id, ciklus_id, faza_id, potreban_datum',
      istorija: 'id, sezona_id, tip_entiteta',
      offlineQueue: '++id, table, timestamp, synced'
    });
    this.version(2).stores({
      ptice: 'id, user_id, vrsta_ptica_id, otac_id, majka_id, prsten_redni_broj',
      user_settings: 'user_id'
    });
    this.version(3).stores({
      ptice: 'id, user_id, vrsta_ptica_id, otac_id, majka_id, prsten_redni_broj, godina'
    });
  }
}

export const db = new UzgojPticaDB();

// Helper: da li je korisnik vlasnik ptice
export async function isPticaOwner(pticaId: string, userId: string): Promise<boolean> {
  const ptica = await db.ptice.get(pticaId);
  return ptica?.user_id === userId;
}

// Helper: ptica sa roditeljima i vrstom (rodovnik)
export async function getPticaWithRodovnik(pticaId: string) {
  const ptica = await db.ptice.get(pticaId);
  if (!ptica) return null;

  const [otac, majka, vrsta] = await Promise.all([
    ptica.otac_id ? db.ptice.get(ptica.otac_id) : Promise.resolve(undefined),
    ptica.majka_id ? db.ptice.get(ptica.majka_id) : Promise.resolve(undefined),
    db.vrsta_ptica.get(ptica.vrsta_ptica_id)
  ]);

  return { ...ptica, otac, majka, vrsta };
}

// FIX: getKavezWithDetails sada traži AKTIVNI ciklus, ne bilo koji
export async function getKavezWithDetails(kavezId: string) {
  const kavez = await db.kavezi.get(kavezId);
  if (!kavez) return null;

  const faza = kavez.trenutna_faza_id
    ? await db.faze_ciklusa.get(kavez.trenutna_faza_id)
    : undefined;

  // FIX: Filtriramo po status='aktivan', ne samo po kavez_id
  const ciklus = await db.ciklusi
    .where('kavez_id')
    .equals(kavezId)
    .filter((c) => c.status === 'aktivan')
    .first();

  let aktivni_ciklus;
  if (ciklus) {
    const par = await db.parovi.get(ciklus.par_id);
    if (par) {
      const [ptica1, ptica2] = await Promise.all([
        db.ptice.get(par.ptica1_id),
        db.ptice.get(par.ptica2_id)
      ]);

      aktivni_ciklus = {
        ...ciklus,
        par: {
          ...par,
          ptica1: ptica1!,
          ptica2: ptica2!
        }
      };
    }
  }

  // Sljedeća aktivnost = ona sa najmanjim potreban_datum koja nije obavljena (datum je prazan)
  const sledeca_aktivnost = ciklus
    ? await db.aktivnosti_ciklusa
        .where('ciklus_id')
        .equals(ciklus.id)
        .filter((a) => !a.datum) // nije obavljena
        .first()
    : undefined;

  return {
    ...kavez,
    trenutna_faza: faza,
    aktivni_ciklus,
    sledeca_aktivnost
  };
}

// Offline queue helpers
export async function addOfflineAction(
  action: 'create' | 'update' | 'delete',
  table: string,
  data: Record<string, any>
) {
  await db.offlineQueue.add({
    timestamp: Date.now(),
    action,
    table,
    data,
    synced: false
  });
}

export async function getOfflineQueue() {
  return db.offlineQueue.toArray();
}

export async function clearOfflineQueue() {
  await db.offlineQueue.clear();
}

// Soft delete provjera: ptica sa djecom se ne može obrisati
export async function canDeletePtica(pticaId: string): Promise<boolean> {
  const childrenCount = await db.ptice
    .where('otac_id')
    .equals(pticaId)
    .or('majka_id')
    .equals(pticaId)
    .count();
  return childrenCount === 0;
}
