import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { isMreznaGreska } from '$lib/utils/offline';
import type { Sezona, Kavez } from '../db/schema';
import { supabase } from '../supabase/client';
import { db, addOfflineAction } from '../db/dexie';

export const sezone = writable<Sezona[]>([]);
export const sezonaLoading = writable(false);
export const sezonaError = writable<string | null>(null);

export const kavezi = writable<Kavez[]>([]);

// Eksplicitno odabrana sezona (preživljava navigaciju, pamti se u localStorage)
const storedId = browser ? localStorage.getItem('aktuelna_sezona_id') : null;
export const aktuelnaSezonaId = writable<string | null>(storedId);
if (browser) {
  aktuelnaSezonaId.subscribe((id) => {
    if (id) localStorage.setItem('aktuelna_sezona_id', id);
    else localStorage.removeItem('aktuelna_sezona_id');
  });
}

// Aktivna sezona: eksplicitno odabrana > najstarija 'aktiva' (fallback)
export const aktivnaSezona = derived(
  [sezone, aktuelnaSezonaId],
  ([$sezone, $aktuelnaId]) => {
    if ($aktuelnaId) {
      const selected = $sezone.find((s) => s.id === $aktuelnaId);
      if (selected) return selected;
    }
    const aktivne = $sezone.filter((s) => s.status === 'aktiva');
    if (aktivne.length === 0) return undefined;
    return aktivne.reduce((oldest, s) => (s.created_at < oldest.created_at ? s : oldest));
  }
);

// Učitaj sve sezone korisnika
export async function loadSezone(userId: string) {
  sezonaLoading.set(true);
  sezonaError.set(null);

  try {
    const localSezone = await db.sezona.where('user_id').equals(userId).toArray();
    sezone.set(localSezone);

    const { data, error } = await supabase
      .from('sezona')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (data) {
      await db.sezona.bulkPut(data);
      sezone.set(data);
    }
  } catch (err) {
    sezonaError.set(err instanceof Error ? err.message : 'Greška pri učitavanju sezona');
  } finally {
    sezonaLoading.set(false);
  }
}

// Ažuriraj sezonu
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

// Kreiraj novu sezonu
export async function createSezona(
  userId: string,
  data: Omit<Sezona, 'id' | 'created_at' | 'updated_at'>
) {
  try {
    const newSezona: Sezona = {
      ...data,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await db.sezona.add(newSezona);
    sezone.update((s) => [newSezona, ...s]);
    await addOfflineAction('create', 'sezona', newSezona);

    const { error } = await supabase.from('sezona').insert([newSezona]);
    if (error && error.code !== 'PGRST116' && !isMreznaGreska(error)) throw error;

    return newSezona;
  } catch (err) {
    sezonaError.set(err instanceof Error ? err.message : 'Greška pri kreiranju sezone');
    throw err;
  }
}

// Učitaj kaveze za sezonu
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

    if (data) {
      await db.kavezi.bulkPut(data);
      kavezi.set(data);
    }
  } catch (err) {
    console.error('Greška pri učitavanju kaveza:', err);
  }
}

// Kreiraj kavez za sezonu
export async function createKavez(
  sezonaId: string,
  userId: string,
  oznaka: number,
  napomena?: string
) {
  try {
    const newKavez: Kavez = {
      id: crypto.randomUUID(),
      sezona_id: sezonaId,
      user_id: userId,
      oznaka,
      status: 'prazan',
      napomena,
      updated_from: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await db.kavezi.add(newKavez);
    kavezi.update((k) => [...k, newKavez]);
    await addOfflineAction('create', 'kavezi', newKavez);

    const { error } = await supabase.from('kavezi').insert([newKavez]);
    if (error && error.code !== 'PGRST116' && !isMreznaGreska(error)) throw error;

    return newKavez;
  } catch (err) {
    console.error('Greška pri kreiranju kaveza:', err);
    throw err;
  }
}

// Ažuriraj status kaveza
export async function updateKavezStatus(
  kavezId: string,
  status: 'prazan' | 'aktivan' | 'alarm',
  faza_id?: string
) {
  try {
    const updated = {
      status,
      trenutna_faza_id: faza_id,
      updated_from: Date.now(),
      updated_at: new Date().toISOString()
    };

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

export const sezonaKavezi = (sezonaId: string) =>
  derived(kavezi, ($kavezi) => $kavezi.filter((k) => k.sezona_id === sezonaId));

export const aktivniKavezi = derived(kavezi, ($kavezi) =>
  $kavezi.filter((k) => k.status === 'aktivan')
);

export const alarmKavezi = derived(kavezi, ($kavezi) =>
  $kavezi.filter((k) => k.status === 'alarm')
);
