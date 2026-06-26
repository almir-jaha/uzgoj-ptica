import { writable, derived } from 'svelte/store';
import { supabase } from '$lib/supabase/client';
import { db } from '$lib/db/dexie';
import type { Sekcija } from '$lib/db/schema';
import { aktivnaUzgajivacnica } from './uzgajivacnica';

export const sekcije = writable<Sekcija[]>([]);

// Sekcije samo aktivne uzgajivačnice, sortirane po redoslijedu
export const aktivneSekcije = derived(
  [sekcije, aktivnaUzgajivacnica],
  ([$sekcije, $aktiv]) => {
    if (!$aktiv) return [];
    return $sekcije
      .filter((s) => s.uzgajivacnica_id === $aktiv.id)
      .sort((a, b) => a.redoslijed - b.redoslijed || a.naziv.localeCompare(b.naziv));
  }
);

export async function loadSekcije(uzgajivacnicaId: string): Promise<void> {
  try {
    try {
      const local = await db.sekcije.where('uzgajivacnica_id').equals(uzgajivacnicaId).toArray();
      if (local.length) sekcije.set(local);
    } catch { /* Dexie nije dostupan */ }

    const { data, error } = await supabase
      .from('sekcije')
      .select('*')
      .eq('uzgajivacnica_id', uzgajivacnicaId)
      .order('redoslijed', { ascending: true });

    if (error) throw error;
    if (data) {
      sekcije.set(data);
      try { await db.sekcije.bulkPut(data); } catch { /* ignore */ }
    }
  } catch (err) {
    console.error('[loadSekcije] Greška:', err);
  }
}

export async function createSekcija(
  uzgajivacnicaId: string,
  userId: string,
  data: { naziv: string; opis?: string; kapacitet_kaveza?: number; redoslijed?: number }
): Promise<Sekcija> {
  const nova: Sekcija = {
    id: crypto.randomUUID(),
    uzgajivacnica_id: uzgajivacnicaId,
    user_id: userId,
    naziv: data.naziv,
    opis: data.opis,
    kapacitet_kaveza: data.kapacitet_kaveza,
    redoslijed: data.redoslijed ?? 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  await db.sekcije.add(nova);
  sekcije.update((list) => [...list, nova]);

  const { error } = await supabase.from('sekcije').insert([nova]);
  if (error) throw error;
  return nova;
}

export async function updateSekcija(
  id: string,
  updates: Partial<Pick<Sekcija, 'naziv' | 'opis' | 'kapacitet_kaveza' | 'redoslijed'>>
): Promise<void> {
  const updated = { ...updates, updated_at: new Date().toISOString() };
  await db.sekcije.update(id, updated);
  sekcije.update((list) => list.map((s) => (s.id === id ? { ...s, ...updated } : s)));
  const { error } = await supabase.from('sekcije').update(updated).eq('id', id);
  if (error) throw error;
}

export async function deleteSekcija(id: string): Promise<void> {
  await db.sekcije.delete(id);
  sekcije.update((list) => list.filter((s) => s.id !== id));
  const { error } = await supabase.from('sekcije').delete().eq('id', id);
  if (error) throw error;
}
