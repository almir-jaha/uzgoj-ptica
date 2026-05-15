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
			obavljaError = err instanceof Error ? err.message : 'Greška';
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
	<title>Aktivnosti – Uzgoj ptica</title>
</svelte:head>

<div class="container mx-auto p-4 space-y-5 max-w-2xl">

	<div class="flex items-center justify-between">
		<div>
			<h2 class="h3 font-bold">Aktivnosti</h2>
			{#if $prikazanaSezona}
				<p class="text-sm text-surface-500">Sezona {$prikazanaSezona.godina}</p>
			{/if}
		</div>
		{#if !loading && pending.length > 0}
			<span class="badge variant-filled-warning">{pending.length} na čekanju</span>
		{/if}
	</div>

	{#if loading}
		<div class="space-y-3">
			{#each Array(5) as _}
				<div class="card p-4 h-16 animate-pulse bg-surface-200-700-token"></div>
			{/each}
		</div>

	{:else if !$prikazanaSezona}
		<div class="flex flex-col items-center justify-center py-16 space-y-3">
			<span class="text-5xl">📅</span>
			<p class="h4 text-center">Nema aktivne sezone</p>
			<a class="btn variant-filled-primary" href="/kavezi">Idi na Kaveze</a>
		</div>

	{:else if $ciklusi.filter((c) => c.status === 'aktivan').length === 0}
		<div class="flex flex-col items-center justify-center py-16 space-y-3">
			<span class="text-5xl">🪺</span>
			<p class="h4 text-center">Nema aktivnih ciklusa</p>
			<p class="text-surface-500 text-sm text-center">Pokrenite ciklus na stranici Kavezi.</p>
			<a class="btn variant-filled-primary" href="/kavezi">Idi na Kaveze</a>
		</div>

	{:else if pending.length === 0 && obavljene.length > 0}
		<div class="flex flex-col items-center justify-center py-12 space-y-3">
			<span class="text-5xl">🎉</span>
			<p class="h4 text-center">Sve aktivnosti obavljene!</p>
		</div>

	{:else}

		<!-- Sekcije aktivnosti -->
		{#each [
			{ lista: zakasnjele,  naslov: '⚠ Zakašnjele',        klasa: 'text-error-500'   },
			{ lista: danasLista,  naslov: '📅 Danas',             klasa: 'text-warning-600' },
			{ lista: uskoroLista, naslov: '🔔 Uskoro – 7 dana',   klasa: 'text-primary-500' },
			{ lista: buduceLista, naslov: '📋 Buduće',            klasa: 'text-surface-500' }
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
										Potrebno do: {formatDatum(p.aktivnost.potreban_datum)}
									</p>
								</div>

								{#if obavljaId !== p.aktivnost.id}
									<button
										class="btn btn-sm variant-soft-success shrink-0"
										on:click={() => otvoriObavljanje(p.aktivnost.id)}
									>
										✓ Obavi
									</button>
								{/if}
							</div>

							<!-- Inline forma za obavljanje -->
							{#if obavljaId === p.aktivnost.id}
								<div class="space-y-3 pt-1 border-t border-surface-200-700-token">
									<div class="grid grid-cols-2 gap-3">
										<label class="label">
											<span class="text-xs">Datum obavljanja</span>
											<input
												class="input input-sm"
												type="date"
												bind:value={obavljaDatum}
												disabled={obavljaLoading}
											/>
										</label>
										<label class="label">
											<span class="text-xs">Napomena (opt.)</span>
											<input
												class="input input-sm"
												type="text"
												bind:value={obavljaNapomena}
												placeholder="Bilješka..."
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
											Odustani
										</button>
										<button
											class="btn btn-sm variant-filled-success flex-1"
											on:click={potvrdiObavljanje}
											disabled={obavljaLoading || !obavljaDatum}
										>
											{#if obavljaLoading}<span class="animate-spin mr-1">↻</span>{/if}
											Potvrdi
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
				✅ Obavljene ({obavljene.length})
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
