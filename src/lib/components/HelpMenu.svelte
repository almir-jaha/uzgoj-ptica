<script lang="ts">
	import { get } from 'svelte/store';
	import { t } from '$lib/i18n';
	import { TOURS } from '$lib/tours/registry';
	import { startTourWithRedirectCheck } from '$lib/tours/shared';

	let otvoren = false;

	function pokreni(tourMeta: (typeof TOURS)[number]) {
		otvoren = false;
		const tt = get(t);
		const tour = tourMeta.build(tt);
		startTourWithRedirectCheck(tourMeta, tour, tt);
	}
</script>

<div class="relative">
	<button
		class="btn btn-sm variant-ghost-surface"
		on:click={() => (otvoren = !otvoren)}
		title={$t.tours.pomocTitle}
	>
		❓
	</button>

	{#if otvoren}
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<div
			class="fixed inset-0 z-40"
			role="presentation"
			on:click={() => (otvoren = false)}
		></div>
		<div class="absolute right-0 top-full mt-1 z-50 card shadow-xl p-2 w-72 max-h-[420px] overflow-y-auto space-y-1">
			<p class="text-xs font-semibold text-surface-500 uppercase tracking-wide px-2 pt-1">
				{$t.tours.meniNaslov}
			</p>
			<p class="text-xs text-surface-400 px-2 pb-1">{$t.tours.meniOpis}</p>
			{#each TOURS as tourMeta (tourMeta.id)}
				<button
					class="w-full text-left px-3 py-2 rounded-lg hover:bg-surface-200-700-token transition-colors"
					on:click={() => pokreni(tourMeta)}
				>
					<p class="text-sm font-semibold">{tourMeta.naziv($t)}</p>
					<p class="text-xs text-surface-500">{tourMeta.opis($t)}</p>
				</button>
			{/each}
		</div>
	{/if}
</div>
