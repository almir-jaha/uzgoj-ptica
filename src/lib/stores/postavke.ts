import { writable } from 'svelte/store';
import { supabase } from '$lib/supabase/client';
import { db } from '$lib/db/dexie';
import type { UserSettings } from '$lib/db/schema';

export const postavke = writable<UserSettings | null>(null);

export async function loadPostavke(userId: string): Promise<void> {
	// Brzo iz Dexie
	const local = await db.user_settings.get(userId);
	if (local) postavke.set(local);

	// Osvježi iz Supabase
	const { data } = await supabase
		.from('user_settings')
		.select('*')
		.eq('user_id', userId)
		.maybeSingle();

	if (data) {
		await db.user_settings.put(data);
		postavke.set(data);
	}
}

export async function savePostavke(userId: string, izmjene: Partial<Omit<UserSettings, 'user_id' | 'updated_at'>>): Promise<void> {
	const nova: UserSettings = {
		user_id: userId,
		updated_at: new Date().toISOString(),
		...izmjene
	};

	const { error } = await supabase
		.from('user_settings')
		.upsert(nova, { onConflict: 'user_id' });

	if (!error) {
		await db.user_settings.put(nova);
		postavke.set(nova);
	}
}
