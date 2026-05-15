/**
 * Provjera je li greška od Supabase poziva uzrokovana mrežnom nedostupnošću.
 * Kada smo offline, lokalni podaci (Dexie + offline queue) su već sačuvani
 * pa mrežnu grešku ne trebamo prikazati korisniku.
 */
export function isMreznaGreska(error: unknown): boolean {
	if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
	if (error instanceof Error) {
		const msg = error.message.toLowerCase();
		return (
			msg.includes('failed to fetch') ||
			msg.includes('networkerror') ||
			msg.includes('network request failed') ||
			msg.includes('fetch error')
		);
	}
	// Supabase PostgREST greška bez koda — može biti mrežni timeout
	if (typeof error === 'object' && error !== null) {
		const e = error as Record<string, unknown>;
		if (!e.code && e.message) return isMreznaGreska(new Error(String(e.message)));
	}
	return false;
}
