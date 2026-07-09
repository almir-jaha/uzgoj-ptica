import type { Tour } from 'shepherd.js';
import type { Translations } from '$lib/i18n';
import { createTour, makeButtons, ensureRoute, waitForElement, elFirst } from './shared';

export function buildRodovnikTour(tt: Translations): Tour {
	const tour = createTour();
	const { skipButton, backButton, nextButton, finishButton } = makeButtons(tour, tt);
	const T = tt.tours.rodovnik;

	tour.addStep({
		id: 'detalji-ptice',
		title: T.naslov1,
		text: T.tekst1,
		beforeShowPromise: async () => {
			await ensureRoute('/ptice');
			await waitForElement('[data-tour="ptica-uredi-btn"]');
		},
		attachTo: { element: elFirst(['[data-tour="ptica-uredi-btn"]']), on: 'bottom' },
		buttons: [skipButton, nextButton(tt.onboarding.dugmeDalje)]
	});

	tour.addStep({
		id: 'otac-majka',
		title: T.naslov2,
		text: T.tekst2,
		beforeShowPromise: async () => {
			await waitForElement('[data-tour="otac-majka-select"]', 1200);
		},
		attachTo: { element: elFirst(['[data-tour="otac-majka-select"]']), on: 'bottom' },
		buttons: [skipButton, backButton, nextButton(tt.onboarding.dugmeDalje)]
	});

	tour.addStep({
		id: 'pregled-rodovnika',
		title: T.naslov3,
		text: T.tekst3,
		beforeShowPromise: async () => {
			await waitForElement('[data-tour="ptica-rodovnik-btn"]');
		},
		attachTo: { element: elFirst(['[data-tour="ptica-rodovnik-btn"]']), on: 'bottom' },
		buttons: [skipButton, backButton, nextButton(tt.onboarding.dugmeDalje)]
	});

	tour.addStep({
		id: 'generiraj-pdf',
		title: T.naslov4,
		text: T.tekst4,
		beforeShowPromise: async () => {
			await waitForElement('[data-tour="rodovnik-generiraj-btn"]', 1200);
		},
		attachTo: { element: elFirst(['[data-tour="rodovnik-generiraj-btn"]']), on: 'top' },
		buttons: [skipButton, backButton, finishButton(tt.onboarding.dugmeZavrsi)]
	});

	return tour;
}
