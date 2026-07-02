import { writable, get } from 'svelte/store';
import type { VrstaPtica, FazaCiklusa, GenetikaPoljaI18n } from '$lib/db/schema';
import { supabase } from '$lib/supabase/client';
import { db } from '$lib/db/dexie';
import { faze } from '$lib/stores/ciklus';
import { loadAllUserTiers, setUserTier, allUserTiers } from '$lib/stores/userTier';
import type { Tier } from '$lib/stores/userTier';
import type { GenetikaPolje } from '$lib/utils/genetika-schema';

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
  napomena?: string,
  grupa = 'ostalo',
  nazivi_jezicima?: Record<string, string>
): Promise<VrstaPtica> {
  const newVrsta: VrstaPtica = {
    id: crypto.randomUUID(),
    naziv: naziv.trim(),
    napomena,
    grupa,
    nazivi_jezicima: nazivi_jezicima && Object.keys(nazivi_jezicima).length > 0
      ? nazivi_jezicima
      : undefined,
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
  napomena?: string,
  grupa?: string,
  nazivi_jezicima?: Record<string, string>
) {
  const updated: Partial<VrstaPtica> & { updated_at: string } = {
    naziv: naziv.trim(),
    napomena,
    grupa: grupa ?? 'ostalo',
    updated_at: new Date().toISOString()
  };
  if (nazivi_jezicima !== undefined) updated.nazivi_jezicima = nazivi_jezicima;
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

export async function updateVrstaGenetikaPolja(
  vrstaId: string,
  polja: GenetikaPolje[]
): Promise<void> {
  const existing = await db.vrsta_ptica.get(vrstaId);
  const customFields = { ...(existing?.custom_fields ?? {}), genetika_polja: polja };
  const updated = { custom_fields: customFields, updated_at: new Date().toISOString() };
  const { error } = await supabase.from('vrsta_ptica').update(updated).eq('id', vrstaId);
  if (error) throw new Error(error.message);
  await db.vrsta_ptica.update(vrstaId, updated);
  vrstePtica.update((v) =>
    v.map((vp) => (vp.id === vrstaId ? { ...vp, ...updated } : vp))
  );
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

// ── Genetička polja sa prevodima (17 jezika) ─────────────────

export const genetikaPoljaI18n = writable<GenetikaPoljaI18n[]>([]);

export async function loadSvaGenetikaPolja(): Promise<void> {
  adminLoading.set(true);
  try {
    const { data, error } = await supabase
      .from('genetika_polja_i18n')
      .select('*')
      .order('vrsta_grupa, redoslijed');
    if (error) throw new Error(error.message);
    genetikaPoljaI18n.set(data ?? []);
  } finally {
    adminLoading.set(false);
  }
}

export async function loadGenetikaPoljaZaGrupu(vrstaGrupa: string): Promise<GenetikaPoljaI18n[]> {
  const { data, error } = await supabase
    .from('genetika_polja_i18n')
    .select('*')
    .eq('vrsta_grupa', vrstaGrupa)
    .order('redoslijed');
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createGenetikaPoljeI18n(
  data: Omit<GenetikaPoljaI18n, 'id' | 'created_at' | 'updated_at'>
): Promise<GenetikaPoljaI18n> {
  const novoPolje: GenetikaPoljaI18n = {
    id: crypto.randomUUID(),
    ...data,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  const { error } = await supabase.from('genetika_polja_i18n').insert([novoPolje]);
  if (error) throw new Error(error.message);
  genetikaPoljaI18n.update((p) => [...p, novoPolje]);
  return novoPolje;
}

export async function updateGenetikaPoljeI18n(
  id: string,
  updates: Partial<Omit<GenetikaPoljaI18n, 'id' | 'created_at'>>
): Promise<void> {
  const updated = { ...updates, updated_at: new Date().toISOString() };
  const { error } = await supabase.from('genetika_polja_i18n').update(updated).eq('id', id);
  if (error) throw new Error(error.message);
  genetikaPoljaI18n.update((polja) =>
    polja.map((p) => (p.id === id ? { ...p, ...updated } : p))
  );
}

export async function deleteGenetikaPoljeI18n(id: string): Promise<void> {
  const { error } = await supabase.from('genetika_polja_i18n').delete().eq('id', id);
  if (error) throw new Error(error.message);
  genetikaPoljaI18n.update((polja) => polja.filter((p) => p.id !== id));
}
