import { json, error } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { supabase } from '$lib/supabase/client';
import { isAdmin } from '$lib/stores/admin';
import { updateTranslationInFile } from '$lib/server/i18nFileUpdater';
import type { RequestHandler } from './$types';

// Prihvatanje prijedloga ažurira i18n fajl direktno na disku — moguće je samo
// lokalno (npm run dev). Na Vercelu je fajl-sistem read-only/efemeran, pa bi
// izmjena nestala nakon što funkcija završi i nikad ne bi stigla u git.
export const POST: RequestHandler = async ({ request }) => {
	if (!dev) {
		throw error(
			503,
			'Automatsko ažuriranje i18n fajla radi samo lokalno (npm run dev). ' +
				'Na Vercelu je fajl-sistem read-only — pokreni prihvatanje lokalno pa commituj i deployuj izmjenu.'
		);
	}

	const authHeader = request.headers.get('authorization');
	const token = authHeader?.replace(/^Bearer\s+/i, '');
	if (!token) throw error(401, 'Nedostaje autorizacija');

	const { data: userData, error: userError } = await supabase.auth.getUser(token);
	if (userError || !userData.user || !isAdmin(userData.user.email)) {
		throw error(403, 'Samo admin može izvršiti ovu akciju');
	}

	const body = await request.json().catch(() => null);
	const jezik = body?.jezik;
	const terminKljuc = body?.termin_kljuc;
	const prijedlog = body?.prijedlog;

	if (!jezik || !terminKljuc || !prijedlog) {
		throw error(400, 'Nedostaju podaci (jezik, termin_kljuc, prijedlog)');
	}

	try {
		updateTranslationInFile(jezik, terminKljuc, prijedlog);
	} catch (err) {
		throw error(500, err instanceof Error ? err.message : 'Greška pri ažuriranju i18n fajla');
	}

	return json({ success: true });
};
