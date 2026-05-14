import { writable, derived } from 'svelte/store';
import type { Ciklus, AktivnostCiklusa, FazaCiklusa } from '../db/schema';
import { supabase } from '../supabase/client';
import { db, addOfflineAction } from '../db/dexie';

export const ciklusi = writable<Ciklus[]>([]);
export const aktivnosti = writable<AktivnostCiklusa[]>([]);
export const faze = writable<FazaCiklusa[]>([]);

// Učitaj sve faze (šifarnik)
export async function loadFaze() {
  try {
    const localFaze = await db.faze_ciklusa.toArray();
    faze.set(localFaze);

    const { data, error } = await supabase
      .from('faze_ciklusa')
      .select('*')
      .order('vrsta_ptica_id')
      .order('redoslijed');

    if (error) throw error;

    if (data) {
      await db.faze_ciklusa.bulkPut(data);
      faze.set(data);
    }
  } catch (err) {
    console.error('Greška pri učitavanju faza:', err);
  }
}

// Učitaj faze za određenu vrstu, sortirane po redoslijedu
export async function getFazeZaVrstu(vrstaPticaId: string): Promise<FazaCiklusa[]> {
  return db.faze_ciklusa
    .where('vrsta_ptica_id')
    .equals(vrstaPticaId)
    .sortBy('redoslijed');
}

// Učitaj cikluse za sezonu
export async function loadCiklusi(sezonaId: string) {
  try {
    const localCiklusi = await db.ciklusi.where('sezona_id').equals(sezonaId).toArray();
    ciklusi.set(localCiklusi);

    const { data, error } = await supabase
      .from('ciklusi')
      .select('*')
      .eq('sezona_id', sezonaId);

    if (error) throw error;

    if (data) {
      await db.ciklusi.bulkPut(data);
      ciklusi.set(data);
    }
  } catch (err) {
    console.error('Greška pri učitavanju ciklusa:', err);
  }
}

// Kreiraj novi ciklus (leglo)
export async function createCiklus(ciklusData: Omit<Ciklus, 'id' | 'created_at' | 'updated_at'>) {
  try {
    const newCiklus: Ciklus = {
      ...ciklusData,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Dohvati faze sortirane po redoslijedu
    const fazeZaVrstu = await getFazeZaVrstu(ciklusData.vrsta_ptica_id);
    const startDate = new Date(ciklusData.datum_prvog_jajeta);

    // FIX: Akumuliramo dane kroz faze umjesto da koristimo samo faza.broj_dana
    // Primjer za Kanarinac: JAJA(0d) → INKUBACIJA(13d) → PRSTENOVANJE(7d) → ODVAJANJE(30d)
    // D0=jaje, D13=inkubacija gotova, D20=prstenovanje, D50=odvajanje
    let akumuliranoDana = 0;
    const aktivnostiArray: AktivnostCiklusa[] = fazeZaVrstu.map((faza) => {
      akumuliranoDana += faza.broj_dana;

      const potrebanDatum = new Date(startDate);
      potrebanDatum.setDate(potrebanDatum.getDate() + akumuliranoDana);

      return {
        id: crypto.randomUUID(),
        ciklus_id: newCiklus.id,
        faza_id: faza.id,
        datum: null, // null dok korisnik ne unese datum obavljanja
        potreban_datum: potrebanDatum.toISOString().split('T')[0],
        napomena: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });

    // Sačuvaj lokalno
    await db.ciklusi.add(newCiklus);
    await db.aktivnosti_ciklusa.bulkAdd(aktivnostiArray);

    // Ažuriraj stores
    ciklusi.update((c) => [...c, newCiklus]);
    aktivnosti.update((a) => [...a, ...aktivnostiArray]);

    // Queue za sync
    await addOfflineAction('create', 'ciklusi', newCiklus);
    for (const a of aktivnostiArray) {
      await addOfflineAction('create', 'aktivnosti_ciklusa', a);
    }

    // Pošalji na Supabase
    const { error: cError } = await supabase.from('ciklusi').insert([newCiklus]);
    if (cError && cError.code !== '23505') throw cError;

    const { error: aError } = await supabase.from('aktivnosti_ciklusa').insert(aktivnostiArray);
    if (aError && aError.code !== '23505') throw aError;

    return newCiklus;
  } catch (err) {
    console.error('Greška pri kreiranju ciklusa:', err);
    throw err;
  }
}

// Učitaj aktivnosti za ciklus
export async function loadAktivnosti(ciklusId: string) {
  try {
    const localAktivnosti = await db.aktivnosti_ciklusa
      .where('ciklus_id')
      .equals(ciklusId)
      .toArray();
    aktivnosti.set(localAktivnosti);

    const { data, error } = await supabase
      .from('aktivnosti_ciklusa')
      .select('*')
      .eq('ciklus_id', ciklusId)
      .order('potreban_datum');

    if (error) throw error;

    if (data) {
      await db.aktivnosti_ciklusa.bulkPut(data);
      aktivnosti.set(data);
    }
  } catch (err) {
    console.error('Greška pri učitavanju aktivnosti:', err);
  }
}

// Zapiši obavljenu aktivnost
export async function updateAktivnost(
  aktivnostId: string,
  datum: string,
  napomena: string
) {
  try {
    const updated = {
      datum,
      napomena,
      updated_at: new Date().toISOString()
    };

    await db.aktivnosti_ciklusa.update(aktivnostId, updated);
    aktivnosti.update((a) =>
      a.map((act) => (act.id === aktivnostId ? { ...act, ...updated } : act))
    );
    await addOfflineAction('update', 'aktivnosti_ciklusa', { id: aktivnostId, ...updated });

    const { error } = await supabase
      .from('aktivnosti_ciklusa')
      .update(updated)
      .eq('id', aktivnostId);

    if (error) throw error;
  } catch (err) {
    console.error('Greška pri ažuriranju aktivnosti:', err);
    throw err;
  }
}

// Završi ciklus
export async function finishCiklus(ciklusId: string, status: 'završen' | 'neuspješan') {
  try {
    const updated = {
      status,
      updated_at: new Date().toISOString()
    };

    await db.ciklusi.update(ciklusId, updated);
    ciklusi.update((c) =>
      c.map((ck) => (ck.id === ciklusId ? { ...ck, ...updated } : ck))
    );
    await addOfflineAction('update', 'ciklusi', { id: ciklusId, ...updated });

    const { error } = await supabase.from('ciklusi').update(updated).eq('id', ciklusId);
    if (error) throw error;
  } catch (err) {
    console.error('Greška pri završetku ciklusa:', err);
    throw err;
  }
}

// ---- Derived stores / filteri ----

export const aktivniCiklusi = derived(ciklusi, ($ciklusi) =>
  $ciklusi.filter((c) => c.status === 'aktivan')
);

export const ciklusAktivnosti = (ciklusId: string) =>
  derived(aktivnosti, ($aktivnosti) =>
    $aktivnosti
      .filter((a) => a.ciklus_id === ciklusId)
      .sort((a, b) => a.potreban_datum.localeCompare(b.potreban_datum))
  );

export const fazeZaVrstu = (vrstaPticaId: string) =>
  derived(faze, ($faze) =>
    $faze
      .filter((f) => f.vrsta_ptica_id === vrstaPticaId)
      .sort((a, b) => a.redoslijed - b.redoslijed)
  );

// FIX: Ispravna logika za trenutnu fazu — akumuliramo dane
// Vraća fazu u kojoj se ciklus trenutno nalazi
export function getCurrentPhase(
  ciklus: Ciklus,
  faze_list: FazaCiklusa[]
): FazaCiklusa | undefined {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // ignoriši sat

  const fazeZaOvuVrstu = faze_list
    .filter((f) => f.vrsta_ptica_id === ciklus.vrsta_ptica_id)
    .sort((a, b) => a.redoslijed - b.redoslijed);

  const startDate = new Date(ciklus.datum_prvog_jajeta);
  let akumuliranoDana = 0;

  for (const faza of fazeZaOvuVrstu) {
    akumuliranoDana += faza.broj_dana;

    const krajFaze = new Date(startDate);
    krajFaze.setDate(krajFaze.getDate() + akumuliranoDana);
    krajFaze.setHours(0, 0, 0, 0);

    if (today <= krajFaze) {
      return faza; // Trenutno smo u ovoj fazi
    }
  }

  // Prošle su sve faze
  return undefined;
}

// Koliko dana je ostalo do kraja trenutne faze
export function getDaysUntilNextPhase(
  ciklus: Ciklus,
  faze_list: FazaCiklusa[]
): number | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const fazeZaOvuVrstu = faze_list
    .filter((f) => f.vrsta_ptica_id === ciklus.vrsta_ptica_id)
    .sort((a, b) => a.redoslijed - b.redoslijed);

  const startDate = new Date(ciklus.datum_prvog_jajeta);
  let akumuliranoDana = 0;

  for (const faza of fazeZaOvuVrstu) {
    akumuliranoDana += faza.broj_dana;

    const krajFaze = new Date(startDate);
    krajFaze.setDate(krajFaze.getDate() + akumuliranoDana);
    krajFaze.setHours(0, 0, 0, 0);

    if (today <= krajFaze) {
      const diff = krajFaze.getTime() - today.getTime();
      return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }
  }

  return null;
}
