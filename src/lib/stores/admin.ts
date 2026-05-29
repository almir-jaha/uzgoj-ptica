import { writable, get } from 'svelte/store';
import type { VrstaPtica, FazaCiklusa } from '$lib/db/schema';
import { supabase } from '$lib/supabase/client';
import { db } from '$lib/db/dexie';
import { faze } from '$lib/stores/ciklus';
import { loadAllUserTiers, setUserTier, allUserTiers } from '$lib/stores/userTier';
import type { Tier } from '$lib/stores/userTier';

export { loadAllUserTiers, setUserTier, allUserTiers };
export type { Tier };

export const vrstePtica = writable<VrstaPtica[]>([]);
export const adminLoading = writable(false);

// Provjera admin korisnika (email iz env varijable)
export function isAdmin(email?: string | null): boolean {
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
  if (!adminEmail || !email) return false;
  return email.toLowerCase() === adminEmail.toLowerCase();
}

// ── Vrste ptica ─────────────────────────────────────────────

export async function loadVrstePtica() {
  adminLoading.set(true);
  try {
    const { data, error } = await supabase
      .from('vrsta_ptica')
      .select('*')
      .order('naziv');
    if (error) throw error;
    if (data) {
      await db.vrsta_ptica.bulkPut(data);
      vrstePtica.set(data);
    }
  } finally {
    adminLoading.set(false);
  }
}

export async function createVrstaPtica(
  naziv: string,
  napomena?: string
): Promise<VrstaPtica> {
  const newVrsta: VrstaPtica = {
    id: crypto.randomUUID(),
    naziv: naziv.trim(),
    napomena,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  const { error } = await supabase.from('vrsta_ptica').insert([newVrsta]);
  if (error) throw new Error(error.message);
  await db.vrsta_ptica.add(newVrsta);
  vrstePtica.update((v) => [...v, newVrsta].sort((a, b) => a.naziv.localeCompare(b.naziv)));
  return newVrsta;
}

export async function updateVrstaPtica(
  id: string,
  naziv: string,
  napomena?: string
) {
  const updated = { naziv: naziv.trim(), napomena, updated_at: new Date().toISOString() };
  const { error } = await supabase.from('vrsta_ptica').update(updated).eq('id', id);
  if (error) throw new Error(error.message);
  await db.vrsta_ptica.update(id, updated);
  vrstePtica.update((v) =>
    v.map((vp) => (vp.id === id ? { ...vp, ...updated } : vp))
      .sort((a, b) => a.naziv.localeCompare(b.naziv))
  );
}

export async function deleteVrstaPtica(id: string) {
  const { error } = await supabase.from('vrsta_ptica').delete().eq('id', id);
  if (error) throw new Error(error.message);
  await db.vrsta_ptica.delete(id);
  vrstePtica.update((v) => v.filter((vp) => vp.id !== id));
}

// ── Faze ciklusa ─────────────────────────────────────────────

export async function loadFazeZaVrstu(vrstaPticaId: string): Promise<FazaCiklusa[]> {
  const { data, error } = await supabase
    .from('faze_ciklusa')
    .select('*')
    .eq('vrsta_ptica_id', vrstaPticaId)
    .order('redoslijed');
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createFaza(data: {
  vrsta_ptica_id: string;
  redoslijed: number;
  naziv: string;
  boja: string;
  broj_dana: number;
  opis?: string;
}): Promise<FazaCiklusa> {
  const newFaza: FazaCiklusa = {
    id: crypto.randomUUID(),
    ...data,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  const { error } = await supabase.from('faze_ciklusa').insert([newFaza]);
  if (error) throw new Error(error.message);
  await db.faze_ciklusa.add(newFaza);
  // Ažuriraj globalni faze store
  faze.update((f) => [...f, newFaza]);
  return newFaza;
}

export async function updateFaza(
  id: string,
  data: Partial<Pick<FazaCiklusa, 'naziv' | 'boja' | 'broj_dana' | 'redoslijed' | 'opis'>>
) {
  const updated = { ...data, updated_at: new Date().toISOString() };
  const { error } = await supabase.from('faze_ciklusa').update(updated).eq('id', id);
  if (error) throw new Error(error.message);
  await db.faze_ciklusa.update(id, updated);
  faze.update((f) => f.map((fz) => (fz.id === id ? { ...fz, ...updated } : fz)));
}

export async function deleteFaza(id: string) {
  const { error } = await supabase.from('faze_ciklusa').delete().eq('id', id);
  if (error) throw new Error(error.message);
  await db.faze_ciklusa.delete(id);
  faze.update((f) => f.filter((fz) => fz.id !== id));
}

// ── Uzgajivačnice (admin — svi korisnici) ───────────────────

export interface AdminUzgajivacnica {
  id: string;
  user_id: string;
  naziv: string;
  app_url?: string;
  prsten_prefiks?: string;
}

export const adminUzgajivacnice = writable<AdminUzgajivacnica[]>([]);

export async function loadAdminUzgajivacnice(): Promise<void> {
  const { data, error } = await supabase
    .from('uzgajivacnice')
    .select('id, user_id, naziv, app_url, prsten_prefiks')
    .order('naziv');
  if (error) throw new Error(error.message);
  adminUzgajivacnice.set((data ?? []) as AdminUzgajivacnica[]);
}

export async function adminUpdateAppUrl(uzgajivacnicaId: string, appUrl: string): Promise<void> {
  const { error } = await supabase
    .from('uzgajivacnice')
    .update({ app_url: appUrl.trim(), updated_at: new Date().toISOString() })
    .eq('id', uzgajivacnicaId);
  if (error) throw new Error(error.message);
  adminUzgajivacnice.update((list) =>
    list.map((u) => (u.id === uzgajivacnicaId ? { ...u, app_url: appUrl.trim() } : u))
  );
}
