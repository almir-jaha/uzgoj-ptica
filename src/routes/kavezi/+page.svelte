<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { get } from 'svelte/store';
	import type { RealtimeChannel } from '@supabase/supabase-js';

	import { user } from '$lib/stores/auth';
	import {
		aktivnaSezona,
		aktuelnaSezonaId,
		sezone,
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
	import UrediSezonuModal from '$lib/components/UrediSezonuModal.svelte';
	import PokreniCiklusModal from '$lib/components/PokreniCiklusModal.svelte';
	import ZavrsiCiklusModal from '$lib/components/ZavrsiCiklusModal.svelte';

	let kaveziDetails: KavezWithDetails[] = [];
	let kavezChannel: RealtimeChannel | null = null;
	let ciklusChannel: RealtimeChannel | null = null;
	let pageLoading = true;

	// Modal state
	let novaSezonaOpen = false;
	let urediSezonuOpen = false;
	let prikaziSezone = false;
	let pokreniKavezId: string | null = null;
	let zavrsiDetails: KavezWithDetails | null = null;

	async function ucitajDetalje() {
		const trenutniKavezi = get(kavezi);
		const results = await Promise.all(trenutniKavezi.map((k) => getKavezWithDetails(k.id)));
		kaveziDetails = results
			.filter((d): d is KavezWithDetails => d !== null)
			.sort((a, b) => a.oznaka - b.oznaka);
	}

	async function pokreniRealtime(sezonaId: string) {
		if (kavezChannel) unsubscribe(kavezChannel);
		if (ciklusChannel) unsubscribe(ciklusChannel);
		kavezChannel = listenToKavezi(sezonaId, async () => {
			await loadKavezi(sezonaId);
			await ucitajDetalje();
		});
		ciklusChannel = listenToCiklusi(sezonaId, async () => {
			await loadCiklusi(sezonaId);
			await ucitajDetalje();
		});
	}

	async function sinhronizujSupabase(sezonaId: string, userId: string) {
		await Promise.all([
			loadKavezi(sezonaId),
			loadParovi(sezonaId),
			loadCiklusi(sezonaId),
			loadFaze(),
			loadPtice(userId)
		]);
		await ucitajDetalje();
	}

	async function ucitajZaSezonu(sezonaId: string, userId: string) {
		pageLoading = true;
		await lokalnoPodaci(sezonaId, userId);
		await ucitajDetalje();
		pageLoading = false;
		sinhronizujSupabase(sezonaId, userId)
			.then(() => pokreniRealtime(sezonaId))
			.catch(console.error);
	}

	onMount(async () => {
		const currentUser = get(user);
		if (!currentUser) return;

		// 1. Brzo — Dexie
		await lokalnoSezone(currentUser.id);
		let sezona = get(aktivnaSezona);

		// 2. Ako nema lokalno, čekaj Supabase
		if (!sezona) {
			await loadSezone(currentUser.id);
			sezona = get(aktivnaSezona);
		}

		if (!sezona) {
			pageLoading = false;
			novaSezonaOpen = true;
			return;
		}

		// 3. Prikaži lokalne podatke
		await lokalnoPodaci(sezona.id, currentUser.id);
		await ucitajDetalje();
		pageLoading = false;

		// 4. Background sync + realtime
		sinhronizujSupabase(sezona.id, currentUser.id)
			.then(() => pokreniRealtime(sezona!.id))
			.catch(console.error);

		// 5. Učitaj listu svih sezona u background (za switcher)
		loadSezone(currentUser.id).catch(console.error);
	});

	onDestroy(() => {
		if (kavezChannel) unsubscribe(kavezChannel);
		if (ciklusChannel) unsubscribe(ciklusChannel);
	});

	// Ako korisnik promijeni aktivnu sezonu (switcher), reload
	let prethodnaSezonaId = '';
	$: if ($aktivnaSezona && $aktivnaSezona.id !== prethodnaSezonaId && !pageLoading) {
		const sezona = $aktivnaSezona;
		const currentUser = get(user);
		if (currentUser && prethodnaSezonaId !== '') {
			prethodnaSezonaId = sezona.id;
			ucitajZaSezonu(sezona.id, currentUser.id);
		} else {
			prethodnaSezonaId = sezona.id;
		}
	}

	async function handleSezonaKreirana() {
		novaSezonaOpen = false;
		const currentUser = get(user);
		const sezona = get(aktivnaSezona);
		if (!currentUser || !sezona) return;

		// Postavi novu sezonu kao aktuelnu
		aktuelnaSezonaId.set(sezona.id);
		await ucitajZaSezonu(sezona.id, currentUser.id);
	}

	async function handleSezonaUredjena() {
		urediSezonuOpen = false;
		// Podaci u storu su već ažurirani u updateSezona
	}

	async function switchSezona(sezonaId: string) {
		prikaziSezone = false;
		aktuelnaSezonaId.set(sezonaId);
		// Reaktivna $: blok gore će pokrenuti ucitajZaSezonu
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

	$: aktivnih = kaveziDetails.filter((k) => k.status === 'aktivan').length;
	$: alarma = kaveziDetails.filter(
		(k) =>
			k.status === 'alarm' ||
			(k.sledeca_aktivnost &&
				k.sledeca_aktivnost.potreban_datum <= new Date().toISOString().split('T')[0])
	).length;

	// Sortirane sezone za prikaz (najnovije gore)
	$: sortiraneSeezone = [...$sezone].sort((a, b) => b.created_at.localeCompare(a.created_at));
</script>

<svelte:head>
	<title>Kavezi – Uzgoj ptica</title>
</svelte:head>

<div class="container mx-auto p-4 space-y-4 max-w-4xl">
	<!-- Header stranice -->
	<div class="flex items-center justify-between flex-wrap gap-2">
		<div class="flex items-center gap-2 flex-wrap">
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

			<!-- Badge-ovi statistika -->
			{#if kaveziDetails.length > 0}
				<span class="badge variant-soft text-sm">{kaveziDetails.length} kaveza</span>
			{/if}
			{#if aktivnih > 0}
				<span class="badge variant-filled-success text-sm">{aktivnih} aktivnih</span>
			{/if}
			{#if alarma > 0}
				<span class="badge variant-filled-error text-sm">⚠ {alarma} alarm</span>
			{/if}
		</div>

		<!-- Akcije sezone -->
		{#if $aktivnaSezona && !pageLoading && !$sezonaLoading}
			<div class="flex items-center gap-1">
				{#if sortiraneSeezone.length > 1}
					<button
						class="btn btn-sm variant-ghost-surface"
						on:click={() => (prikaziSezone = !prikaziSezone)}
						title="Promijeni sezonu"
					>
						📅 {prikaziSezone ? '▲' : '▼'}
					</button>
				{/if}
				<button
					class="btn btn-sm variant-ghost-surface"
					on:click={() => (urediSezonuOpen = true)}
					title="Uredi sezonu"
				>
					✏ Uredi
				</button>
				<button
					class="btn btn-sm variant-filled-primary"
					on:click={() => (novaSezonaOpen = true)}
					title="Nova sezona"
				>
					+ Sezona
				</button>
			</div>
		{/if}
	</div>

	<!-- Season switcher -->
	{#if prikaziSezone && sortiraneSeezone.length > 1}
		<div class="card p-3 space-y-1">
			<p class="text-xs font-semibold text-surface-500 uppercase tracking-wider px-1 mb-2">
				Sve sezone
			</p>
			{#each sortiraneSeezone as sz (sz.id)}
				<button
					class="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between gap-2
						{$aktivnaSezona?.id === sz.id ? 'bg-primary-500/20 font-semibold' : 'hover:bg-surface-200-700-token'}"
					on:click={() => switchSezona(sz.id)}
				>
					<span>
						Sezona {sz.godina}
						{#if sz.naziv && sz.naziv !== `Sezona ${sz.godina}`}
							<span class="text-surface-400 font-normal">— {sz.naziv}</span>
						{/if}
					</span>
					<span class="badge {sz.status === 'aktiva' ? 'variant-filled-success' : 'variant-soft'} text-xs">
						{sz.status === 'aktiva' ? 'aktivna' : 'završena'}
					</span>
				</button>
			{/each}
		</div>
	{/if}

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
			<button class="btn variant-filled-primary" on:click={() => (novaSezonaOpen = true)}>
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

{#if urediSezonuOpen && $aktivnaSezona}
	<UrediSezonuModal
		sezona={$aktivnaSezona}
		onClose={() => (urediSezonuOpen = false)}
		onSuccess={handleSezonaUredjena}
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
