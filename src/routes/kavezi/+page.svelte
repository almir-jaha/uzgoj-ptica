<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { get } from 'svelte/store';
	import type { RealtimeChannel } from '@supabase/supabase-js';

	import { user } from '$lib/stores/auth';
	import {
		aktivnaSezona,
		prikazanaSezona,
		sezonaZaPregled,
		sezone,
		kavezi,
		sezonaLoading,
		loadSezone,
		loadKavezi
	} from '$lib/stores/sezona';
	import { parovi, loadParovi } from '$lib/stores/parovi';
	import { ciklusi, faze, loadCiklusi, loadFaze } from '$lib/stores/ciklus';
	import { ptice, loadPtice } from '$lib/stores/ptice';
	import { listenToKavezi, listenToCiklusi, listenToPtice, unsubscribe } from '$lib/supabase/realtime';
	import { getKavezWithDetails } from '$lib/db/dexie';
	import { lokalnoSezone, lokalnoPodaci } from '$lib/utils/localLoad';
	import type { KavezWithDetails } from '$lib/db/schema';

	import KavezKartica from '$lib/components/KavezKartica.svelte';
	import KavezAkcijeDrawer from '$lib/components/KavezAkcijeDrawer.svelte';
	import { t } from '$lib/i18n';
	import NovaSezonaModal from '$lib/components/NovaSezonaModal.svelte';
	import UrediSezonuModal from '$lib/components/UrediSezonuModal.svelte';
	import PokreniCiklusModal from '$lib/components/PokreniCiklusModal.svelte';
	import ZavrsiCiklusModal from '$lib/components/ZavrsiCiklusModal.svelte';
	import { postavke, loadPostavke } from '$lib/stores/postavke';

	let kaveziDetails: KavezWithDetails[] = [];
	let kavezChannel: RealtimeChannel | null = null;
	let ciklusChannel: RealtimeChannel | null = null;
	let pticeChannel: RealtimeChannel | null = null;
	let pageLoading = true;

	let novaSezonaOpen = false;
	let urediSezonuOpen = false;
	let prikaziSezone = false;
	let pokreniKavezId: string | null = null;
	let zavrsiDetails: KavezWithDetails | null = null;
	let aktivniKavezDetails: KavezWithDetails | null = null;

	async function ucitajDetalje() {
		const trenutniKavezi = get(kavezi);
		const results = await Promise.all(trenutniKavezi.map((k) => getKavezWithDetails(k.id)));
		kaveziDetails = results
			.filter((d): d is KavezWithDetails => d !== null)
			.sort((a, b) => a.oznaka - b.oznaka);
	}

	async function pokreniRealtime(sezonaId: string, userId: string) {
		if (kavezChannel) unsubscribe(kavezChannel);
		if (ciklusChannel) unsubscribe(ciklusChannel);
		if (pticeChannel) unsubscribe(pticeChannel);
		kavezChannel = listenToKavezi(sezonaId, async () => {
			await loadKavezi(sezonaId);
			await ucitajDetalje();
		});
		ciklusChannel = listenToCiklusi(sezonaId, async () => {
			await loadCiklusi(sezonaId);
			await ucitajDetalje();
		});
		pticeChannel = listenToPtice(userId, async () => {
			await loadPtice(userId);
			await ucitajDetalje();
		});
	}

	async function ucitajZaSezonu(sezonaId: string, userId: string, realtime = false) {
		pageLoading = true;
		await lokalnoPodaci(sezonaId, userId);
		await ucitajDetalje();
		pageLoading = false;

		// Supabase sync
		Promise.all([
			loadKavezi(sezonaId),
			loadParovi(sezonaId),
			loadCiklusi(sezonaId),
			loadFaze(),
			loadPtice(userId)
		])
			.then(async () => {
				await ucitajDetalje();
				if (realtime) await pokreniRealtime(sezonaId, userId);
			})
			.catch(console.error);
	}

	onMount(async () => {
		const currentUser = get(user);
		if (!currentUser) return;

		// 1. Dexie
		await lokalnoSezone(currentUser.id);
		let sezona = get(prikazanaSezona);

		// 2. Ako ništa lokalno, čekaj Supabase
		if (!sezona) {
			await loadSezone(currentUser.id);
			sezona = get(prikazanaSezona);
		}

		if (!sezona) {
			pageLoading = false;
			novaSezonaOpen = true;
			return;
		}

		// 3. Prikaži lokalne podatke odmah
		await lokalnoPodaci(sezona.id, currentUser.id);
		await ucitajDetalje();

		// Ako Dexie nema kaveza ali sezona ih treba imati — čekaj Supabase sinkronizaciju
		// To se dešava kada korisnik ručno čisti bazu ili dolazi sa novog uređaja
		if (kaveziDetails.length === 0 && sezona.broj_kaveza > 0) {
			await Promise.all([
				loadKavezi(sezona.id),
				loadParovi(sezona.id),
				loadCiklusi(sezona.id),
				loadFaze(),
				loadPtice(currentUser.id)
			]);
			await ucitajDetalje();
		}

		pageLoading = false;

		// 4. Background sync + realtime (samo za aktivnu sezonu)
		const jeAktivna = sezona.id === get(aktivnaSezona)?.id;
		ucitajZaSezonu(sezona.id, currentUser.id, jeAktivna);

		// 5. Učitaj sve sezone za switcher (background)
		loadSezone(currentUser.id).catch(console.error);

		// 6. Učitaj korisničke postavke (prefiks prstena)
		loadPostavke(currentUser.id).catch(console.error);
	});

	onDestroy(() => {
		if (kavezChannel) unsubscribe(kavezChannel);
		if (ciklusChannel) unsubscribe(ciklusChannel);
		if (pticeChannel) unsubscribe(pticeChannel);
	});

	// Switcher: promijeni sezonu za pregled
	async function switchSezona(sezonaId: string) {
		prikaziSezone = false;
		sezonaZaPregled.set(sezonaId);
		const currentUser = get(user);
		if (!currentUser) return;
		const jeAktivna = sezonaId === get(aktivnaSezona)?.id;
		await ucitajZaSezonu(sezonaId, currentUser.id, jeAktivna);
	}

	async function resetujNaAktivnu() {
		sezonaZaPregled.set(null);
		const currentUser = get(user);
		const sezona = get(aktivnaSezona);
		if (!currentUser || !sezona) return;
		await ucitajZaSezonu(sezona.id, currentUser.id, true);
	}

	async function handleSezonaKreirana() {
		novaSezonaOpen = false;
		const currentUser = get(user);
		// Nova sezona je automatski aktivna — resetuj pregled na nju
		sezonaZaPregled.set(null);
		await loadSezone(currentUser!.id);
		const sezona = get(aktivnaSezona);
		if (!currentUser || !sezona) return;
		await ucitajZaSezonu(sezona.id, currentUser.id, true);
	}

	async function handleSezonaUredjena() {
		urediSezonuOpen = false;
	}

	async function handleCiklusPokrenut() {
		pokreniKavezId = null;
		const sezona = get(prikazanaSezona);
		if (!sezona) return;
		await loadKavezi(sezona.id);
		await loadCiklusi(sezona.id);
		await ucitajDetalje();
	}

	async function handleCiklusZavrsen() {
		zavrsiDetails = null;
		const sezona = get(prikazanaSezona);
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

	// Je li korisnik u modu pregleda arhivirane sezone?
	$: pregledArhive = $prikazanaSezona && $aktivnaSezona && $prikazanaSezona.id !== $aktivnaSezona.id;

	$: sortiraneSeezone = [...$sezone].sort((a, b) => b.godina - a.godina || b.created_at.localeCompare(a.created_at));
</script>

<svelte:head>
	<title>{t.kavezi.pageTitle}</title>
</svelte:head>

<div class="container mx-auto p-4 space-y-4 max-w-4xl">

	<!-- Modus pregleda arhive -->
	{#if pregledArhive && $prikazanaSezona}
		<aside class="alert variant-soft-warning py-2 px-3 flex items-center justify-between gap-3">
			<p class="text-sm">
				{t.sezona.pregledArhive} <strong>{$prikazanaSezona.godina}</strong>{t.sezona.izmjeneNisuMoguce}
			</p>
			<button class="btn btn-sm variant-filled-warning shrink-0" on:click={resetujNaAktivnu}>
				{t.sezona.vratiNaAktivnu}
			</button>
		</aside>
	{/if}

	<!-- Header -->
	<div class="flex items-center justify-between flex-wrap gap-2">
		<div class="flex items-center gap-2 flex-wrap">
			<h2 class="h3 font-bold">
				{#if $prikazanaSezona}
					{t.common.sezona} {$prikazanaSezona.godina}
					{#if $prikazanaSezona.naziv && $prikazanaSezona.naziv !== `Sezona ${$prikazanaSezona.godina}`}
						<span class="text-surface-400 font-normal text-lg">— {$prikazanaSezona.naziv}</span>
					{/if}
				{:else}
					{t.kavezi.title}
				{/if}
			</h2>
			{#if kaveziDetails.length > 0}
				<span class="badge variant-soft text-sm">{kaveziDetails.length} {t.kavezi.kaveziLabel}</span>
			{/if}
			{#if aktivnih > 0}
				<span class="badge variant-filled-success text-sm">{aktivnih} {t.kavezi.aktivnih}</span>
			{/if}
			{#if alarma > 0}
				<span class="badge variant-filled-error text-sm">⚠ {alarma} alarm</span>
			{/if}
		</div>

		<!-- Akcije — samo za aktivnu sezonu -->
		{#if !pageLoading && !$sezonaLoading}
			<div class="flex items-center gap-1">
				<!-- Season switcher dugme -->
				{#if sortiraneSeezone.length > 1}
					<button
						class="btn btn-sm variant-ghost-surface"
						on:click={() => (prikaziSezone = !prikaziSezone)}
						title={t.sezona.promijeniSezonu}
					>
						📅 {prikaziSezone ? '▲' : '▼'}
					</button>
				{/if}
				{#if !pregledArhive && $prikazanaSezona}
					<button
						class="btn btn-sm variant-ghost-surface"
						on:click={() => (urediSezonuOpen = true)}
						title={t.sezona.urediTitle}
					>
						{t.sezona.urediBtn}
					</button>
					<button
						class="btn btn-sm variant-filled-primary"
						on:click={() => (novaSezonaOpen = true)}
						title={t.sezona.novaSezona}
					>
						{t.sezona.novaSezonaBtn}
					</button>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Season switcher panel -->
	{#if prikaziSezone && sortiraneSeezone.length > 1}
		<div class="card p-3 space-y-1">
			<p class="text-xs font-semibold text-surface-500 uppercase tracking-wider px-1 mb-2">
				{t.sezona.odaberiteSezonu}
			</p>
			{#each sortiraneSeezone as sz (sz.id)}
				<button
					class="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between gap-2
						{$prikazanaSezona?.id === sz.id
							? 'bg-primary-500/20 font-semibold'
							: 'hover:bg-surface-200-700-token'}"
					on:click={() => switchSezona(sz.id)}
				>
					<span>
						{sz.godina}
						{#if sz.naziv && sz.naziv !== `Sezona ${sz.godina}`}
							<span class="text-surface-400 font-normal">— {sz.naziv}</span>
						{/if}
					</span>
					<span
						class="badge text-xs {sz.status === 'aktiva'
							? 'variant-filled-success'
							: 'variant-soft-surface'}"
					>
						{sz.status === 'aktiva' ? t.sezona.aktivnaSezona : t.sezona.arhivirana}
					</span>
				</button>
			{/each}
		</div>
	{/if}

	<!-- Loading -->
	{#if pageLoading || $sezonaLoading}
		<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
			{#each Array(10) as _}
				<div class="card p-3 min-h-[160px] animate-pulse bg-surface-200-700-token"></div>
			{/each}
		</div>

	<!-- Nema sezone -->
	{:else if !$prikazanaSezona}
		<div class="flex flex-col items-center justify-center py-16 space-y-4">
			<span class="text-6xl">🪹</span>
			<p class="h4 text-center">{t.kavezi.nemaSezone}</p>
			<p class="text-surface-500 text-center text-sm">
				{t.sezona.nemaSezoneOpis}
			</p>
			<button class="btn variant-filled-primary" on:click={() => (novaSezonaOpen = true)}>
				{t.sezona.kreirajSezonu}
			</button>
		</div>

	<!-- Grid kaveza -->
	{:else if kaveziDetails.length > 0}
		<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
			{#each kaveziDetails as details (details.id)}
				<KavezKartica
					{details}
					faze={$faze}
					readonly={!!pregledArhive}
					on:kliknut={() => !pregledArhive && (aktivniKavezDetails = details)}
				/>
			{/each}
		</div>

	{:else}
		<div class="flex flex-col items-center justify-center py-12 space-y-3">
			<span class="text-5xl">🏠</span>
			<p class="text-surface-500 text-center text-sm">{t.kavezi.nemaKaveza}</p>
		</div>
	{/if}
</div>

<!-- Modali — samo za aktivnu sezonu -->
{#if novaSezonaOpen && $user}
	<NovaSezonaModal
		userId={$user.id}
		onClose={() => (novaSezonaOpen = false)}
		onSuccess={handleSezonaKreirana}
	/>
{/if}

{#if urediSezonuOpen && $prikazanaSezona}
	<UrediSezonuModal
		sezona={$prikazanaSezona}
		onClose={() => (urediSezonuOpen = false)}
		onSuccess={handleSezonaUredjena}
	/>
{/if}

{#if pokreniKavezId && $prikazanaSezona && !pregledArhive}
	<PokreniCiklusModal
		kavezId={pokreniKavezId}
		sezonaId={$prikazanaSezona.id}
		onClose={() => (pokreniKavezId = null)}
		onSuccess={handleCiklusPokrenut}
	/>
{/if}

{#if zavrsiDetails && !pregledArhive}
	<ZavrsiCiklusModal
		details={zavrsiDetails}
		onClose={() => (zavrsiDetails = null)}
		onSuccess={handleCiklusZavrsen}
	/>
{/if}

{#if aktivniKavezDetails && $user && !pregledArhive}
	<KavezAkcijeDrawer
		details={aktivniKavezDetails}
		faze={$faze}
		svePtice={$ptice}
		prstenPrefiks={$postavke?.prsten_prefiks ?? ''}
		userId={$user.id}
		on:zatvori={() => (aktivniKavezDetails = null)}
		on:pokreniCiklus={() => {
			const kavez = aktivniKavezDetails;
			aktivniKavezDetails = null;
			if (kavez) pokreniKavezId = kavez.id;
		}}
		on:zavrsiCiklus={() => {
			zavrsiDetails = aktivniKavezDetails;
			aktivniKavezDetails = null;
		}}
		on:refresh={async () => {
			const sezona = get(prikazanaSezona);
			const currentUser = get(user);
			if (!sezona || !currentUser) return;
			await loadPtice(currentUser.id);
			await ucitajDetalje();
			const kavezId = aktivniKavezDetails?.id;
			if (kavezId) {
				const updated = kaveziDetails.find((k) => k.id === kavezId);
				if (updated) aktivniKavezDetails = updated;
			}
		}}
	/>
{/if}
