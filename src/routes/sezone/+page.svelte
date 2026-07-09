<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { get } from 'svelte/store';
	import type { RealtimeChannel } from '@supabase/supabase-js';

	import { user } from '$lib/stores/auth';
	import {
		aktivnaSezona,
		prikazanaSezona,
		sezonaZaPregled,
		filtriraneSezone,
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
	import { aktivnaUzgajivacnica } from '$lib/stores/uzgajivacnica';
	import { aktivneSekcije, loadSekcije } from '$lib/stores/sekcija';
	import { updateKavezSekcija } from '$lib/stores/sezona';

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

	let mountComplete = false;
	let prevSezonaId: string | null = null;

	// Reaktivni reload kad se promijeni sezona (npr. switch uzgajivačnice)
	// Aktivira se SAMO nakon što je mount završen da ne duplira inicijalni load
	$: if (mountComplete) {
		if ($prikazanaSezona && $prikazanaSezona.id !== prevSezonaId) {
			prevSezonaId = $prikazanaSezona.id;
			const u = get(user);
			if (u) ucitajZaSezonu($prikazanaSezona.id, u.id, false);
		} else if (!$prikazanaSezona) {
			prevSezonaId = null; // reset da sljedeći switch triggeruje reload
		}
	}

	onMount(async () => {
		const currentUser = get(user);
		if (!currentUser) return;

		await lokalnoSezone(currentUser.id);
		let sezona = get(prikazanaSezona);

		if (!sezona) {
			await loadSezone(currentUser.id);
			sezona = get(prikazanaSezona);
		}

		if (!sezona) {
			pageLoading = false;
			novaSezonaOpen = true;
			mountComplete = true;
			return;
		}

		await lokalnoPodaci(sezona.id, currentUser.id);
		await ucitajDetalje();

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

		const jeAktivna = sezona.id === get(aktivnaSezona)?.id;
		ucitajZaSezonu(sezona.id, currentUser.id, jeAktivna);

		loadSezone(currentUser.id).catch(console.error);

		// Postavi prevSezonaId i tek onda aktiviraj reaktivni watcher
		prevSezonaId = sezona.id;
		mountComplete = true;
	});

	onDestroy(() => {
		if (kavezChannel) unsubscribe(kavezChannel);
		if (ciklusChannel) unsubscribe(ciklusChannel);
		if (pticeChannel) unsubscribe(pticeChannel);
	});

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
		sezonaZaPregled.set(null);
		await loadSezone(currentUser!.id);
		const sezona = get(aktivnaSezona);
		if (!currentUser || !sezona) return;
		await ucitajZaSezonu(sezona.id, currentUser.id, true);
	}

	async function handleSezonaUredjena(deleted?: boolean) {
		urediSezonuOpen = false;
		if (deleted) {
			// Sezona obrisana — resetuj prikaz na aktivnu
			sezonaZaPregled.set(null);
			const currentUser = get(user);
			if (currentUser) await loadSezone(currentUser.id);
		}
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

	$: pregledArhive = $prikazanaSezona && $aktivnaSezona && $prikazanaSezona.id !== $aktivnaSezona.id;
	$: sortiraneSeezone = [...$filtriraneSezone].sort((a, b) => b.godina - a.godina || b.created_at.localeCompare(a.created_at));

	// Grupiranje kaveza po sekciji
	$: imaSekcija = $aktivneSekcije.length > 0;
	$: kaveziPoSekciji = imaSekcija
		? [
				...$aktivneSekcije.map((s) => ({
					sekcija: s,
					kavezi: kaveziDetails.filter((k) => k.sekcija_id === s.id)
				})),
				{
					sekcija: null,
					kavezi: kaveziDetails.filter((k) => !k.sekcija_id)
				}
		  ].filter((g) => g.kavezi.length > 0)
		: [];

	// Učitaj sekcije kad se promijeni uzgajivačnica
	$: if ($aktivnaUzgajivacnica) {
		loadSekcije($aktivnaUzgajivacnica.id);
	}
</script>

<svelte:head>
	<title>{$t.sezona.pageTitle}</title>
</svelte:head>

<div class="container mx-auto p-4 space-y-4 max-w-4xl">

	{#if pregledArhive && $prikazanaSezona}
		<aside class="alert variant-soft-warning py-2 px-3 flex items-center justify-between gap-3">
			<p class="text-sm">
				{$t.sezona.pregledArhive} <strong>{$prikazanaSezona.godina}</strong>{$t.sezona.izmjeneNisuMoguce}
			</p>
			<button class="btn btn-sm variant-filled-warning shrink-0" on:click={resetujNaAktivnu}>
				{$t.sezona.vratiNaAktivnu}
			</button>
		</aside>
	{/if}

	<!-- Header -->
	<div class="flex items-center justify-between flex-wrap gap-2">
		<div class="flex items-center gap-2 flex-wrap">
			<h2 class="h3 font-bold">
				{#if $prikazanaSezona}
					{$t.common.sezona} {$prikazanaSezona.godina}
					{#if $prikazanaSezona.naziv}
						<span class="text-surface-400 font-normal text-lg">— {$prikazanaSezona.naziv}</span>
					{/if}
				{:else}
					{$t.nav.sezone}
				{/if}
			</h2>
			{#if kaveziDetails.length > 0}
				<span class="badge variant-soft text-sm">{kaveziDetails.length} {$t.kavezi.kaveziLabel}</span>
			{/if}
			{#if aktivnih > 0}
				<span class="badge variant-filled-success text-sm">{aktivnih} {$t.kavezi.aktivnih}</span>
			{/if}
			{#if alarma > 0}
				<span class="badge variant-filled-error text-sm">⚠ {alarma} alarm</span>
			{/if}
		</div>

		{#if !pageLoading && !$sezonaLoading}
			<div class="flex items-center gap-1">
				{#if sortiraneSeezone.length > 1}
					<button
						class="btn btn-sm variant-ghost-surface"
						on:click={() => (prikaziSezone = !prikaziSezone)}
						title={$t.sezona.promijeniSezonu}
					>
						📅 {prikaziSezone ? '▲' : '▼'}
					</button>
				{/if}
				{#if !pregledArhive && $prikazanaSezona}
					<a
						href="/parovi"
						class="btn btn-sm variant-ghost-tertiary"
						title={$t.sezona.paroviOveSezoneTitle}
					>
						{$t.nav.parovi}
					</a>
					<button
						class="btn btn-sm variant-ghost-surface"
						on:click={() => (urediSezonuOpen = true)}
						title={$t.sezona.urediTitle}
					>
						{$t.sezona.urediBtn}
					</button>
					<button
						class="btn btn-sm variant-filled-primary"
						on:click={() => (novaSezonaOpen = true)}
						title={$t.sezona.novaSezona}
						data-onboarding="nova-sezona-btn"
					>
						{$t.sezona.novaSezonaBtn}
					</button>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Season switcher panel -->
	{#if prikaziSezone && sortiraneSeezone.length > 1}
		<div class="card p-3 space-y-1">
			<p class="text-xs font-semibold text-surface-500 uppercase tracking-wider px-1 mb-2">
				{$t.sezona.odaberiteSezonu}
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
						{#if sz.naziv}
							<span class="text-surface-400 font-normal">— {sz.naziv}</span>
						{/if}
					</span>
					<span
						class="badge text-xs {sz.status === 'aktiva'
							? 'variant-filled-success'
							: 'variant-soft-surface'}"
					>
						{sz.status === 'aktiva' ? $t.sezona.aktivnaSezona : $t.sezona.arhivirana}
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

	{:else if !$prikazanaSezona}
		<div class="flex flex-col items-center justify-center py-16 space-y-4">
			<span class="text-6xl">🪹</span>
			<p class="h4 text-center">{$t.kavezi.nemaSezone}</p>
			<p class="text-surface-500 text-center text-sm">{$t.sezona.nemaSezoneOpis}</p>
			<button class="btn variant-filled-primary" on:click={() => (novaSezonaOpen = true)} data-onboarding="nova-sezona-btn">
				{$t.sezona.kreirajSezonu}
			</button>
		</div>

	{:else if kaveziDetails.length > 0}
		{#if imaSekcija && kaveziPoSekciji.length > 0}
			<!-- Grupirani view po sekcijama -->
			<div class="space-y-5" data-onboarding="kavezi-grid">
				{#each kaveziPoSekciji as grupa (grupa.sekcija?.id ?? '__bez_sekcije__')}
					<div class="space-y-2">
						<div class="flex items-center gap-2">
							<span class="text-sm font-semibold text-surface-600 dark:text-surface-300">
								{#if grupa.sekcija}
									🏠 {grupa.sekcija.naziv}
								{:else}
									📦 {$t.sekcije.bezSekcije}
								{/if}
							</span>
							<span class="badge variant-soft text-xs">{grupa.kavezi.length}</span>
						</div>
						<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
							{#each grupa.kavezi as details (details.id)}
								<KavezKartica
									{details}
									faze={$faze}
									svePtice={$ptice}
									readonly={!!pregledArhive}
									on:kliknut={() => !pregledArhive && (aktivniKavezDetails = details)}
								/>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<!-- Flat view (nema sekcija) -->
			<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3" data-onboarding="kavezi-grid">
				{#each kaveziDetails as details (details.id)}
					<KavezKartica
						{details}
						faze={$faze}
						svePtice={$ptice}
						readonly={!!pregledArhive}
						on:kliknut={() => !pregledArhive && (aktivniKavezDetails = details)}
					/>
				{/each}
			</div>
		{/if}

	{:else}
		<div class="flex flex-col items-center justify-center py-12 space-y-3">
			<span class="text-5xl">🏠</span>
			<p class="text-surface-500 text-center text-sm">{$t.kavezi.nemaKaveza}</p>
		</div>
	{/if}
</div>

<!-- Modali -->
{#if novaSezonaOpen && $user}
	<NovaSezonaModal
		userId={$user.id}
		uzgajivacnicaId={$aktivnaUzgajivacnica?.id ?? ''}
		onClose={() => (novaSezonaOpen = false)}
		onSuccess={handleSezonaKreirana}
	/>
{/if}

{#if urediSezonuOpen && $prikazanaSezona}
	<UrediSezonuModal
		sezona={$prikazanaSezona}
		sekcije={$aktivneSekcije}
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
		prstenPrefiks={$aktivnaUzgajivacnica?.prsten_prefiks ?? ''}
		sezonaGodina={$prikazanaSezona?.godina ?? new Date().getFullYear()}
		userId={$user.id}
		sekcije={$aktivneSekcije}
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
