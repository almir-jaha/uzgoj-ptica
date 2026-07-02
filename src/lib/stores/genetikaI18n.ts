import { writable, derived } from 'svelte/store';
import { supabase } from '$lib/supabase/client';
import { locale } from '$lib/i18n/locale';
import type { GenetikaPoljaI18n } from '$lib/db/schema';

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

// Derived: kljuc → niz prevedenih prikaz-labela za opcije (stored BS vrijednost ostaje ista)
export const genetikaOpcijeDisplay = derived(
	[genetikaPoljaI18n, locale],
	([$polja, $locale]) => {
		const map: Record<string, string[]> = {};
		for (const p of $polja) {
			if (!p.opcije?.length) continue;
			const prevodi = p.opcije_jezicima as Record<string, string[]> | undefined;
			const prevedene = prevodi?.[$locale] ?? prevodi?.bs ?? p.opcije;
			// Samo koristi prevod ako je isti broj opcija (konzistentnost sa stored vrijednostima)
			map[p.polje_kljuc] = prevedene?.length === p.opcije.length ? prevedene : p.opcije;
		}
		return map;
	}
);

// Derived: kljuc → prevedeni placeholder za trenutni jezik
export const genetikaPlaceholderi = derived(
	[genetikaPoljaI18n, locale],
	([$polja, $locale]) => {
		const map: Record<string, string> = {};
		for (const p of $polja) {
			const ph = p.placeholder_jezicima as Record<string, string> | undefined;
			if (!ph) continue;
			const val = ph[$locale] ?? ph.bs ?? '';
			if (val) map[p.polje_kljuc] = val;
		}
		return map;
	}
);

export async function loadGenetikaPolja(): Promise<void> {
	try {
		const { data, error } = await supabase
			.from('genetika_polja_i18n')
			.select('id, polje_kljuc, nazivi_jezicima, opcije, opcije_jezicima, placeholder_jezicima')
			.order('vrsta_grupa, redoslijed');
		if (!error && data) genetikaPoljaI18n.set(data as GenetikaPoljaI18n[]);
	} catch {
		// Tiho — labels imaju fallback na hardkodirane i18n vrijednosti
	}
}
