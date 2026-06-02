import { writable } from 'svelte/store';
import { supabase } from '$lib/supabase/client';
import type { Zdravlje, ZdravljeTip } from '$lib/db/schema';

export const zdravlje = writable<Zdravlje[]>([]);

export const TIP_OPCIJE: { value: ZdravljeTip; label: string; ikona: string }[] = [
	{ value: 'bolest',     label: 'Bolest',         ikona: '🤒' },
	{ value: 'preventiva', label: 'Preventiva',      ikona: '💉' },
	{ value: 'vakcinacija',label: 'Vakcinacija',     ikona: '🛡️' },
	{ value: 'zapazanje',  label: 'Zapažanje',       ikona: '📝' },
	{ value: 'ostalo',     label: 'Ostalo',          ikona: '📋' },
];

export async function loadZdravlje(userId: string, pticaId?: string): Promise<void> {
	let query = supabase
		.from('zdravlje')
		.select('*')
		.eq('user_id', userId)
		.order('datum', { ascending: false });

	if (pticaId) {
		// Ptičini tretmani + masovni tretmani njene uzgajivačnice
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
