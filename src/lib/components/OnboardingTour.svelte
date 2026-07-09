<script lang="ts">
	import { onDestroy } from 'svelte';
	import { get } from 'svelte/store';
	import { browser } from '$app/environment';
	import type { Tour } from 'shepherd.js';
	import 'shepherd.js/dist/css/shepherd.css';
	import { isAuthenticated } from '$lib/stores/auth';
	import { t } from '$lib/i18n';
	import { buildOnboardingTour } from '$lib/tours/onboardingTour';

	const ONBOARDING_FLAG = 'onboarding_done';

	let tour: Tour | null = null;
	let started = false;

	function markDone(): void {
		if (browser) localStorage.setItem(ONBOARDING_FLAG, '1');
	}

	$: if (browser && $isAuthenticated && !started) {
		started = true;
		if (localStorage.getItem(ONBOARDING_FLAG) !== '1') {
			setTimeout(() => {
				tour = buildOnboardingTour(get(t));
				tour.on('complete', markDone);
				tour.on('cancel', markDone);
				tour.start();
			}, 800);
		}
	}

	onDestroy(() => {
		tour?.complete();
	});
</script>
