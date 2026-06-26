import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { isMreznaGreska } from '$lib/utils/offline';
import type { Sezona, Kavez } from '../db/schema';
import { supabase } from '../supabase/client';
import { db, addOfflineAction } from '../db/dexie';
import { aktivnaUzgajivacnica } from './uzgajivacnica';

export const sezone = writable<Sezona[]>([]);
export const sezonaLoading = writable(false);
export const sezonaError = writable<string | null>(null);
export const kavezi = writable<Kavez[]>([]);

// Samo sezone aktivne uzgajivačnice
export const filtriraneSezone = derived(
  [sezone, aktivnaUzgajivacnica],
  ([$sezone, $aktiv]) => {
    if (!$aktiv) return $sezone;
    return $sezone.filter((s) => !s.uzgajivacnica_id || s.uzgajivacnica_id === $aktiv.id);
  }
);

// Aktivna sezona — samo iz trenutne uzgajivačnice
export const aktivnaSezona = derived(filtriraneSezone, ($sezone) =>
  $sezone.find((s) => s.status === 'aktiva')
);

// Sezona koja se trenutno pregledava — default je aktivna, može biti arhivirana
const storedPregled = browser ? localStorage.getItem('pregled_sezona_id') : null;
export const sezonaZaPregled = writable<string | null>(storedPregled);
if (browser) {
  sezonaZaPregled.subscribe((id) => {
    if (id) localStorage.setItem('pregled_sezona_id', id);
    else localStorage.removeItem('pregled_sezona_id');
  });
}

// Sezona koja se prikazuje: eksplicitno odabrana (iz iste uzgajivačnice) ili aktivna
export const prikazanaSezona = derived(
  [filtriraneSezone, sezonaZaPregled, aktivnaSezona],
  ([$sezone, $pregledId, $aktivna]) => {
    if ($pregledId) {
      const found = $sezone.find((s) => s.id === $pregledId);
      if (found) return found;
    }
    return $aktivna;
  }
);

export async function loadSezone(userId: string) {
  sezonaLoading.set(true);
  sezonaError.set(null);
  sezone.set([]); // Uvijek resetuj — sprječava curenje podataka između usera
  kavezi.set([]);
  let localSezone: Sezona[] = [];
  try {
    // Dexie — odvojen try/catch da greška ne blokira Supabase
    try {
      localSezone = await db.sezona.where('user_id').equals(userId).toArray();
      if (localSezone.length) sezone.set(localSezone);
    } catch { /* Dexie nije dostupan */ }

    const { data, error } = await supabase
      .from('sezona')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (data) {
      try {
        const supabaseIds = new Set(data.map((s) => s.id));
        const staleIds = localSezone.filter((s) => !supabaseIds.has(s.id)).map((s) => s.id);
        if (staleIds.length > 0) {
          await Promise.all([
            db.kavezi.where('sezona_id').anyOf(staleIds).delete(),
            db.parovi.where('sezona_id').anyOf(staleIds).delete(),
            db.ciklusi.where('sezona_id').anyOf(staleIds).delete(),
            db.sezona.where('id').anyOf(staleIds).delete()
          ]);
          const currentPregled = get(sezonaZaPregled);
          if (currentPregled && staleIds.includes(currentPregled)) {
            sezonaZaPregled.set(null);
          }
        }
        if (data.length) await db.sezona.bulkPut(data);
      } catch { /* Dexie greška — ignoriši */ }

      sezone.set(data);
    }
  } catch (err) {
    sezonaError.set(err instanceof Error ? err.message : 'Greška pri učitavanju sezona');
  } finally {
    sezonaLoading.set(false);
  }
}

export async function updateSezona(
  sezonaId: string,
  updates: Partial<Pick<Sezona, 'naziv' | 'datum_pocetka' | 'datum_kraja' | 'status' | 'broj_kaveza'>>
) {
  try {
    const updated = { ...updates, updated_at: new Date().toISOString() };
    await db.sezona.update(sezonaId, updated);
    sezone.update((s) => s.map((sz) => (sz.id === sezonaId ? { ...sz, ...updated } : sz)));
    await addOfflineAction('update', 'sezona', { id: sezonaId, ...updated });
    const { error } = await supabase.from('sezona').update(updated).eq('id', sezonaId);
    if (error && !isMreznaGreska(error)) throw error;
  } catch (err) {
    sezonaError.set(err instanceof Error ? err.message : 'Greška pri ažuriranju sezone');
    throw err;
  }
}

export async function createSezona(
  userId: string,
  data: Omit<Sezona, 'id' | 'created_at' | 'updated_at'>,
  zavrsiTrenutnuId?: string
) {
  try {
    // Provjera direktno u Supabase — query builder je immutable, mora se reassignati
    let checkQuery = supabase
      .from('sezona')
      .select('id')
      .eq('user_id', userId)
      .eq('godina', data.godina)
      .eq('status', 'aktiva');
    if (data.uzgajivacnica_id) {
      checkQuery = checkQuery.eq('uzgajivacnica_id', data.uzgajivacnica_id);
    } else {
      checkQuery = checkQuery.is('uzgajivacnica_id', null);
    }
    const { data: existing } = await checkQuery;
    if (existing && existing.length > 0) {
      throw new Error(
        `Sezona za godinu ${data.godina} već postoji i aktivna je u ovoj uzgajivačnici. Završite je prije kreiranja nove.`
      );
    }

    // Arhiviraj trenutnu aktivnu sezonu ako je naznačeno
    if (zavrsiTrenutnuId) {
      await updateSezona(zavrsiTrenutnuId, {
        status: 'završena',
        datum_kraja: new Date().toISOString().split('T')[0]
      });
    }

    const newSezona: Sezona = {
      ...data,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Supabase insert PRVO — ako padne, ne pišemo u lokalni store/Dexie
    const { error } = await supabase.from('sezona').insert([newSezona]);
    if (error && error.code !== 'PGRST116' && !isMreznaGreska(error)) throw error;

    // Lokalno tek nakon potvrde Supabase
    await db.sezona.add(newSezona);
    sezone.update((s) => [newSezona, ...s]);
    await addOfflineAction('create', 'sezona', newSezona);

    return newSezona;
  } catch (err) {
    sezonaError.set(err instanceof Error ? err.message : 'Greška pri kreiranju sezone');
    throw err;
  }
}

export async function loadKavezi(sezonaId: string) {
  try {
    const localKavezi = await db.kavezi.where('sezona_id').equals(sezonaId).toArray();
    kavezi.set(localKavezi);

    const { data, error } = await supabase
      .from('kavezi')
      .select('*')
      .eq('sezona_id', sezonaId)
      .order('oznaka');

    if (error) throw error;
    if (data !== null) {
      const supabaseIds = new Set(data.map((k) => k.id));
      const dexieKavezi = await db.kavezi.where('sezona_id').equals(sezonaId).toArray();
      const staleIds = dexieKavezi.filter((k) => !supabaseIds.has(k.id)).map((k) => k.id);
      if (staleIds.length > 0) await db.kavezi.bulkDelete(staleIds);
      if (data.length > 0) await db.kavezi.bulkPut(data);
      kavezi.set(data);
    }
  } catch (err) {
    console.error('Greška pri učitavanju kaveza:', err);
  }
}

export async function createKavez(
  sezonaId: string,
  userId: string,
  oznaka: number,
  napomena?: string,
  sekcijaId?: string
) {
  try {
    const newKavez: Kavez = {
      id: crypto.randomUUID(),
      sezona_id: sezonaId,
      user_id: userId,
      sekcija_id: sekcijaId,
      oznaka,
      status: 'prazan',
      napomena,
      updated_from: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Supabase PRVO — ako padne, lokalni state ostaje čist
    const { error } = await supabase.from('kavezi').insert([newKavez]);
    if (error && error.code !== 'PGRST116' && !isMreznaGreska(error)) throw error;

    await db.kavezi.add(newKavez);
    kavezi.update((k) => [...k, newKavez]);
    await addOfflineAction('create', 'kavezi', newKavez);

    return newKavez;
  } catch (err) {
    console.error('Greška pri kreiranju kaveza:', err);
    throw err;
  }
}

export async function updateKavezStatus(
  kavezId: string,
  status: 'prazan' | 'aktivan' | 'alarm',
  faza_id?: string
) {
  try {
    const updated: Record<string, unknown> = {
      status,
      updated_from: Date.now(),
      updated_at: new Date().toISOString()
    };
    // Postavi samo ako je definisan — undefined bi uzrokovao FK grešku s null vrijednošću
    if (faza_id !== undefined) {
      updated.trenutna_faza_id = faza_id;
    } else {
      updated.trenutna_faza_id = null;
    }

    await db.kavezi.update(kavezId, updated);
    kavezi.update((k) => k.map((kv) => (kv.id === kavezId ? { ...kv, ...updated } : kv)));
    await addOfflineAction('update', 'kavezi', { id: kavezId, ...updated });

    const { error } = await supabase.from('kavezi').update(updated).eq('id', kavezId);
    if (error && error.code !== 'PGRST116' && !isMreznaGreska(error)) throw error;
  } catch (err) {
    console.error('Greška pri ažuriranju kaveza:', err);
    throw err;
  }
}

export async function updateKavezSekcija(kavezId: string, sekcijaId: string | null): Promise<void> {
  try {
    const now = new Date().toISOString();
    // Dexie: undefined briše optional polje, ne null
    const dexieUpdate = {
      sekcija_id: sekcijaId ?? undefined,
      updated_from: Date.now(),
      updated_at: now
    };
    // Supabase: null eksplicitno briše FK
    const supabaseUpdate = {
      sekcija_id: sekcijaId,
      updated_from: Date.now(),
      updated_at: now
    };
    await db.kavezi.update(kavezId, dexieUpdate);
    kavezi.update((k) => k.map((kv) => (kv.id === kavezId ? { ...kv, sekcija_id: sekcijaId ?? undefined, updated_from: dexieUpdate.updated_from, updated_at: now } : kv)));
    await addOfflineAction('update', 'kavezi', { id: kavezId, ...supabaseUpdate });
    const { error } = await supabase.from('kavezi').update(supabaseUpdate).eq('id', kavezId);
    if (error && error.code !== 'PGRST116' && !isMreznaGreska(error)) throw error;
  } catch (err) {
    console.error('Greška pri dodjeljivanju sekcije kavezu:', err);
    throw err;
  }
}

export async function deleteKavez(kavezId: string): Promise<void> {
  try {
    await db.kavezi.delete(kavezId);
    kavezi.update((k) => k.filter((kv) => kv.id !== kavezId));
    await addOfflineAction('delete', 'kavezi', { id: kavezId });
    const { error } = await supabase.from('kavezi').delete().eq('id', kavezId);
    if (error && !isMreznaGreska(error)) throw error;
  } catch (err) {
    console.error('Greška pri brisanju kaveza:', err);
    throw err;
  }
}

export async function deleteSezona(sezonaId: string): Promise<void> {
  try {
    // Supabase PRVO — cascade briše kaveze automatski (ON DELETE CASCADE)
    const { error } = await supabase.from('sezona').delete().eq('id', sezonaId);
    if (error && !isMreznaGreska(error)) throw error;

    // Tek nakon potvrde Supabase — lokalni cleanup
    const kavezIds = (await db.kavezi.where('sezona_id').equals(sezonaId).toArray()).map((k) => k.id);
    await db.kavezi.bulkDelete(kavezIds);
    kavezi.update((k) => k.filter((kv) => kv.sezona_id !== sezonaId));
    await db.sezona.delete(sezonaId);
    sezone.update((s) => s.filter((sz) => sz.id !== sezonaId));
  } catch (err) {
    console.error('Greška pri brisanju sezone:', err);
    throw err;
  }
}

export const sezonaKavezi = (sezonaId: string) =>
  derived(kavezi, ($kavezi) => $kavezi.filter((k) => k.sezona_id === sezonaId));

export const aktivniKavezi = derived(kavezi, ($kavezi) =>
  $kavezi.filter((k) => k.status === 'aktivan')
);

export const alarmKavezi = derived(kavezi, ($kavezi) =>
  $kavezi.filter((k) => k.status === 'alarm')
);
