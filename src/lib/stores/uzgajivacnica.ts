import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { supabase } from '$lib/supabase/client';
import { db } from '$lib/db/dexie';
import type { Uzgajivacnica } from '$lib/db/schema';

export const uzgajivacnice = writable<Uzgajivacnica[]>([]);
export const uzgajivacniceLoading = writable(false);

const storedId = browser ? localStorage.getItem('aktivna_uzgajivacnica_id') : null;
export const aktivnaUzgajivacnicaId = writable<string | null>(storedId);

if (browser) {
  aktivnaUzgajivacnicaId.subscribe((id) => {
    if (id) localStorage.setItem('aktivna_uzgajivacnica_id', id);
    else localStorage.removeItem('aktivna_uzgajivacnica_id');
  });
}

export const aktivnaUzgajivacnica = derived(
  [uzgajivacnice, aktivnaUzgajivacnicaId],
  ([$lista, $id]) => $lista.find((u) => u.id === $id) ?? $lista[0] ?? null
);

export async function clearUzgajivacniceStore(): Promise<void> {
  uzgajivacnice.set([]);
  aktivnaUzgajivacnicaId.set(null);
}

export async function loadUzgajivacnice(userId: string): Promise<void> {
  uzgajivacniceLoading.set(true);
  uzgajivacnice.set([]); // Uvijek resetuj — sprječava curenje podataka između usera
  try {
    const local = await db.uzgajivacnice.where('user_id').equals(userId).toArray();
    uzgajivacnice.set(local);

    const { data, error } = await supabase
      .from('uzgajivacnice')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    if (data && data.length > 0) {
      await db.uzgajivacnice.bulkPut(data);
      uzgajivacnice.set(data);

      // Ako nema aktivne ili aktivna ne postoji više — postavi prvu
      const currentId = browser ? localStorage.getItem('aktivna_uzgajivacnica_id') : null;
      if (!currentId || !data.find((u) => u.id === currentId)) {
        aktivnaUzgajivacnicaId.set(data[0].id);
      }
    }
  } finally {
    uzgajivacniceLoading.set(false);
  }
}

export function setAktivnaUzgajivacnica(id: string): void {
  aktivnaUzgajivacnicaId.set(id);
}

export async function createUzgajivacnica(
  userId: string,
  data: Omit<Uzgajivacnica, 'id' | 'created_at' | 'updated_at'>
): Promise<Uzgajivacnica> {
  const nova: Uzgajivacnica = {
    ...data,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  await db.uzgajivacnice.add(nova);
  uzgajivacnice.update((list) => [...list, nova]);
  const { error } = await supabase.from('uzgajivacnice').insert([nova]);
  if (error) throw error;
  return nova;
}

export async function updateUzgajivacnica(
  id: string,
  updates: Partial<Omit<Uzgajivacnica, 'id' | 'user_id' | 'created_at'>>
): Promise<void> {
  const updated = { ...updates, updated_at: new Date().toISOString() };
  await db.uzgajivacnice.update(id, updated);
  uzgajivacnice.update((list) => list.map((u) => (u.id === id ? { ...u, ...updated } : u)));
  const { error } = await supabase.from('uzgajivacnice').update(updated).eq('id', id);
  if (error) throw error;
}

export async function deleteUzgajivacnica(id: string): Promise<void> {
  await db.uzgajivacnice.delete(id);
  uzgajivacnice.update((list) => list.filter((u) => u.id !== id));
  const { error } = await supabase.from('uzgajivacnice').delete().eq('id', id);
  if (error) throw error;
}
