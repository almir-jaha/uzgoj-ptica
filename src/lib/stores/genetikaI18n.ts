import { writable, derived } from 'svelte/store';
import { supabase } from '$lib/supabase/client';
import { locale } from '$lib/i18n/locale';
import type { GenetikaPoljaI18n } from '$lib/db/schema';

// Javni store — učitava se za sve prijavljene korisnike (tabela je public read)
export const genetikaPoljaI18n = writable<GenetikaPoljaI18n[]>([]);

// Derived: kljuc → prevedeni naziv za trenutni jezik (fallback na bs)
export const genetikaLabels = derived(
	[genetikaPoljaI18n, locale],
	([$polja, $locale]) => {
		const map: Record<string, string> = {};
		for (const p of $polja) {
			const nazivi = p.nazivi_jezicima as Record<string, string> | undefined;
			if (!nazivi) continue;
			map[p.polje_kljuc] = nazivi[$locale] ?? nazivi.bs ?? '';
		}
		return map;
	}
);

export async function loadGenetikaPolja(): Promise<void> {
	try {
		const { data, error } = await supabase
			.from('genetika_polja_i18n')
			.select('id, polje_kljuc, nazivi_jezicima')
			.order('vrsta_grupa, redoslijed');
		if (!error && data) genetikaPoljaI18n.set(data as GenetikaPoljaI18n[]);
	} catch {
		// Tiho — labels imaju fallback na hardkodirane i18n vrijednosti
	}
}
