<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { getCurrentPhase, getDaysUntilNextPhase } from '$lib/stores/ciklus';
	import type { KavezWithDetails, FazaCiklusa } from '$lib/db/schema';

	export let details: KavezWithDetails;
	export let faze: FazaCiklusa[] = [];
	export let readonly = false;

	const dispatch = createEventDispatcher<{
		pokrenuCiklus: void;
		zavrsiCiklus: void;
	}>();

	// Faze za vrstu ptice aktivnog ciklusa
	$: fazeZaVrstu = details.aktivni_ciklus
		? faze
				.filter((f) => f.vrsta_ptica_id === details.aktivni_ciklus!.vrsta_ptica_id)
				.sort((a, b) => a.redoslijed - b.redoslijed)
		: [];

	$: trenutnaFaza = details.aktivni_ciklus ? getCurrentPhase(details.aktivni_ciklus, faze) : undefined;
	$: daniDo = details.aktivni_ciklus ? getDaysUntilNextPhase(details.aktivni_ciklus, faze) : null;

	// Alarm: datum sljedeće aktivnosti je danas ili prošao
	$: todayStr = new Date().toISOString().split('T')[0];
	$: isAlarm =
		details.status === 'alarm' ||
		(details.sledeca_aktivnost
			? details.sledeca_aktivnost.potreban_datum <= todayStr
			: false);

	// Labeli iz para (embedded u KavezWithDetails)
	$: ptica1Label =
		details.aktivni_ciklus?.par?.ptica1?.naziv ||
		details.aktivni_ciklus?.par?.ptica1?.prstena_oznaka ||
		'?';
	$: ptica2Label =
		details.aktivni_ciklus?.par?.ptica2?.naziv ||
		details.aktivni_ciklus?.par?.ptica2?.prstena_oznaka ||
		'?';

	// Border boja na osnovu statusa
	$: borderColor = isAlarm
		? '#ef4444'
		: details.status === 'aktivan'
			? '#22c55e'
			: '#64748b';

	function formatDatum(datum: string): string {
		return new Date(datum).toLocaleDateString('hr-BA', { day: '2-digit', month: '2-digit' });
	}
</script>

<div
	class="card p-3 flex flex-col gap-2 border-l-4 min-h-[160px]"
	style="border-left-color: {borderColor}"
>
	<!-- Header: oznaka + alarm badge -->
	<div class="flex items-start justify-between">
		<span class="font-bold text-lg leading-none">K{details.oznaka}</span>
		{#if isAlarm && details.status !== 'prazan'}
			<span class="badge variant-filled-error text-xs px-1 py-0.5 leading-none">!</span>
		{:else if details.status === 'aktivan'}
			<span class="badge variant-filled-success text-xs px-1 py-0.5 leading-none">✓</span>
		{/if}
	</div>

	<!-- Sadržaj po statusu -->
	{#if details.status === 'prazan'}
		<div class="flex-1 flex items-center justify-center">
			<p class="text-surface-400 text-xs text-center">Prazan</p>
		</div>

		{#if !readonly}
			<button
				class="btn btn-sm variant-filled-primary w-full text-xs"
				on:click={() => dispatch('pokrenuCiklus')}
			>
				Pokreni ciklus
			</button>
		{/if}
	{:else}
		<!-- Par -->
		<p class="text-xs font-medium truncate text-surface-700-200-token">
			{ptica1Label} / {ptica2Label}
		</p>

		<!-- Traka faza -->
		{#if fazeZaVrstu.length > 0}
			<div class="flex gap-0.5 rounded overflow-hidden" title={trenutnaFaza?.naziv ?? ''}>
				{#each fazeZaVrstu as faza (faza.id)}
					<div
						class="h-2 flex-1 transition-opacity"
						style="background-color: {faza.boja}; opacity: {faza.id === trenutnaFaza?.id ? 1 : 0.3};"
					></div>
				{/each}
			</div>
		{/if}

		<!-- Trenutna faza + dani -->
		{#if trenutnaFaza}
			<div class="flex items-center justify-between">
				<span class="text-xs font-medium truncate" style="color: {trenutnaFaza.boja}">
					{trenutnaFaza.naziv}
				</span>
				{#if daniDo !== null}
					<span
						class="text-xs badge {daniDo <= 1
							? 'variant-filled-error'
							: daniDo <= 3
								? 'variant-filled-warning'
								: 'variant-soft'} shrink-0"
					>
						{daniDo === 0 ? 'Danas' : daniDo === 1 ? 'Sutra' : `${daniDo}d`}
					</span>
				{/if}
			</div>
		{:else}
			<p class="text-xs text-surface-400">Sve faze završene</p>
		{/if}

		<!-- Datum sljedeće aktivnosti -->
		{#if details.sledeca_aktivnost}
			<p class="text-xs text-surface-500">
				📅 {formatDatum(details.sledeca_aktivnost.potreban_datum)}
			</p>
		{/if}

		<!-- Akcijsko dugme -->
		{#if !readonly}
			<button
				class="btn btn-sm {isAlarm
					? 'variant-filled-error'
					: 'variant-soft-warning'} w-full text-xs mt-auto"
				on:click={() => dispatch('zavrsiCiklus')}
			>
				Završi ciklus
			</button>
		{/if}
	{/if}
</div>
