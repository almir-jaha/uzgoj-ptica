import { writable } from 'svelte/store';
import type { Par } from '../db/schema';
import { supabase } from '../supabase/client';
import { db, addOfflineAction } from '../db/dexie';

export const parovi = writable<Par[]>([]);

// Učitaj parove za sezonu
export async function loadParovi(sezonaId: string) {
  try {
    const localParovi = await db.parovi.where('sezona_id').equals(sezonaId).toArray();
    parovi.set(localParovi);

    const { data, error } = await supabase
      .from('parovi')
      .select('*')
      .eq('sezona_id', sezonaId);

    if (error) throw error;

    if (data) {
      await db.parovi.bulkPut(data);
      parovi.set(data);
    }
  } catch (err) {
    console.error('Greška pri učitavanju parova:', err);
  }
}

// Kreiraj novi par
export async function createPar(
  sezonaId: string,
  ptica1Id: string,
  ptica2Id: string,
  datumFormiranja: string,
  napomena?: string
) {
  try {
    const newPar: Par = {
      id: crypto.randomUUID(),
      sezona_id: sezonaId,
      ptica1_id: ptica1Id,
      ptica2_id: ptica2Id,
      status: 'aktivan',
      datum_formiranja: datumFormiranja,
      napomena,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await db.parovi.add(newPar);
    parovi.update((p) => [...p, newPar]);
    await addOfflineAction('create', 'parovi', newPar);

    const { error } = await supabase.from('parovi').insert([newPar]);
    if (error && error.code !== 'PGRST116') throw error;

    return newPar;
  } catch (err) {
    console.error('Greška pri kreiranju para:', err);
    throw err;
  }
}

// Završi par (preparivanje - novi par ili završetak)
export async function finishPar(parId: string, status: 'završen' | 'razdvojen') {
  try {
    const updated = {
      status,
      updated_at: new Date().toISOString()
    };

    await db.parovi.update(parId, updated);
    parovi.update((p) =>
      p.map((pr) => (pr.id === parId ? { ...pr, ...updated } : pr))
    );
    await addOfflineAction('update', 'parovi', { id: parId, ...updated });

    const { error } = await supabase.from('parovi').update(updated).eq('id', parId);
    if (error && error.code !== 'PGRST116') throw error;
  } catch (err) {
    console.error('Greška pri završetku para:', err);
    throw err;
  }
}

// Pregled ptice kroz sve parove (istorija)
export async function getPticaHistory(pticaId: string) {
  try {
    const allParovi = await db.parovi.where('ptica1_id').equals(pticaId).or('ptica2_id').equals(pticaId).toArray();
    return allParovi.sort((a, b) => a.datum_formiranja.localeCompare(b.datum_formiranja));
  } catch (err) {
    console.error('Greška pri učitavanju istorije ptice:', err);
    return [];
  }
}
