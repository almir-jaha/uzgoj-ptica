import { get } from 'svelte/store';
import { goto } from '$app/navigation';
import { page } from '$app/stores';
import Shepherd from 'shepherd.js';
import type { Tour } from 'shepherd.js';
import type { Translations } from '$lib/i18n';

export function waitForElement(selector: string, timeoutMs = 3000): Promise<void> {
	return new Promise((resolve) => {
		const start = Date.now();
		function check() {
			if (document.querySelector(selector) || Date.now() - start > timeoutMs) {
				resolve();
				return;
			}
			requestAnimationFrame(check);
		}
		check();
	});
}

export function waitForAnyElement(selectors: string[], timeoutMs = 3000): Promise<void> {
	return new Promise((resolve) => {
		const start = Date.now();
		function check() {
			if (selectors.some((s) => document.querySelector(s)) || Date.now() - start > timeoutMs) {
				resolve();
				return;
			}
			requestAnimationFrame(check);
		}
		check();
	});
}

export async function ensureRoute(path: string): Promise<void> {
	if (!get(page).url.pathname.startsWith(path)) {
		await goto(path);
	}
}

export function elFirst(selectors: string[]): () => HTMLElement | null {
	return () => {
		for (const s of selectors) {
			const found = document.querySelector<HTMLElement>(s);
			if (found) return found;
		}
		return null;
	};
}

export function createTour(): Tour {
	return new Shepherd.Tour({
		useModalOverlay: true,
		defaultStepOptions: {
			scrollTo: { behavior: 'smooth', block: 'center' },
			cancelIcon: { enabled: false }
		}
	});
}

export function makeButtons(tour: Tour, tt: Translations) {
	const skipButton = {
		text: tt.onboarding.dugmePreskoci,
		secondary: true,
		action: () => tour.cancel()
	};
	const backButton = {
		text: tt.onboarding.dugmeNazad,
		secondary: true,
		action: () => tour.back()
	};
	const nextButton = (label: string) => ({ text: label, action: () => tour.next() });
	const finishButton = (label: string) => ({ text: label, action: () => tour.complete() });
	return { skipButton, backButton, nextButton, finishButton };
}

export interface TourMeta {
	id: string;
	/** Stranica na kojoj tour treba da počne. Ako je undefined, tour se pokreće bez provjere/redirekta. */
	page?: string;
	/** Ključ iz $t.nav.* za čitljiv naziv stranice u redirect poruci. */
	pageNavKey?: string;
	naziv: (tt: Translations) => string;
	opis: (tt: Translations) => string;
	build: (tt: Translations) => Tour;
}

export function startTourWithRedirectCheck(meta: TourMeta, tour: Tour, tt: Translations): void {
	const currentPath = get(page).url.pathname;
	if (meta.page && !currentPath.startsWith(meta.page)) {
		const nav = tt.nav as Record<string, string>;
		const stranica = meta.pageNavKey ? (nav[meta.pageNavKey] ?? meta.page) : meta.page;
		tour.addStep(
			{
				id: '__redirect_confirm',
				text: tt.tours.redirectTekst.replace('{stranica}', stranica),
				buttons: [
					{ text: tt.tours.redirectOdustani, secondary: true, action: () => tour.cancel() },
					{
						text: tt.tours.redirectDa,
						action: async () => {
							await goto(meta.page as string);
							tour.next();
						}
					}
				]
			},
			0
		);
	}
	tour.start();
}
