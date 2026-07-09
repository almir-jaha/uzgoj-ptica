import type { Tour } from 'shepherd.js';
import type { Translations } from '$lib/i18n';
import { createTour, makeButtons, ensureRoute, waitForElement, elFirst } from './shared';

export function buildZdravljeTour(tt: Translations): Tour {
	const tour = createTour();
	const { skipButton, backButton, nextButton, finishButton } = makeButtons(tour, tt);
	const T = tt.tours.zdravlje;

	tour.addStep({
		id: 'otvori-dnevnik',
		title: T.naslov1,
		text: T.tekst1,
		beforeShowPromise: async () => {
			await ensureRoute('/ptice');
			await waitForElement('[data-tour="ptica-zdravlje-btn"]');
		},
		attachTo: { element: elFirst(['[data-tour="ptica-zdravlje-btn"]']), on: 'bottom' },
		buttons: [skipButton, nextButton(tt.onboarding.dugmeDalje)]
	});

	tour.addStep({
		id: 'novi-unos',
		title: T.naslov2,
		text: T.tekst2,
		beforeShowPromise: async () => {
			await waitForElement('[data-tour="zdravlje-novi-unos-btn"]', 1200);
		},
		attachTo: { element: elFirst(['[data-tour="zdravlje-novi-unos-btn"]']), on: 'bottom' },
		buttons: [skipButton, backButton, nextButton(tt.onboarding.dugmeDalje)]
	});

	tour.addStep({
		id: 'historija',
		title: T.naslov3,
		text: T.tekst3,
		beforeShowPromise: async () => {
			await waitForElement('[data-tour="zdravlje-lista"]', 1200);
		},
		attachTo: { element: elFirst(['[data-tour="zdravlje-lista"]']), on: 'top' },
		buttons: [skipButton, backButton, nextButton(tt.onboarding.dugmeDalje)]
	});

	tour.addStep({
		id: 'filter-datum',
		title: T.naslov4,
		text: T.tekst4,
		buttons: [skipButton, backButton, finishButton(tt.onboarding.dugmeZavrsi)]
	});

	return tour;
}
