import type { Tour } from 'shepherd.js';
import type { Translations } from '$lib/i18n';
import { createTour, makeButtons, ensureRoute, waitForAnyElement, waitForElement, elFirst } from './shared';

export function buildCiklusTour(tt: Translations): Tour {
	const tour = createTour();
	const { skipButton, backButton, nextButton, finishButton } = makeButtons(tour, tt);
	const T = tt.tours.ciklus;

	tour.addStep({
		id: 'odabir-para',
		title: T.naslov1,
		text: T.tekst1,
		beforeShowPromise: async () => {
			await ensureRoute('/parovi');
			await waitForAnyElement(['[data-tour="parovi-lista"]', '[data-tour="novi-par-btn"]']);
		},
		attachTo: { element: elFirst(['[data-tour="parovi-lista"]', '[data-tour="novi-par-btn"]']), on: 'bottom' },
		buttons: [skipButton, nextButton(tt.onboarding.dugmeDalje)]
	});

	tour.addStep({
		id: 'odabir-kaveza',
		title: T.naslov2,
		text: T.tekst2,
		beforeShowPromise: async () => {
			await ensureRoute('/sezone');
			await waitForElement('[data-tour="kavez-prazan"]', 2000);
		},
		attachTo: { element: elFirst(['[data-tour="kavez-prazan"]']), on: 'top' },
		buttons: [skipButton, backButton, nextButton(tt.onboarding.dugmeDalje)]
	});

	tour.addStep({
		id: 'datum-jajeta',
		title: T.naslov3,
		text: T.tekst3,
		beforeShowPromise: async () => {
			await waitForElement('[data-tour="kavez-ceka-jaje"]', 1500);
		},
		attachTo: { element: elFirst(['[data-tour="kavez-ceka-jaje"]']), on: 'top' },
		buttons: [skipButton, backButton, nextButton(tt.onboarding.dugmeDalje)]
	});

	tour.addStep({
		id: 'aktivnosti',
		title: T.naslov4,
		text: T.tekst4,
		beforeShowPromise: async () => {
			await ensureRoute('/aktivnosti');
			await waitForElement('[data-tour="aktivnosti-lista"]', 2000);
		},
		attachTo: { element: elFirst(['[data-tour="aktivnosti-lista"]']), on: 'top' },
		buttons: [skipButton, backButton, nextButton(tt.onboarding.dugmeDalje)]
	});

	tour.addStep({
		id: 'boje-faza',
		title: T.naslov5,
		text: T.tekst5,
		beforeShowPromise: async () => {
			await ensureRoute('/sezone');
			await waitForElement('[data-tour="faze-boje"]', 2000);
		},
		attachTo: { element: elFirst(['[data-tour="faze-boje"]']), on: 'bottom' },
		buttons: [skipButton, backButton, finishButton(tt.onboarding.dugmeZavrsi)]
	});

	return tour;
}
