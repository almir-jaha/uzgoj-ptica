<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';

	import { user } from '$lib/stores/auth';
	import { ptice, pticeMuzjaci, pticeSenke, pticaLoading, loadPtice } from '$lib/stores/ptice';
	import { db } from '$lib/db/dexie';
	import { supabase } from '$lib/supabase/client';
	import type { Ptica, VrstaPtica } from '$lib/db/schema';

	import NovaPticaModal from '$lib/components/NovaPticaModal.svelte';

	type Filter = 'sve' | 'muzjaci' | 'zenke';

	let vrstePtica: VrstaPtica[] = [];
	let filter: Filter = 'sve';
	let loading = true;
	let modalOtvoren = false;
	let editPtica: Ptica | null = null;

	async function loadVrstePtica() {
		const local = await db.vrsta_ptica.toArray();
		if (local.length > 0) {
			vrstePtica = local.sort((a, b) => a.naziv.localeCompare(b.naziv));
			return;
		}
		const { data } = await supabase.from('vrsta_ptica').select('*').order('naziv');
		if (data && data.length > 0) {
			await db.vrsta_ptica.bulkPut(data);
			vrstePtica = data;
		}
	}

	onMount(async () => {
		const currentUser = get(user);
		if (!currentUser) return;
		await Promise.all([loadPtice(currentUser.id), loadVrstePtica()]);
		loading = false;
	});

	async function handleSacuvano() {
		modalOtvoren = false;
		editPtica = null;
		const currentUser = get(user);
		if (currentUser) await loadPtice(currentUser.id);
	}

	function otvoriUredi(ptica: Ptica) {
		editPtica = ptica;
		modalOtvoren = true;
	}

	function otvoriNova() {
		editPtica = null;
		modalOtvoren = true;
	}

	// Filtrirane ptice
	$: filtriranePtice =
		filter === 'muzjaci' ? $pticeMuzjaci : filter === 'zenke' ? $pticeSenke : $ptice;

	// Helpers
	function vrstaLabel(vrstaId: string): string {
		return vrstePtica.find((v) => v.id === vrstaId)?.naziv ?? '—';
	}

	function formatDatum(datum?: string): string {
		if (!datum) return '';
		return new Date(datum).toLocaleDateString('hr-BA', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		});
	}

	function roditeljLabel(id?: string): string {
		if (!id) return '';
		const p = $ptice.find((pt) => pt.id === id);
		return p?.naziv || p?.prstena_oznaka || '?';
	}

	function spolBoja(spol: string): string {
		return spol === 'M' ? 'variant-filled-primary' : spol === 'Ž' ? 'variant-filled-tertiary' : 'variant-soft';
	}

	function spolSimbol(spol: string): string {
		return spol === 'M' ? '♂' : spol === 'Ž' ? '♀' : '?';
	}
</script>

<svelte:head>
	<title>Ptice – Uzgoj ptica</title>
</svelte:head>

<div class="container mx-auto p-4 space-y-4 max-w-2xl">

	<!-- Header -->
	<div class="flex items-center justify-between">
		<h2 class="h3 font-bold">Ptice</h2>
		{#if !loading}
			<button class="btn variant-filled-primary btn-sm" on:click={otvoriNova}>
				+ Nova ptica
			</button>
		{/if}
	</div>

	<!-- Filter tabovi -->
	{#if !loading && $ptice.length > 0}
		<div class="flex gap-2">
			{#each [['sve', 'Sve', $ptice.length], ['muzjaci', '♂ Mužjaci', $pticeMuzjaci.length], ['zenke', '♀ Ženke', $pticeSenke.length]] as [val, label, count]}
				<button
					class="btn btn-sm {filter === val ? 'variant-filled-primary' : 'variant-soft'}"
					on:click={() => (filter = val)}
				>
					{label}
					<span class="badge {filter === val ? 'bg-white/30' : 'variant-soft'} text-xs ml-1 px-1">
						{count}
					</span>
				</button>
			{/each}
		</div>
	{/if}

	<!-- Loading skeleton -->
	{#if loading || $pticaLoading}
		<div class="space-y-3">
			{#each Array(4) as _}
				<div class="card p-4 h-24 animate-pulse bg-surface-200-700-token"></div>
			{/each}
		</div>

	<!-- Nema ptica -->
	{:else if $ptice.length === 0}
		<div class="flex flex-col items-center justify-center py-16 space-y-4">
			<span class="text-6xl">🐦</span>
			<p class="h4 text-center">Nema unesenih ptica</p>
			<p class="text-surface-500 text-sm text-center max-w-xs">
				Dodajte ptice koje planirate upariti ove sezone.
			</p>
			<button class="btn variant-filled-primary" on:click={otvoriNova}>
				Dodaj prvu pticu
			</button>
		</div>

	<!-- Lista ptica -->
	{:else if filtriranePtice.length === 0}
		<p class="text-center text-surface-500 py-8">Nema ptica za odabrani filter.</p>

	{:else}
		<div class="space-y-2">
			{#each filtriranePtice as ptica (ptica.id)}
				<div class="card p-4">
					<div class="flex items-start gap-3">
						<!-- Spol badge -->
						<span class="badge {spolBoja(ptica.spol)} text-lg w-9 h-9 flex items-center justify-center shrink-0 rounded-full">
							{spolSimbol(ptica.spol)}
						</span>

						<!-- Podaci -->
						<div class="flex-1 min-w-0 space-y-1">
							<div class="flex items-center justify-between gap-2">
								<p class="font-semibold truncate">
									{ptica.naziv || ptica.prstena_oznaka || ptica.id.slice(0, 8)}
								</p>
								<button
									class="btn btn-sm variant-ghost-surface shrink-0"
									on:click={() => otvoriUredi(ptica)}
								>
									Uredi
								</button>
							</div>

							<p class="text-sm text-surface-500">{vrstaLabel(ptica.vrsta_ptica_id)}</p>

							<!-- Prsten + datum u jednom redu -->
							<div class="flex items-center gap-3 text-xs text-surface-500 flex-wrap">
								{#if ptica.prstena_oznaka && ptica.naziv}
									<span>📍 {ptica.prstena_oznaka}</span>
								{/if}
								{#if ptica.datum_rodjenja}
									<span>🎂 {formatDatum(ptica.datum_rodjenja)}</span>
								{/if}
							</div>

							<!-- Rodovnik (ako postoji) -->
							{#if ptica.otac_id || ptica.majka_id}
								<p class="text-xs text-surface-400">
									{#if ptica.otac_id}♂ {roditeljLabel(ptica.otac_id)}{/if}
									{#if ptica.otac_id && ptica.majka_id}<span class="mx-1">·</span>{/if}
									{#if ptica.majka_id}♀ {roditeljLabel(ptica.majka_id)}{/if}
								</p>
							{/if}

							{#if ptica.napomena}
								<p class="text-xs text-surface-400 italic truncate">{ptica.napomena}</p>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Modal -->
{#if modalOtvoren && $user}
	<NovaPticaModal
		userId={$user.id}
		{vrstePtica}
		{editPtica}
		onClose={() => { modalOtvoren = false; editPtica = null; }}
		onSuccess={handleSacuvano}
	/>
{/if}
