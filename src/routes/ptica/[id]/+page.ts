import { get } from 'svelte/store';
import { supabase } from '$lib/supabase/client';
import { t } from '$lib/i18n';

export const ssr = false;

export interface BirdNode {
	id: string;
	user_id: string;
	spol: string;
	prstena_oznaka?: string;
	prsten_redni_broj?: number;
	naziv?: string;
	otac_id?: string;
	majka_id?: string;
	datum_rodjenja?: string;
	godina?: number;
	boja?: string;
	status_ptica?: string;
	rezultati?: string;
	napomena_rodovnik?: string;
	slika_url?: string;
	created_at: string;
	vrsta_naziv?: string;
	otac?: BirdNode | null;
	majka?: BirdNode | null;
}

export interface BreederInfo {
	naziv?: string;
	ime_prezime?: string;
	adresa?: string;
	telefon?: string;
	slika_url?: string;
}

async function fetchBird(id: string, depth: number): Promise<BirdNode | null> {
	if (!id || depth > 4) return null;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const { data, error } = await (supabase as any)
		.from('ptice')
		.select('*, vrsta_ptica(naziv)')
		.eq('id', id)
		.maybeSingle();

	if (error || !data) {
		console.error('[ptica/[id]] fetchBird nije uspio', { id, depth, error, data });
		return null;
	}

	const node: BirdNode = {
		id: data.id,
		user_id: data.user_id,
		spol: data.spol,
		prstena_oznaka: data.prstena_oznaka,
		prsten_redni_broj: data.prsten_redni_broj,
		naziv: data.naziv,
		otac_id: data.otac_id,
		majka_id: data.majka_id,
		datum_rodjenja: data.datum_rodjenja,
		godina: data.godina,
		boja: data.boja,
		status_ptica: data.status_ptica,
		rezultati: data.rezultati,
		napomena_rodovnik: data.napomena_rodovnik,
		slika_url: data.slika_url,
		created_at: data.created_at,
		vrsta_naziv: data.vrsta_ptica?.naziv
	};

	if (depth < 4) {
		const [otac, majka] = await Promise.all([
			data.otac_id ? fetchBird(data.otac_id, depth + 1) : Promise.resolve(null),
			data.majka_id ? fetchBird(data.majka_id, depth + 1) : Promise.resolve(null)
		]);
		node.otac = otac;
		node.majka = majka;
	}

	return node;
}

export async function load({ params }: { params: { id: string } }) {
	const { id } = params;

	try {
		const tree = await fetchBird(id, 1);

		if (!tree) {
			return { tree: null, breeder: null, error: get(t).pticaJavno.naslovNijePronadjena };
		}

		// Dohvati uzgajivačnicu ptice (via uzgajivacnica_id) ili prvu uzgajivačnicu vlasnika
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const { data: breeder } = await (supabase as any)
			.from('uzgajivacnice')
			.select('naziv, ime_prezime, adresa, telefon, slika_url')
			.eq('user_id', tree.user_id)
			.maybeSingle();

		return { tree, breeder: breeder as BreederInfo | null, error: null };
	} catch (err) {
		console.error('[ptica/[id]] load() je bacio grešku', err);
		return { tree: null, breeder: null, error: get(t).pticaJavno.greskaUcitavanja };
	}
}
