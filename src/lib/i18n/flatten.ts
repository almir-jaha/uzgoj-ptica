// Pretvara ugniježđeni i18n objekat (npr. { ptice: { title: 'Ptice' } }) u ravnu mapu
// dot-path ključ → tekst (npr. { 'ptice.title': 'Ptice' }). Koristi se za centralnu
// /prijevodi stranicu koja lista sve termine za predlaganje prijevoda.
export function flattenTranslations(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
	const rezultat: Record<string, string> = {};

	for (const [key, value] of Object.entries(obj)) {
		const kljuc = prefix ? `${prefix}.${key}` : key;

		if (typeof value === 'string') {
			rezultat[kljuc] = value;
		} else if (value && typeof value === 'object') {
			Object.assign(rezultat, flattenTranslations(value as Record<string, unknown>, kljuc));
		}
	}

	return rezultat;
}
