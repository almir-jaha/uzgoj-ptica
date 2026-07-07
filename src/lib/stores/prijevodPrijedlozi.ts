import { writable } from 'svelte/store';
import { supabase } from '$lib/supabase/client';
import type { PrijevodPrijedlog } from '$lib/db/schema';
import type { LangCode } from '$lib/i18n/locale';

export const mojiPrijedlozi = writable<PrijevodPrijedlog[]>([]);
export const sviPrijedloziPending = writable<PrijevodPrijedlog[]>([]);
export const prijedlogLoading = writable(false);

export async function submitPrijedlog(data: {
	termin_kljuc: string;
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

// Prihvatanje: server endpoint upisuje novi prijevod u odgovarajući src/lib/i18n/<jezik>.ts fajl
// (radi samo lokalno, npm run dev — vidi napomenu u +server.ts), pa se status ažurira u bazi.
export async function prihvatiPrijedlog(
	prijedlog: PrijevodPrijedlog,
	accessToken: string
): Promise<void> {
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
