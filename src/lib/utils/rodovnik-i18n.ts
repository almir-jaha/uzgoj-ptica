export type RodovnikLang = 'bs' | 'hr' | 'en';

// Mapiranje app jezika (langStore) na podržane rodovnik jezike
export function appLangToRodovnikLang(lang: string): RodovnikLang {
	if (lang === 'bs' || lang === 'hr') return 'bs';
	if (lang === 'en') return 'en';
	return 'en';
}

export interface RodovnikLabels {
	otac: string;
	majka: string;
	djed: string;
	baka: string;
	pradjed: string;
	prabaka: string;
	spolM: string;
	spolZ: string;
	skeniraj: string;
	qrKod: string;
	zaVise: string;
	informacija: string;
	datum: string;
	potpisUzgajivaca: string;
	rodovnikNaslov: string;
}

export const RODOVNIK_LANGS: Record<RodovnikLang, { label: string; flag: string }> = {
	bs: { label: 'Bosanski', flag: '🇧🇦' },
	hr: { label: 'Hrvatski', flag: '🇭🇷' },
	en: { label: 'English', flag: '🇬🇧' }
};

export const rodovnikI18n: Record<RodovnikLang, RodovnikLabels> = {
	bs: {
		otac: 'OTAC', majka: 'MAJKA', djed: 'DJED', baka: 'BAKA',
		pradjed: 'PRADJED', prabaka: 'PRABAKA',
		spolM: 'M', spolZ: 'Ž',
		skeniraj: 'SKENIRAJ', qrKod: 'QR KOD',
		zaVise: 'za više', informacija: 'informacija',
		datum: 'Datum', potpisUzgajivaca: 'Potpis uzgajivača',
		rodovnikNaslov: 'RODOVNIK'
	},
	hr: {
		otac: 'OTAC', majka: 'MAJKA', djed: 'DJED', baka: 'BAKA',
		pradjed: 'PRADJED', prabaka: 'PRABAKA',
		spolM: 'M', spolZ: 'Ž',
		skeniraj: 'SKENIRAJ', qrKod: 'QR KOD',
		zaVise: 'za više', informacija: 'informacija',
		datum: 'Datum', potpisUzgajivaca: 'Potpis uzgajivača',
		rodovnikNaslov: 'RODOVNIK'
	},
	en: {
		otac: 'FATHER', majka: 'MOTHER', djed: 'GRANDFATHER', baka: 'GRANDMOTHER',
		pradjed: 'GR-GRANDFATHER', prabaka: 'GR-GRANDMOTHER',
		spolM: 'M', spolZ: 'F',
		skeniraj: 'SCAN', qrKod: 'QR CODE',
		zaVise: 'for more', informacija: 'information',
		datum: 'Date', potpisUzgajivaca: "Breeder's signature",
		rodovnikNaslov: 'PEDIGREE'
	}
};
