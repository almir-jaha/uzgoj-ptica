import { writable, derived } from 'svelte/store';
import { supabase } from '$lib/supabase/client';
import { t } from '$lib/i18n';
import type { Zdravlje, ZdravljeTip } from '$lib/db/schema';

export const zdravlje = writable<Zdravlje[]>([]);

export const tipOpcije = derived(t, ($t): { value: ZdravljeTip; label: string; ikona: string }[] => [
	{ value: 'bolest',      label: $t.zdravlje.tip.bolest,      ikona: '🤒' },
	{ value: 'preventiva',  label: $t.zdravlje.tip.preventiva,  ikona: '💉' },
	{ value: 'vakcinacija', label: $t.zdravlje.tip.vakcinacija, ikona: '🛡️' },
	{ value: 'zapazanje',   label: $t.zdravlje.tip.zapazanje,   ikona: '📝' },
	{ value: 'ostalo',      label: $t.zdravlje.tip.ostalo,      ikona: '📋' },
]);

export async function loadZdravlje(userId: string, pticaId?: string): Promise<void> {
	let query = supabase
		.from('zdravlje')
		.select('*')
		.eq('user_id', userId)
		.order('datum', { ascending: false })
		.order('created_at', { ascending: false });

	if (pticaId) {
		query = query.or(`ptica_id.eq.${pticaId},ptica_id.is.null`);
	}

	const { data, error } = await query;
	if (!error && data) zdravlje.set(data as Zdravlje[]);
}

export async function loadZdravljeZaPticu(userId: string, pticaId: string, uzgajivacnicaId?: string): Promise<Zdravlje[]> {
	let orClause = `ptica_id.eq.${pticaId}`;
	if (uzgajivacnicaId) orClause += `,and(ptica_id.is.null,uzgajivacnica_id.eq.${uzgajivacnicaId})`;

	const { data } = await supabase
		.from('zdravlje')
		.select('*')
		.eq('user_id', userId)
		.or(orClause)
		.order('datum', { ascending: false });

	return (data ?? []) as Zdravlje[];
}

export async function createZdravlje(
	data: Omit<Zdravlje, 'id' | 'created_at' | 'updated_at'>
): Promise<Zdravlje> {
	const nova: Zdravlje = {
		...data,
		id: crypto.randomUUID(),
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString()
	};
	const { error } = await supabase.from('zdravlje').insert([nova]);
	if (error) throw new Error(error.message);
	zdravlje.update((list) => [nova, ...list]);
	return nova;
}

export async function updateZdravlje(id: string, updates: Partial<Omit<Zdravlje, 'id' | 'user_id' | 'created_at'>>): Promise<void> {
	const updated = { ...updates, updated_at: new Date().toISOString() };
	const { error } = await supabase.from('zdravlje').update(updated).eq('id', id);
	if (error) throw new Error(error.message);
	zdravlje.update((list) => list.map((z) => z.id === id ? { ...z, ...updated } : z));
}

export async function deleteZdravlje(id: string): Promise<void> {
	const { error } = await supabase.from('zdravlje').delete().eq('id', id);
	if (error) throw new Error(error.message);
	zdravlje.update((list) => list.filter((z) => z.id !== id));
}

export async function loadZdravljeZaSekciju(sekcijaId: string): Promise<Zdravlje[]> {
	const { data } = await supabase
		.from('zdravlje')
		.select('*')
		.eq('sekcija_id', sekcijaId)
		.order('datum', { ascending: false });
	return (data ?? []) as Zdravlje[];
}

export async function loadMasovniTretmani(userId: string, uzgajivacnicaId?: string): Promise<Zdravlje[]> {
	let query = supabase
		.from('zdravlje')
		.select('*')
		.eq('user_id', userId)
		.is('ptica_id', null)
		.order('datum', { ascending: false });
	if (uzgajivacnicaId) {
		query = query.eq('uzgajivacnica_id', uzgajivacnicaId);
	}
	const { data } = await query;
	return (data ?? []) as Zdravlje[];
}
