<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import type { AktivnostCiklusa, Ciklus, FazaCiklusa, Kavez } from '$lib/db/schema';

	import { user } from '$lib/stores/auth';
	import { aktivnaSezona, prikazanaSezona, kavezi, loadSezone, loadKavezi } from '$lib/stores/sezona';
	import { ciklusi, faze, loadCiklusi, loadFaze, updateAktivnost } from '$lib/stores/ciklus';
	import { db } from '$lib/db/dexie';
	import { supabase } from '$lib/supabase/client';
	import { lokalnoSezone, lokalnoPodaci } from '$lib/utils/localLoad';
	import { t } from '$lib/i18n';
	import {
		getPermissionStatus,
		isPushSubscribed,
		subscribePush,
		unsubscribePush,
		syncSubscription,
		hasDismissedBanner,
		dismissBanner
	} from '$lib/utils/notifications';

	type Hitnost = 'zakasnila' | 'danas' | 'uskoro' | 'buducnost';

	interface AktivnostPrikaz {
		aktivnost: AktivnostCiklusa;
		ciklus: Ciklus;
		kavez: Kavez | undefined;
		faza: FazaCiklusa | undefined;
		hitnost: Hitnost;
	}

	let loading = true;
	let pending: AktivnostPrikaz[] = [];
	let obavljene: AktivnostCiklusa[] = [];
	let prikaziObavljene = false;
	let today = '';

	// Notifikacije
	let notifPermission: 'unsupported' | 'denied' | 'granted' | 'default' = 'unsupported';
	let notifSubscribed = false;
	let notifLoading = false;
	let notifError = '';
	let showNotifBanner = false;

	async function initNotifStatus() {
		notifPermission = getPermissionStatus();
		if (notifPermission === 'unsupported') return;
		notifSubscribed = await isPushSubscribed();
		// Ako browser ima subscription ali DB možda nema — upiši tiho
		if (notifSubscribed) {
			const currentUser = get(user);
			if (currentUser) await syncSubscription(currentUser.id);
		}
		showNotifBanner =
			notifPermission === 'default' && !notifSubscribed && !hasDismissedBanner();
	}

	async function ukljuciNotifikacije() {
		const currentUser = get(user);
		if (!currentUser) return;
		notifLoading = true;
		notifError = '';
		const { ok, error } = await subscribePush(currentUser.id);
		notifLoading = false;
		if (ok) {
			notifSubscribed = true;
			notifPermission = 'granted';
			showNotifBanner = false;
		} else if (error === 'permission_denied') {
			notifPermission = 'denied';
			showNotifBanner = false;
		} else {
			notifError = error ?? t.notifikacije.greska;
		}
	}

	async function iskljuciNotifikacije() {
		const currentUser = get(user);
		if (!currentUser) return;
		notifLoading = true;
		await unsubscribePush(currentUser.id);
		notifSubscribed = false;
		notifPermission = getPermissionStatus();
		notifLoading = false;
	}

	function odbijNotifikacije() {
		dismissBanner();
		showNotifBanner = false;
	}

	// Inline "obavi" state — samo jedna kartica je otvorena u isto vrijeme
	let obavljaId: string | null = null;
	let obavljaDatum = '';
	let obavljaNapomena = '';
	let obavljaLoading = false;
	let obavljaError = '';

	function izracunajHitnost(potrebanDatum: string): Hitnost {
		if (potrebanDatum < today) return 'zakasnila';
		if (potrebanDatum === today) return 'danas';
		const d = new Date(today);
		d.setDate(d.getDate() + 7);
		return potrebanDatum <= d.toISOString().split('T')[0] ? 'uskoro' : 'buducnost';
	}

	function formatDatum(datum: string): string {
		return new Date(datum).toLocaleDateString('hr-BA', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		});
	}

	async function ucitajAktivnosti() {
		const aktivniIds = $ciklusi.filter((c) => c.status === 'aktivan').map((c) => c.id);

		if (aktivniIds.length === 0) {
			pending = [];
			obavljene = [];
			return;
		}

		// Refresh iz Supabase
		const { data } = await supabase
			.from('aktivnosti_ciklusa')
			.select('*')
			.in('ciklus_id', aktivniIds)
			.order('potreban_datum');

		if (data?.length) {
			await db.aktivnosti_ciklusa.bulkPut(data);
		}

		// Sve iz Dexie jednim upitom
		const sve = await db.aktivnosti_ciklusa
			.where('ciklus_id')
			.anyOf(aktivniIds)
			.sortBy('potreban_datum');

		const pArr: AktivnostPrikaz[] = [];
		const oArr: AktivnostCiklusa[] = [];

		for (const a of sve) {
			const ciklus = $ciklusi.find((c) => c.id === a.ciklus_id);
			if (!ciklus) continue;
			const kavez = $kavezi.find((k) => k.id === ciklus.kavez_id);
			const faza = $faze.find((f) => f.id === a.faza_id);

			if (a.datum) {
				oArr.push(a);
			} else {
				pArr.push({ aktivnost: a, ciklus, kavez, faza, hitnost: izracunajHitnost(a.potreban_datum) });
			}
		}

		pending = pArr;
		obavljene = oArr;
	}

	onMount(async () => {
		today = new Date().toISOString().split('T')[0];
		obavljaDatum = today;

		const currentUser = get(user);
		if (!currentUser) return;

		// Brzo iz Dexie
		await lokalnoSezone(currentUser.id);
		let sezona = get(prikazanaSezona);

		// Direktna navigacija: sezone još nisu učitane
		if (!sezona) {
			await loadSezone(currentUser.id);
			sezona = get(prikazanaSezona);
		}

		if (!sezona) { loading = false; return; }

		await lokalnoPodaci(sezona.id, currentUser.id);
		await ucitajAktivnosti();
		loading = false;
		await initNotifStatus();

		// Background: bez loadSezone — izaziva race condition na parovi/aktivnosti stranicama
		Promise.all([
			loadKavezi(sezona.id),
			loadCiklusi(sezona.id),
			loadFaze()
		]).then(() => ucitajAktivnosti()).catch(console.error);
	});

	function otvoriObavljanje(id: string) {
		obavljaId = id;
		obavljaDatum = today;
		obavljaNapomena = '';
		obavljaError = '';
	}

	async function potvrdiObavljanje() {
		if (!obavljaId) return;
		obavljaLoading = true;
		obavljaError = '';
		try {
			await updateAktivnost(obavljaId, obavljaDatum, obavljaNapomena);
			obavljaId = null;
			await ucitajAktivnosti();
		} catch (err) {
			obavljaError = err instanceof Error ? err.message : t.aktivnosti.greska;
		} finally {
			obavljaLoading = false;
		}
	}

	$: zakasnjele   = pending.filter((p) => p.hitnost === 'zakasnila');
	$: danasLista   = pending.filter((p) => p.hitnost === 'danas');
	$: uskoroLista  = pending.filter((p) => p.hitnost === 'uskoro');
	$: buduceLista  = pending.filter((p) => p.hitnost === 'buducnost');
</script>

<svelte:head>
	<title>{t.aktivnosti.pageTitle}</title>
</svelte:head>

<div class="container mx-auto p-4 space-y-5 max-w-2xl">

	<div class="flex items-center justify-between">
		<div>
			<h2 class="h3 font-bold">{t.aktivnosti.title}</h2>
			{#if $prikazanaSezona}
				<p class="text-sm text-surface-500">{t.common.sezona} {$prikazanaSezona.godina}</p>
			{/if}
		</div>
		{#if !loading && pending.length > 0}
			<span class="badge variant-filled-warning">{pending.length} {t.aktivnosti.naCekanju}</span>
		{/if}
	</div>

	<!-- Push notifikacije — banner (prikazuje se samo jednom dok korisnik ne odgovori) -->
	{#if showNotifBanner}
		<div class="card p-3 variant-soft-primary flex items-start gap-3">
			<span class="text-2xl shrink-0 mt-0.5">🔔</span>
			<div class="flex-1 min-w-0">
				<p class="text-sm font-semibold">{t.notifikacije.bannerTitle}</p>
				<p class="text-xs text-surface-500 mt-0.5">{t.notifikacije.bannerOpis}</p>
				{#if notifError}
					<p class="text-xs text-error-500 mt-1">{notifError}</p>
				{/if}
			</div>
			<div class="flex gap-2 shrink-0">
				<button
					class="btn btn-sm variant-ghost-surface"
					on:click={odbijNotifikacije}
					disabled={notifLoading}
				>
					{t.notifikacije.neHvala}
				</button>
				<button
					class="btn btn-sm variant-filled-primary"
					on:click={ukljuciNotifikacije}
					disabled={notifLoading}
				>
					{#if notifLoading}<span class="animate-spin mr-1">↻</span>{/if}
					{t.notifikacije.ukljuci}
				</button>
			</div>
		</div>
	{/if}

	<!-- Status notifikacija ako su već uključene -->
	{#if !showNotifBanner && notifPermission !== 'unsupported'}
		<div class="flex items-center justify-between px-1">
			{#if notifPermission === 'denied'}
				<p class="text-xs text-warning-500">{t.notifikacije.odbijeno}</p>
			{:else if notifSubscribed}
				<p class="text-xs text-success-500">{t.notifikacije.aktivna}</p>
				<button
					class="btn btn-sm variant-ghost-error text-xs"
					on:click={iskljuciNotifikacije}
					disabled={notifLoading}
				>
					{t.notifikacije.iskljuci}
				</button>
			{:else if notifPermission !== 'denied'}
				<!-- granted ili default ali bez aktivne subscription — dozvoli retry -->
				<div class="flex flex-col gap-1 w-full">
					<button
						class="btn btn-sm variant-ghost-primary text-xs self-start"
						on:click={ukljuciNotifikacije}
						disabled={notifLoading}
					>
						{#if notifLoading}<span class="animate-spin mr-1">↻</span>{/if}
						🔔 {t.notifikacije.ukljuci}
					</button>
					{#if notifError}
						<p class="text-xs text-error-500">{notifError}</p>
					{/if}
				</div>
			{/if}
		</div>
	{/if}

	{#if loading}
		<div class="space-y-3">
			{#each Array(5) as _}
				<div class="card p-4 h-16 animate-pulse bg-surface-200-700-token"></div>
			{/each}
		</div>

	{:else if !$prikazanaSezona}
		<div class="flex flex-col items-center justify-center py-16 space-y-3">
			<span class="text-5xl">📅</span>
			<p class="h4 text-center">{t.aktivnosti.nemaSezone}</p>
			<a class="btn variant-filled-primary" href="/kavezi">{t.aktivnosti.iditeNaKaveze}</a>
		</div>

	{:else if $ciklusi.filter((c) => c.status === 'aktivan').length === 0}
		<div class="flex flex-col items-center justify-center py-16 space-y-3">
			<span class="text-5xl">🪺</span>
			<p class="h4 text-center">{t.aktivnosti.nemaAktivnihCiklusa}</p>
			<p class="text-surface-500 text-sm text-center">{t.aktivnosti.nemaAktivnihCiklusaOpis}</p>
			<a class="btn variant-filled-primary" href="/kavezi">{t.aktivnosti.iditeNaKaveze}</a>
		</div>

	{:else if pending.length === 0 && obavljene.length > 0}
		<div class="flex flex-col items-center justify-center py-12 space-y-3">
			<span class="text-5xl">🎉</span>
			<p class="h4 text-center">{t.aktivnosti.sveObavljene}</p>
		</div>

	{:else}

		<!-- Sekcije aktivnosti -->
		{#each [
			{ lista: zakasnjele,  naslov: t.aktivnosti.grupe.zakasnjele, klasa: 'text-error-500'   },
			{ lista: danasLista,  naslov: t.aktivnosti.grupe.danas,      klasa: 'text-warning-600' },
			{ lista: uskoroLista, naslov: t.aktivnosti.grupe.uskoro,     klasa: 'text-primary-500' },
			{ lista: buduceLista, naslov: t.aktivnosti.grupe.buduce,     klasa: 'text-surface-500' }
		] as grupa}
			{#if grupa.lista.length > 0}
				<section class="space-y-2">
					<h3 class="text-xs font-semibold uppercase tracking-wider px-1 {grupa.klasa}">
						{grupa.naslov} ({grupa.lista.length})
					</h3>

					{#each grupa.lista as p (p.aktivnost.id)}
						<div class="card p-4 space-y-3">

							<!-- Redak info -->
							<div class="flex items-center justify-between gap-2">
								<div class="space-y-0.5">
									<p class="font-semibold text-sm">
										<span>K{p.kavez?.oznaka ?? '?'}</span>
										<span class="text-surface-400 mx-1">·</span>
										<span
											style={p.faza ? `color: ${p.faza.boja}` : ''}
										>{p.faza?.naziv ?? '—'}</span>
									</p>
									<p class="text-xs text-surface-500">
										{t.aktivnosti.potrebnoDo} {formatDatum(p.aktivnost.potreban_datum)}
									</p>
								</div>

								{#if obavljaId !== p.aktivnost.id}
									<button
										class="btn btn-sm variant-soft-success shrink-0"
										on:click={() => otvoriObavljanje(p.aktivnost.id)}
									>
										{t.aktivnosti.obavi}
									</button>
								{/if}
							</div>

							<!-- Inline forma za obavljanje -->
							{#if obavljaId === p.aktivnost.id}
								<div class="space-y-3 pt-1 border-t border-surface-200-700-token">
									<div class="grid grid-cols-2 gap-3">
										<label class="label">
											<span class="text-xs">{t.aktivnosti.datumObavljanja}</span>
											<input
												class="input input-sm"
												type="date"
												bind:value={obavljaDatum}
												disabled={obavljaLoading}
											/>
										</label>
										<label class="label">
											<span class="text-xs">{t.aktivnosti.napomenaOpt}</span>
											<input
												class="input input-sm"
												type="text"
												bind:value={obavljaNapomena}
												placeholder={t.aktivnosti.napomenaPlaceholder}
												disabled={obavljaLoading}
											/>
										</label>
									</div>

									{#if obavljaError}
										<p class="text-error-500 text-xs">{obavljaError}</p>
									{/if}

									<div class="flex gap-2">
										<button
											class="btn btn-sm variant-ghost flex-1"
											on:click={() => { obavljaId = null; obavljaError = ''; }}
											disabled={obavljaLoading}
										>
											{t.common.odustani}
										</button>
										<button
											class="btn btn-sm variant-filled-success flex-1"
											on:click={potvrdiObavljanje}
											disabled={obavljaLoading || !obavljaDatum}
										>
											{#if obavljaLoading}<span class="animate-spin mr-1">↻</span>{/if}
											{t.common.potvrdi}
										</button>
									</div>
								</div>
							{/if}
						</div>
					{/each}
				</section>
			{/if}
		{/each}

	{/if}

	<!-- Obavljene (collapsible) — uvijek vidljiv ako postoje -->
	{#if obavljene.length > 0}
		<section class="space-y-2">
			<button
				class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-surface-400 px-1 w-full"
				on:click={() => (prikaziObavljene = !prikaziObavljene)}
			>
				{t.aktivnosti.obavljene} ({obavljene.length})
				<span class="ml-auto">{prikaziObavljene ? '▲' : '▼'}</span>
			</button>

			{#if prikaziObavljene}
				<div class="space-y-1">
					{#each obavljene as a (a.id)}
						{@const faza = $faze.find((f) => f.id === a.faza_id)}
						{@const ciklus = $ciklusi.find((c) => c.id === a.ciklus_id)}
						{@const kavez = $kavezi.find((k) => k.id === ciklus?.kavez_id)}
						<div class="card p-3 opacity-55 flex items-center justify-between gap-2">
							<p class="text-sm">
								<span class="font-medium">K{kavez?.oznaka ?? '?'}</span>
								<span class="text-surface-400 mx-1">·</span>
								<span>{faza?.naziv ?? '—'}</span>
							</p>
							<p class="text-xs text-surface-400 shrink-0">
								✅ {a.datum ? formatDatum(a.datum) : ''}
							</p>
						</div>
					{/each}
				</div>
			{/if}
		</section>
	{/if}
</div>
