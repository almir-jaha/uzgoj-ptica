import { writable } from 'svelte/store';
import { supabase } from '$lib/supabase/client';
import type { PrijevodPrijedlog, PrijevodIzvor } from '$lib/db/schema';
import type { LangCode } from '$lib/i18n/locale';
import { updateFazaNazivJezik, updateVrstaNazivJezik } from '$lib/stores/admin';

export const mojiPrijedlozi = writable<PrijevodPrijedlog[]>([]);
export const sviPrijedloziPending = writable<PrijevodPrijedlog[]>([]);
export const prijedlogLoading = writable(false);

export async function submitPrijedlog(data: {
	termin_kljuc: string;
	izvor: PrijevodIzvor;
	izvor_id?: string | null;
	jezik: LangCode;
	trenutni_prijevod: string;
	prijedlog: string;
	komentar?: string;
	user_id: string;
}): Promise<PrijevodPrijedlog> {
	const { data: inserted, error } = await supabase
		.from('prijevod_prijedlozi')
		.insert([{ ...data, status: 'pending' }])
		.select()
		.single();
	if (error) throw new Error(error.message);
	const noviPrijedlog = inserted as PrijevodPrijedlog;
	mojiPrijedlozi.update((list) => [noviPrijedlog, ...list]);
	return noviPrijedlog;
}

export async function loadMojiPrijedlozi(userId: string): Promise<void> {
	const { data, error } = await supabase
		.from('prijevod_prijedlozi')
		.select('*')
		.eq('user_id', userId)
		.order('created_at', { ascending: false });
	if (error) throw new Error(error.message);
	mojiPrijedlozi.set((data ?? []) as PrijevodPrijedlog[]);
}

// ── Admin ─────────────────────────────────────────────────────

export async function loadSviPrijedlozi(): Promise<void> {
	prijedlogLoading.set(true);
	try {
		const { data, error } = await supabase
			.from('prijevod_prijedlozi')
			.select('*')
			.eq('status', 'pending')
			.order('created_at', { ascending: true });
		if (error) throw new Error(error.message);
		sviPrijedloziPending.set((data ?? []) as PrijevodPrijedlog[]);
	} finally {
		prijedlogLoading.set(false);
	}
}

// i18n fajlovi se mijenjaju preko server endpointa (Node fs, samo lokalno — npm run dev).
// faza_ciklusa/vrsta_ptica idu direktno preko Supabase update-a (radi svugdje, i na Vercelu).
async function primijeniPrijevod(prijedlog: PrijevodPrijedlog, accessToken: string): Promise<void> {
	if (prijedlog.izvor === 'i18n') {
		const res = await fetch('/admin/prijevod-prijedlozi', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${accessToken}`
			},
			body: JSON.stringify({
				jezik: prijedlog.jezik,
				termin_kljuc: prijedlog.termin_kljuc,
				prijedlog: prijedlog.prijedlog
			})
		});
		if (!res.ok) {
			const body = await res.json().catch(() => null);
			throw new Error(body?.message ?? `Greška pri ažuriranju i18n fajla (${res.status})`);
		}
		return;
	}

	if (!prijedlog.izvor_id) throw new Error(`Nedostaje izvor_id za izvor "${prijedlog.izvor}"`);

	if (prijedlog.izvor === 'faza_ciklusa') {
		await updateFazaNazivJezik(prijedlog.izvor_id, prijedlog.jezik, prijedlog.prijedlog);
		return;
	}

	if (prijedlog.izvor === 'vrsta_ptica') {
		await updateVrstaNazivJezik(prijedlog.izvor_id, prijedlog.jezik, prijedlog.prijedlog);
		return;
	}
}

export async function prihvatiPrijedlog(
	prijedlog: PrijevodPrijedlog,
	accessToken: string
): Promise<void> {
	await primijeniPrijevod(prijedlog, accessToken);

	const { error } = await supabase
		.from('prijevod_prijedlozi')
		.update({ status: 'prihvaćen' })
		.eq('id', prijedlog.id);
	if (error) throw new Error(error.message);

	sviPrijedloziPending.update((list) => list.filter((p) => p.id !== prijedlog.id));
}

export async function odbijPrijedlog(id: string): Promise<void> {
	const { error } = await supabase
		.from('prijevod_prijedlozi')
		.update({ status: 'odbijen' })
		.eq('id', id);
	if (error) throw new Error(error.message);
	sviPrijedloziPending.update((list) => list.filter((p) => p.id !== id));
}
