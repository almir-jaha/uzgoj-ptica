export type VrstaGrupa = 'kanarinac_finke' | 'golubovi' | 'papagaji' | 'ostalo';
export type PoljeTip = 'select' | 'text' | 'tags' | 'stars' | 'number';

export interface GenetikaPolje {
	kljuc: string;
	naziv: string;
	tip: PoljeTip;
	opcije?: string[];
	min?: number;
	max?: number;
	sekcija: 'genetika' | 'ocjena';
	placeholder?: string;
}

export const GENETIKA_SHEME: Record<VrstaGrupa, GenetikaPolje[]> = {
	kanarinac_finke: [
		{
			kljuc: 'vizuelna_mutacija',
			naziv: 'Mutacija',
			tip: 'text',
			opcije: ['Lutino', 'Albino', 'Opal', 'Izabela', 'Crveni mozaik', 'Bijeli mozaik', 'Agat', 'Satinet', 'Divlji tip', 'Bijeli recsivni'],
			placeholder: 'npr. Lutino, Opal...',
			sekcija: 'genetika'
		},
		{
			kljuc: 'skrivena_mutacija',
			naziv: 'Skrivena mutacija (Split /…/)',
			tip: 'tags',
			opcije: ['Lutino', 'Albino', 'Opal', 'Izabela', 'Bijela', 'Plava', 'Recesivna bijela', 'Agat', 'Satinet'],
			sekcija: 'genetika'
		},
		{
			kljuc: 'stav',
			naziv: 'Stav i držanje',
			tip: 'select',
			opcije: ['', 'Odličan (Izložbeni)', 'Dobar', 'Prosječan', 'Slabiji'],
			sekcija: 'genetika'
		},
		{
			kljuc: 'kategorija_pjesme',
			naziv: 'Kategorija pjesme',
			tip: 'select',
			opcije: ['', 'Malinois', 'Timbrado', 'Roller', 'Klasični', 'Waterschlager'],
			sekcija: 'genetika'
		},
		{
			kljuc: 'duzina_cm',
			naziv: 'Dužina tijela (cm)',
			tip: 'number',
			min: 8,
			max: 25,
			placeholder: 'npr. 14',
			sekcija: 'genetika'
		},
		{
			kljuc: 'ocjena_stav',
			naziv: 'Stav i konstitucija',
			tip: 'stars',
			min: 1,
			max: 5,
			sekcija: 'ocjena'
		},
		{
			kljuc: 'ocjena_perje',
			naziv: 'Kvalitet perja / Dužina',
			tip: 'stars',
			min: 1,
			max: 5,
			sekcija: 'ocjena'
		}
	],

	golubovi: [
		{
			kljuc: 'boja_perja',
			naziv: 'Osnovna boja perja',
			tip: 'select',
			opcije: ['', 'Plava kova', 'Plava prugasta', 'Plava', 'Crvena', 'Žuta', 'Bijela', 'Crna', 'Mješana'],
			sekcija: 'genetika'
		},
		{
			kljuc: 'tip_oka',
			naziv: 'Tip oka (Eye sign)',
			tip: 'select',
			opcije: ['', 'Gravel', 'Bull', 'Yellow/Rich', 'Pearl', 'Žuto'],
			sekcija: 'genetika'
		},
		{
			kljuc: 'specijalizacija',
			naziv: 'Specijalizacija pruge',
			tip: 'select',
			opcije: ['', 'Kratke staze / Brzina', 'Srednje staze', 'Duge staze / Maraton', 'Sve pruge'],
			sekcija: 'genetika'
		},
		{
			kljuc: 'stil_leta',
			naziv: 'Stil letenja',
			tip: 'tags',
			opcije: ['Samostalan letač', 'Prati jato', 'Otporan na vjetar', 'Brzi start', 'Izdržljiv', 'Dobar u kiši'],
			sekcija: 'genetika'
		},
		{
			kljuc: 'ocjena_orijentacija',
			naziv: 'Sposobnost orijentacije',
			tip: 'stars',
			min: 1,
			max: 5,
			sekcija: 'ocjena'
		},
		{
			kljuc: 'ocjena_konstitucija',
			naziv: 'Stav i konstitucija',
			tip: 'stars',
			min: 1,
			max: 5,
			sekcija: 'ocjena'
		}
	],

	papagaji: [
		{
			kljuc: 'vizuelna_mutacija',
			naziv: 'Mutacija',
			tip: 'text',
			opcije: ['Lutino', 'Albino', 'Opal', 'Izabela', 'Plava', 'Bijela', 'Siva', 'Zelena', 'Žuta', 'Violet'],
			placeholder: 'npr. Lutino, Plavi...',
			sekcija: 'genetika'
		},
		{
			kljuc: 'skrivena_mutacija',
			naziv: 'Skrivena mutacija (Split)',
			tip: 'tags',
			opcije: ['Lutino', 'Albino', 'Plava', 'Bijela', 'Ino', 'Opal', 'Violet', 'Siva'],
			sekcija: 'genetika'
		},
		{
			kljuc: 'stav',
			naziv: 'Stav i držanje',
			tip: 'select',
			opcije: ['', 'Odličan (Izložbeni)', 'Dobar', 'Prosječan'],
			sekcija: 'genetika'
		},
		{
			kljuc: 'duzina_cm',
			naziv: 'Dužina tijela (cm)',
			tip: 'number',
			min: 10,
			max: 100,
			placeholder: 'npr. 30',
			sekcija: 'genetika'
		},
		{
			kljuc: 'ocjena_stav',
			naziv: 'Stav i konstitucija',
			tip: 'stars',
			min: 1,
			max: 5,
			sekcija: 'ocjena'
		},
		{
			kljuc: 'ocjena_perje',
			naziv: 'Kvalitet perja',
			tip: 'stars',
			min: 1,
			max: 5,
			sekcija: 'ocjena'
		}
	],

	ostalo: []
};

export function getGrupaShema(grupa: string | undefined): GenetikaPolje[] {
	return GENETIKA_SHEME[(grupa as VrstaGrupa) ?? 'ostalo'] ?? [];
}

// Per-species schema: čita iz custom_fields.genetika_polja, fallback na hardkodirani shemu po grupi
export function getSchemaForVrsta(vrsta: { grupa?: string; custom_fields?: Record<string, unknown> } | undefined): GenetikaPolje[] {
	const customPolja = vrsta?.custom_fields?.genetika_polja;
	if (Array.isArray(customPolja) && customPolja.length > 0) {
		return customPolja as GenetikaPolje[];
	}
	return getGrupaShema(vrsta?.grupa);
}

// Vraća string ocjena za prikaz u PDF-u (npr. "Stav: ★★★★☆  Perje: ★★★★★")
export function buildScoreStr(genetika: Record<string, unknown> | undefined): string {
	if (!genetika) return '';
	const scoreMap: Record<string, string> = {
		ocjena_stav: 'Stav',
		ocjena_perje: 'Perje',
		ocjena_orijentacija: 'Orij.',
		ocjena_konstitucija: 'Konst.'
	};
	const parts: string[] = [];
	for (const [key, label] of Object.entries(scoreMap)) {
		const val = genetika[key];
		if (typeof val === 'number' && val >= 1 && val <= 5) {
			parts.push(`${label}: ${'★'.repeat(val)}${'☆'.repeat(5 - val)}`);
		}
	}
	return parts.join('   ');
}
