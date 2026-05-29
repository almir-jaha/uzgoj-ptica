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
      // Briši zastarjele Dexie zapise koji ne postoje u Supabase
      // Ovo rješava problem kada korisnik ručno izmijeni bazu
      const supabaseIds = new Set(data.map((s) => s.id));
      const staleIds = localSezone.filter((s) => !supabaseIds.has(s.id)).map((s) => s.id);
      if (staleIds.length > 0) {
        await Promise.all([
          db.kavezi.where('sezona_id').anyOf(staleIds).delete(),
          db.parovi.where('sezona_id').anyOf(staleIds).delete(),
          db.ciklusi.where('sezona_id').anyOf(staleIds).delete(),
          db.sezona.where('id').anyOf(staleIds).delete()
        ]);
        // Ako je pregledna sezona postala nevažeća, resetuj je
        const currentPregled = get(sezonaZaPregled);
        if (currentPregled && staleIds.includes(currentPregled)) {
          sezonaZaPregled.set(null);
        }
      }

      await db.sezona.bulkPut(data);
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
    // Provjera: postoji li aktivna sezona za istu godinu unutar iste uzgajivačnice?
    const postojece = get(filtriraneSezone);
    const duplikat = postojece.find(
      (s) => s.godina === data.godina && s.status === 'aktiva'
    );
    if (duplikat) {
      throw new Error(
        `Sezona za godinu ${data.godina} već postoji i aktivna je. Završite je prije kreiranja nove.`
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

export const sezonaKavezi = (sezonaId: string) =>
  derived(kavezi, ($kavezi) => $kavezi.filter((k) => k.sezona_id === sezonaId));

export const aktivniKavezi = derived(kavezi, ($kavezi) =>
  $kavezi.filter((k) => k.status === 'aktivan')
);

export const alarmKavezi = derived(kavezi, ($kavezi) =>
  $kavezi.filter((k) => k.status === 'alarm')
);
