import { writable, derived } from 'svelte/store';
import type { Ptica, PticaWithRodovnik } from '../db/schema';
import { supabase } from '../supabase/client';
import { db, addOfflineAction, getPticaWithRodovnik } from '../db/dexie';
import { user } from './auth';

export const ptice = writable<Ptica[]>([]);
export const pticaLoading = writable(false);
export const pticaError = writable<string | null>(null);

// Učitaj sve ptice korisnika
export async function loadPtice(userId: string) {
  pticaLoading.set(true);
  pticaError.set(null);

  try {
    // Prvo iz IndexedDB
    const localPtice = await db.ptice.where('user_id').equals(userId).toArray();
    ptice.set(localPtice);

    // Zatim sinhronizuj sa Supabase
    const { data, error } = await supabase
      .from('ptice')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    // Ažuriraj IndexedDB
    if (data) {
      await db.ptice.bulkPut(data);
      ptice.set(data);
    }
  } catch (err) {
    pticaError.set(err instanceof Error ? err.message : 'Greška pri učitavanju ptica');
  } finally {
    pticaLoading.set(false);
  }
}

// Kreiraj novu pticu
export async function createPtica(
  userId: string,
  data: Omit<Ptica, 'id' | 'created_at' | 'updated_at'>
) {
  try {
    const newPtica: Ptica = {
      ...data,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Lokalnu
    await db.ptice.add(newPtica);
    ptice.update((p) => [...p, newPtica]);

    // Queue za sync
    await addOfflineAction('create', 'ptice', newPtica);

    // Pokušaj da pošalješ na Supabase
    const { error } = await supabase.from('ptice').insert([newPtica]);
    if (error && error.code !== 'PGRST116') throw error;

    return newPtica;
  } catch (err) {
    pticaError.set(err instanceof Error ? err.message : 'Greška pri kreiranju ptice');
    throw err;
  }
}

// Ažuriraj pticu
export async function updatePtica(pticaId: string, updates: Partial<Ptica>) {
  try {
    const updated = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    await db.ptice.update(pticaId, updated);
    ptice.update((p) => p.map((pt) => (pt.id === pticaId ? { ...pt, ...updated } : pt)));

    await addOfflineAction('update', 'ptice', { id: pticaId, ...updated });

    const { error } = await supabase
      .from('ptice')
      .update(updated)
      .eq('id', pticaId);

    if (error && error.code !== 'PGRST116') throw error;
  } catch (err) {
    pticaError.set(err instanceof Error ? err.message : 'Greška pri ažuriranju ptice');
    throw err;
  }
}

// Pregled ptice sa roditeljima (rodovnik)
export async function getPticaWithFamily(pticaId: string): Promise<PticaWithRodovnik | null> {
  return getPticaWithRodovnik(pticaId);
}

// Filter - ptice po vrsti
export const pticePo = (vrstaId: string) =>
  derived(ptice, ($ptice) => $ptice.filter((p) => p.vrsta_ptica_id === vrstaId));

// Filter - mužjaci/ženke
export const pticeMuzjaci = derived(ptice, ($ptice) => $ptice.filter((p) => p.spol === 'M'));
export const pticeSenke = derived(ptice, ($ptice) => $ptice.filter((p) => p.spol === 'Ž'));

// Pregled rodovnika
export async function getRodovnik(pticaId: string) {
  const ptica = await getPticaWithRodovnik(pticaId);
  if (!ptica) return null;

  const rodovnik = {
    ptica,
    generacije: [{ id: pticaId, naziv: ptica.naziv }]
  };

  // Generacija otaca
  if (ptica.otac) {
    const otacFamily = await getPticaWithRodovnik(ptica.otac.id);
    if (otacFamily?.otac) rodovnik.generacije.push({ id: otacFamily.otac.id, naziv: otacFamily.otac.naziv });
  }

  // Generacija majki
  if (ptica.majka) {
    const majkaFamily = await getPticaWithRodovnik(ptica.majka.id);
    if (majkaFamily?.majka) rodovnik.generacije.push({ id: majkaFamily.majka.id, naziv: majkaFamily.majka.naziv });
  }

  return rodovnik;
}
