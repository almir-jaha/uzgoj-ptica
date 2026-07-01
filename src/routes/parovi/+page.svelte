<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';

	import { user } from '$lib/stores/auth';
	import { aktivnaSezona, prikazanaSezona, loadSezone } from '$lib/stores/sezona';
	import { parovi, loadParovi, finishPar } from '$lib/stores/parovi';
	import { ptice, loadPtice } from '$lib/stores/ptice';

	import NovParModal from '$lib/components/NovParModal.svelte';
	import { t } from '$lib/i18n';
	import { lokalnoSezone, lokalnoPodaci } from '$lib/utils/localLoad';

	let loading = true;
	let novParOpen = false;

	// Inline potvrda završetka: čuvamo id para koji se završava
	let zavrsiParId: string | null = null;
	let zavrsiStatus: 'završen' | 'razdvojen' = 'završen';
	let zavrsiLoading = false;
	let zavrsiError = '';

	onMount(async () => {
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

		if (sezona) {
			await lokalnoPodaci(sezona.id, currentUser.id);
			loadedSezonaId = sezona.id;
		}
		loading = false;

		// Background: samo parovi i ptice — NE loadSezone (uzrokuje race condition)
		if (sezona) {
			loadPtice(currentUser.id).catch(console.error);
			loadParovi(sezona.id).catch(console.error);
		}
	});

	// Reaktivno: promjena sezone (season switcher na kavezi stranici) → reload
	let loadedSezonaId = '';
	$: if ($prikazanaSezona && $prikazanaSezona.id !== loadedSezonaId && !loading) {
		loadedSezonaId = $prikazanaSezona.id;
		loadParovi($prikazanaSezona.id).catch(console.error);
	}

	async function handleNovPar() {
		novParOpen = false;
		const sezona = get(prikazanaSezona);
		if (sezona) await loadParovi(sezona.id);
	}

	async function potvrdiZavrsetak() {
		if (!zavrsiParId) return;
		zavrsiLoading = true;
		zavrsiError = '';
		try {
			await finishPar(zavrsiParId, zavrsiStatus);
			zavrsiParId = null;
		} catch (err) {
			zavrsiError = err instanceof Error ? err.message : $t.parovi.greska;
		} finally {
			zavrsiLoading = false;
		}
	}

	function otvoriZavrsetak(parId: string) {
		zavrsiParId = parId;
		zavrsiStatus = 'završen';
		zavrsiError = '';
	}

	// Helpers
	function pticaLabel(id: string): string {
		const p = $ptice.find((pt) => pt.id === id);
		return p?.naziv || p?.prstena_oznaka || id.slice(0, 8);
	}

	function pticaSpol(id: string): '♂' | '♀' | '?' {
		const p = $ptice.find((pt) => pt.id === id);
		return p?.spol === 'M' ? '♂' : p?.spol === 'Ž' ? '♀' : '?';
	}

	function formatDatum(datum: string): string {
		return new Date(datum).toLocaleDateString('hr-BA', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		});
	}

	$: aktivniParovi = $parovi.filter((p) => p.status === 'aktivan');
	$: zavrseniParovi = $parovi.filter((p) => p.status !== 'aktivan');
</script>

<svelte:head>
	<title>{$t.parovi.pageTitle}</title>
</svelte:head>

<div class="container mx-auto p-4 space-y-4 max-w-2xl">

	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h2 class="h3 font-bold">{$t.parovi.title}</h2>
			{#if $prikazanaSezona}
				<p class="text-sm text-surface-500">{$t.common.sezona} {$prikazanaSezona.godina}</p>
			{/if}
		</div>
		{#if $prikazanaSezona && !loading}
			<button class="btn variant-filled-primary btn-sm" on:click={() => (novParOpen = true)}>
				{$t.parovi.noviPar}
			</button>
		{/if}
	</div>

	<!-- Loading skeleton -->
	{#if loading}
		<div class="space-y-3">
			{#each Array(3) as _}
				<div class="card p-4 h-20 animate-pulse bg-surface-200-700-token"></div>
			{/each}
		</div>

	<!-- Nema aktivne sezone -->
	{:else if !$prikazanaSezona}
		<div class="flex flex-col items-center justify-center py-16 space-y-3">
			<span class="text-5xl">📅</span>
			<p class="h4 text-center">{$t.parovi.nemaSezone}</p>
			<p class="text-surface-500 text-sm text-center">
				{$t.parovi.nemaSezoneOpis}
			</p>
			<a class="btn variant-filled-primary" href="/kavezi">{$t.parovi.iditeNaKaveze}</a>
		</div>

	<!-- Nema ptica -->
	{:else if $ptice.length === 0}
		<div class="flex flex-col items-center justify-center py-16 space-y-3">
			<span class="text-5xl">🐦</span>
			<p class="h4 text-center">{$t.parovi.nemaPtica}</p>
			<p class="text-surface-500 text-sm text-center">
				{$t.parovi.nemaPticaOpis}
			</p>
			<a class="btn variant-filled-primary" href="/ptice">{$t.parovi.dodajPtice}</a>
		</div>

	{:else}

		<!-- Aktivni parovi -->
		{#if aktivniParovi.length > 0}
			<section class="space-y-2">
				<h3 class="text-xs font-semibold text-surface-500 uppercase tracking-wider px-1">
					{$t.parovi.aktivniParovi} ({aktivniParovi.length})
				</h3>

				{#each aktivniParovi as par (par.id)}
					<div class="card p-4 space-y-3 border-l-4 border-l-success-500">

						<!-- Par info -->
						<div class="flex items-start justify-between gap-2">
							<div class="space-y-0.5">
								<p class="font-semibold">
									<span class="text-primary-500">{pticaSpol(par.ptica1_id)}</span>
									{pticaLabel(par.ptica1_id)}
									<span class="text-surface-400 mx-1 font-normal">/</span>
									<span class="text-tertiary-500">{pticaSpol(par.ptica2_id)}</span>
									{pticaLabel(par.ptica2_id)}
								</p>
								<p class="text-xs text-surface-500">
									{$t.parovi.od} {formatDatum(par.datum_formiranja)}
								</p>
								{#if par.napomena}
									<p class="text-xs text-surface-500 italic">{par.napomena}</p>
								{/if}
							</div>
							<span class="badge variant-filled-success text-xs shrink-0">{$t.parovi.aktivan}</span>
						</div>

						<!-- Inline završetak -->
						{#if zavrsiParId === par.id}
							<div class="space-y-2 pt-1 border-t border-surface-200-700-token">
								<p class="text-sm font-medium">{$t.parovi.zavrsiPitanje}</p>
								<div class="flex gap-2">
									<label class="flex items-center gap-1.5 text-sm cursor-pointer">
										<input
											type="radio"
											class="radio radio-sm"
											bind:group={zavrsiStatus}
											value="završen"
											disabled={zavrsiLoading}
										/>
										{$t.parovi.zavrsen}
									</label>
									<label class="flex items-center gap-1.5 text-sm cursor-pointer">
										<input
											type="radio"
											class="radio radio-sm"
											bind:group={zavrsiStatus}
											value="razdvojen"
											disabled={zavrsiLoading}
										/>
										{$t.parovi.razdvojen}
									</label>
								</div>
								{#if zavrsiError}
									<p class="text-error-500 text-xs">{zavrsiError}</p>
								{/if}
								<div class="flex gap-2">
									<button
										class="btn btn-sm variant-ghost flex-1"
										on:click={() => { zavrsiParId = null; zavrsiError = ''; }}
										disabled={zavrsiLoading}
									>
										{$t.common.odustani}
									</button>
									<button
										class="btn btn-sm variant-filled-warning flex-1"
										on:click={potvrdiZavrsetak}
										disabled={zavrsiLoading}
									>
										{#if zavrsiLoading}<span class="animate-spin mr-1">↻</span>{/if}
										{$t.common.potvrdi}
									</button>
								</div>
							</div>
						{:else}
							<button
								class="btn btn-sm variant-soft-warning w-full"
								on:click={() => otvoriZavrsetak(par.id)}
							>
								{$t.parovi.zavrsiPar}
							</button>
						{/if}
					</div>
				{/each}
			</section>
		{:else}
			<!-- Nema aktivnih parova ali ima ptica -->
			<div class="flex flex-col items-center justify-center py-12 space-y-3">
				<span class="text-5xl">🪺</span>
				<p class="text-surface-500 text-center">
					{$t.parovi.nemaAktivnih}
				</p>
				<button class="btn variant-filled-primary" on:click={() => (novParOpen = true)}>
					{$t.parovi.kreirajPrvi}
				</button>
			</div>
		{/if}

		<!-- Arhiva završenih/razdvojenih -->
		{#if zavrseniParovi.length > 0}
			<section class="space-y-2">
				<h3 class="text-xs font-semibold text-surface-500 uppercase tracking-wider px-1">
					{$t.parovi.arhiva} ({zavrseniParovi.length})
				</h3>
				{#each zavrseniParovi as par (par.id)}
					<div class="card p-4 opacity-60">
						<div class="flex items-center justify-between gap-2">
							<div class="space-y-0.5">
								<p class="font-medium text-sm">
									{pticaSpol(par.ptica1_id)} {pticaLabel(par.ptica1_id)}
									<span class="text-surface-400 mx-1">/</span>
									{pticaSpol(par.ptica2_id)} {pticaLabel(par.ptica2_id)}
								</p>
								<p class="text-xs text-surface-500">
									{formatDatum(par.datum_formiranja)}
								</p>
								{#if par.napomena}
									<p class="text-xs text-surface-500 italic">{par.napomena}</p>
								{/if}
							</div>
							<span
								class="badge {par.status === 'završen'
									? 'variant-soft-surface'
									: 'variant-soft-warning'} text-xs shrink-0"
							>
								{par.status === 'završen' ? $t.parovi.zavrsen : $t.parovi.razdvojen}
							</span>
						</div>
					</div>
				{/each}
			</section>
		{/if}

	{/if}
</div>

<!-- Modal: novi par -->
{#if novParOpen && $prikazanaSezona}
	<NovParModal
		sezonaId={$prikazanaSezona.id}
		sezonaGodina={$prikazanaSezona.godina}
		onClose={() => (novParOpen = false)}
		onSuccess={handleNovPar}
	/>
{/if}
