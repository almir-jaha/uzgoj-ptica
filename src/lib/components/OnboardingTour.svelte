<script lang="ts">
	import { onDestroy } from 'svelte';
	import { get } from 'svelte/store';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Shepherd from 'shepherd.js';
	import type { Tour } from 'shepherd.js';
	import 'shepherd.js/dist/css/shepherd.css';
	import { isAuthenticated } from '$lib/stores/auth';
	import { t } from '$lib/i18n';

	const ONBOARDING_FLAG = 'onboarding_done';

	let tour: Tour | null = null;
	let started = false;

	function markDone(): void {
		if (browser) localStorage.setItem(ONBOARDING_FLAG, '1');
	}

	function waitForElement(selector: string, timeoutMs = 3000): Promise<void> {
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

	async function ensureRoute(path: string): Promise<void> {
		if (!get(page).url.pathname.startsWith(path)) {
			await goto(path);
		}
	}

	function el(selector: string): () => HTMLElement | null {
		return () => document.querySelector<HTMLElement>(selector);
	}

	function buildTour(): Tour {
		const tt = get(t);
		const newTour = new Shepherd.Tour({
			useModalOverlay: true,
			defaultStepOptions: {
				scrollTo: { behavior: 'smooth', block: 'center' },
				cancelIcon: { enabled: false }
			}
		});

		const skipButton = {
			text: tt.onboarding.dugmePreskoci,
			secondary: true,
			action: () => newTour.cancel()
		};
		const nextButton = (label: string) => ({ text: label, action: () => newTour.next() });
		const backButton = { text: tt.onboarding.dugmeNazad, secondary: true, action: () => newTour.back() };

		newTour.addStep({
			id: 'welcome',
			title: tt.onboarding.naslov1,
			text: tt.onboarding.tekst1,
			buttons: [skipButton, nextButton(tt.onboarding.dugmeDalje)]
		});

		newTour.addStep({
			id: 'nova-sezona',
			title: tt.onboarding.naslov2,
			text: tt.onboarding.tekst2,
			beforeShowPromise: async () => {
				await ensureRoute('/sezone');
				await waitForElement('[data-onboarding="nova-sezona-btn"]');
			},
			attachTo: { element: el('[data-onboarding="nova-sezona-btn"]'), on: 'bottom' },
			buttons: [skipButton, backButton, nextButton(tt.onboarding.dugmeDalje)]
		});

		newTour.addStep({
			id: 'kavezi-grid',
			title: tt.onboarding.naslov3,
			text: tt.onboarding.tekst3,
			beforeShowPromise: async () => {
				await waitForElement('[data-onboarding="kavezi-grid"]', 2000);
			},
			attachTo: { element: el('[data-onboarding="kavezi-grid"]'), on: 'top' },
			buttons: [skipButton, backButton, nextButton(tt.onboarding.dugmeDalje)]
		});

		newTour.addStep({
			id: 'sync-status',
			title: tt.onboarding.naslov4,
			text: tt.onboarding.tekst4,
			attachTo: { element: el('[data-onboarding="sync-status"]'), on: 'bottom' },
			buttons: [skipButton, backButton, nextButton(tt.onboarding.dugmeDalje)]
		});

		newTour.addStep({
			id: 'end',
			title: tt.onboarding.naslov5,
			text: tt.onboarding.tekst5,
			buttons: [{ text: tt.onboarding.dugmeZavrsi, action: () => newTour.complete() }]
		});

		newTour.on('complete', markDone);
		newTour.on('cancel', markDone);

		return newTour;
	}

	$: if (browser && $isAuthenticated && !started) {
		started = true;
		if (localStorage.getItem(ONBOARDING_FLAG) !== '1') {
			setTimeout(() => {
				tour = buildTour();
				tour.start();
			}, 800);
		}
	}

	onDestroy(() => {
		tour?.complete();
	});
</script>
