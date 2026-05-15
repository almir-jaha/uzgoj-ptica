<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { get } from 'svelte/store';
	import type { RealtimeChannel } from '@supabase/supabase-js';

	import { user } from '$lib/stores/auth';
	import {
		aktivnaSezona,
		kavezi,
		sezonaLoading,
		loadSezone,
		loadKavezi
	} from '$lib/stores/sezona';
	import { parovi, loadParovi } from '$lib/stores/parovi';
	import { ciklusi, faze, loadCiklusi, loadFaze } from '$lib/stores/ciklus';
	import { ptice, loadPtice } from '$lib/stores/ptice';
	import { listenToKavezi, listenToCiklusi, unsubscribe } from '$lib/supabase/realtime';
	import { getKavezWithDetails } from '$lib/db/dexie';
	import { lokalnoSezone, lokalnoPodaci } from '$lib/utils/localLoad';
	import type { KavezWithDetails } from '$lib/db/schema';

	import KavezKartica from '$lib/components/KavezKartica.svelte';
	import NovaSezonaModal from '$lib/components/NovaSezonaModal.svelte';
	import PokreniCiklusModal from '$lib/components/PokreniCiklusModal.svelte';
	import ZavrsiCiklusModal from '$lib/components/ZavrsiCiklusModal.svelte';

	let kaveziDetails: KavezWithDetails[] = [];
	let kavezChannel: RealtimeChannel | null = null;
	let ciklusChannel: RealtimeChannel | null = null;
	let pageLoading = true;

	// Modal state
	let novaSezonaOpen = false;
	let pokreniKavezId: string | null = null;
	let zavrsiDetails: KavezWithDetails | null = null;

	// Dohvati detalje za sve kaveze iz IndexedDB
	async function ucitajDetalje() {
		const trenutniKavezi = get(kavezi);
		const results = await Promise.all(trenutniKavezi.map((k) => getKavezWithDetails(k.id)));
		kaveziDetails = results
			.filter((d): d is KavezWithDetails => d !== null)
			.sort((a, b) => a.oznaka - b.oznaka);
	}

	async function pokreniRealtime(sezonaId: string) {
		kavezChannel = listenToKavezi(sezonaId, async () => {
			await loadKavezi(sezonaId);
			await ucitajDetalje();
		});
		ciklusChannel = listenToCiklusi(sezonaId, async () => {
			await loadCiklusi(sezonaId);
			await ucitajDetalje();
		});
	}

	async function ucitajSezonuPodatke(sezonaId: string, userId: string) {
		await Promise.all([
			loadKavezi(sezonaId),
			loadParovi(sezonaId),
			loadCiklusi(sezonaId),
			loadFaze(),
			loadPtice(userId)
		]);
		await ucitajDetalje();
		await pokreniRealtime(sezonaId);
	}

	onMount(async () => {
		const currentUser = get(user);
		if (!currentUser) return;

		// 1. Brzo — samo Dexie (< 100ms za povratne korisnike)
		await lokalnoSezone(currentUser.id);
		const sezona = get(aktivnaSezona);

		if (!sezona) {
			// Nema lokalne sezone — čekamo Supabase samo ovaj put
			pageLoading = false;
			novaSezonaOpen = true;
			loadSezone(currentUser.id); // background
			return;
		}

		// 2. Ostali podaci iz Dexie — prikaži UI odmah
		await lokalnoPodaci(sezona.id, currentUser.id);
		await ucitajDetalje();
		pageLoading = false;

		// 3. Supabase sync u pozadini — reaktivno ažurira UI
		ucitajSezonuPodatke(sezona.id, currentUser.id).catch(console.error);
	});

	onDestroy(() => {
		if (kavezChannel) unsubscribe(kavezChannel);
		if (ciklusChannel) unsubscribe(ciklusChannel);
	});

	// Handlers za modal callbacke
	async function handleSezonaKreirana() {
		novaSezonaOpen = false;
		pageLoading = true; // Pokaži skeleton dok se kavezi učitavaju
		const currentUser = get(user);
		const sezona = get(aktivnaSezona);
		if (!currentUser || !sezona) {
			pageLoading = false;
			return;
		}

		await ucitajSezonuPodatke(sezona.id, currentUser.id);
		pageLoading = false;
	}

	async function handleCiklusPokrenut() {
		pokreniKavezId = null;
		const sezona = get(aktivnaSezona);
		if (!sezona) return;
		await loadKavezi(sezona.id);
		await loadCiklusi(sezona.id);
		await ucitajDetalje();
	}

	async function handleCiklusZavrsen() {
		zavrsiDetails = null;
		const sezona = get(aktivnaSezona);
		if (!sezona) return;
		await loadKavezi(sezona.id);
		await loadCiklusi(sezona.id);
		await ucitajDetalje();
	}

	// Statistike za header
	$: aktivnih = kaveziDetails.filter((k) => k.status === 'aktivan').length;
	$: alarma = kaveziDetails.filter(
		(k) =>
			k.status === 'alarm' ||
			(k.sledeca_aktivnost &&
				k.sledeca_aktivnost.potreban_datum <= new Date().toISOString().split('T')[0])
	).length;
</script>

<svelte:head>
	<title>Kavezi – Uzgoj ptica</title>
</svelte:head>

<div class="container mx-auto p-4 space-y-4 max-w-4xl">
	<!-- Header stranice -->
	<div class="flex items-center justify-between flex-wrap gap-2">
		<div>
			<h2 class="h3 font-bold">
				{#if $aktivnaSezona}
					Sezona {$aktivnaSezona.godina}
					{#if $aktivnaSezona.naziv && $aktivnaSezona.naziv !== `Sezona ${$aktivnaSezona.godina}`}
						<span class="text-surface-400 font-normal text-lg">— {$aktivnaSezona.naziv}</span>
					{/if}
				{:else}
					Kavezi
				{/if}
			</h2>
		</div>
		<div class="flex items-center gap-2 flex-wrap">
			{#if kaveziDetails.length > 0}
				<span class="badge variant-soft text-sm">
					{kaveziDetails.length} kaveza
				</span>
			{/if}
			{#if aktivnih > 0}
				<span class="badge variant-filled-success text-sm">{aktivnih} aktivnih</span>
			{/if}
			{#if alarma > 0}
				<span class="badge variant-filled-error text-sm">⚠ {alarma} alarm</span>
			{/if}
		</div>
	</div>

	<!-- Loading state -->
	{#if pageLoading || $sezonaLoading}
		<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
			{#each Array(10) as _}
				<div class="card p-3 min-h-[160px] animate-pulse bg-surface-200-700-token"></div>
			{/each}
		</div>

	<!-- Nema sezone -->
	{:else if !$aktivnaSezona}
		<div class="flex flex-col items-center justify-center py-16 space-y-4">
			<span class="text-6xl">🪹</span>
			<p class="h4 text-center">Nema aktivne sezone</p>
			<p class="text-surface-500 text-center text-sm">
				Kreirajte prvu sezonu kako biste počeli pratiti kaveze.
			</p>
			<button
				class="btn variant-filled-primary"
				on:click={() => (novaSezonaOpen = true)}
			>
				Kreiraj sezonu
			</button>
		</div>

	<!-- Grid kaveza -->
	{:else if kaveziDetails.length > 0}
		<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
			{#each kaveziDetails as details (details.id)}
				<KavezKartica
					{details}
					faze={$faze}
					on:pokrenuCiklus={() => (pokreniKavezId = details.id)}
					on:zavrsiCiklus={() => (zavrsiDetails = details)}
				/>
			{/each}
		</div>

	<!-- Sezona postoji ali nema kaveza -->
	{:else}
		<div class="flex flex-col items-center justify-center py-12 space-y-3">
			<span class="text-5xl">🏠</span>
			<p class="text-surface-500 text-center text-sm">Sezona nema kaveza.</p>
		</div>
	{/if}
</div>

<!-- Modali -->
{#if novaSezonaOpen && $user}
	<NovaSezonaModal
		userId={$user.id}
		onClose={() => (novaSezonaOpen = false)}
		onSuccess={handleSezonaKreirana}
	/>
{/if}

{#if pokreniKavezId && $aktivnaSezona}
	<PokreniCiklusModal
		kavezId={pokreniKavezId}
		sezonaId={$aktivnaSezona.id}
		onClose={() => (pokreniKavezId = null)}
		onSuccess={handleCiklusPokrenut}
	/>
{/if}

{#if zavrsiDetails}
	<ZavrsiCiklusModal
		details={zavrsiDetails}
		onClose={() => (zavrsiDetails = null)}
		onSuccess={handleCiklusZavrsen}
	/>
{/if}
