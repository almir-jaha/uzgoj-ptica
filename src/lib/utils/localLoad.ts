/**
 * Brzo učitavanje iz Dexie (lokalni IndexedDB) bez čekanja Supabase mreže.
 * Koristi se za inicijalni prikaz podataka — Supabase sync ide u pozadini.
 */
import { db } from '$lib/db/dexie';
import { sezone, kavezi } from '$lib/stores/sezona';
import { parovi } from '$lib/stores/parovi';
import { ciklusi, faze } from '$lib/stores/ciklus';
import { ptice } from '$lib/stores/ptice';

export async function lokalnoSezone(userId: string) {
	const data = await db.sezona.where('user_id').equals(userId).toArray();
	sezone.set(data);
	return data;
}

export async function lokalnoPodaci(sezonaId: string, userId: string) {
	const [lKavezi, lParovi, lCiklusi, lFaze, lPtice] = await Promise.all([
		db.kavezi.where('sezona_id').equals(sezonaId).sortBy('oznaka'),
		db.parovi.where('sezona_id').equals(sezonaId).toArray(),
		db.ciklusi.where('sezona_id').equals(sezonaId).toArray(),
		db.faze_ciklusa.toArray(),
		db.ptice.where('user_id').equals(userId).toArray()
	]);

	kavezi.set(lKavezi);
	parovi.set(lParovi);
	ciklusi.set(lCiklusi);
	faze.set(lFaze);
	ptice.set(lPtice);
}
