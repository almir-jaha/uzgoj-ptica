import type { Tour } from 'shepherd.js';
import type { Translations } from '$lib/i18n';
import { createTour, makeButtons, ensureRoute, waitForElement, elFirst } from './shared';

export function buildOnboardingTour(tt: Translations): Tour {
	const tour = createTour();
	const { skipButton, backButton, nextButton, finishButton } = makeButtons(tour, tt);

	tour.addStep({
		id: 'welcome',
		title: tt.onboarding.naslov1,
		text: tt.onboarding.tekst1,
		buttons: [skipButton, nextButton(tt.onboarding.dugmeDalje)]
	});

	tour.addStep({
		id: 'nova-sezona',
		title: tt.onboarding.naslov2,
		text: tt.onboarding.tekst2,
		beforeShowPromise: async () => {
			await ensureRoute('/sezone');
			await waitForElement('[data-onboarding="nova-sezona-btn"]');
		},
		attachTo: { element: elFirst(['[data-onboarding="nova-sezona-btn"]']), on: 'bottom' },
		buttons: [skipButton, backButton, nextButton(tt.onboarding.dugmeDalje)]
	});

	tour.addStep({
		id: 'kavezi-grid',
		title: tt.onboarding.naslov3,
		text: tt.onboarding.tekst3,
		beforeShowPromise: async () => {
			await waitForElement('[data-onboarding="kavezi-grid"]', 2000);
		},
		attachTo: { element: elFirst(['[data-onboarding="kavezi-grid"]']), on: 'top' },
		buttons: [skipButton, backButton, nextButton(tt.onboarding.dugmeDalje)]
	});

	tour.addStep({
		id: 'sync-status',
		title: tt.onboarding.naslov4,
		text: tt.onboarding.tekst4,
		attachTo: { element: elFirst(['[data-onboarding="sync-status"]']), on: 'bottom' },
		buttons: [skipButton, backButton, nextButton(tt.onboarding.dugmeDalje)]
	});

	tour.addStep({
		id: 'end',
		title: tt.onboarding.naslov5,
		text: tt.onboarding.tekst5,
		buttons: [finishButton(tt.onboarding.dugmeZavrsi)]
	});

	return tour;
}
