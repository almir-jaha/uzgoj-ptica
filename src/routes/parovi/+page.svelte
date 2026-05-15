<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';

	import { user } from '$lib/stores/auth';
	import { aktivnaSezona, loadSezone } from '$lib/stores/sezona';
	import { parovi, loadParovi, finishPar } from '$lib/stores/parovi';
	import { ptice, loadPtice } from '$lib/stores/ptice';

	import NovParModal from '$lib/components/NovParModal.svelte';
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

		// Brzo iz Dexie — prikaži odmah
		await lokalnoSezone(currentUser.id);
		const sezona = get(aktivnaSezona);
		if (sezona) await lokalnoPodaci(sezona.id, currentUser.id);
		loading = false;

		// Background Supabase sync
		if (sezona) {
			loadPtice(currentUser.id);
			loadSezone(currentUser.id);
			loadParovi(sezona.id);
		}
	});

	async function handleNovPar() {
		novParOpen = false;
		const sezona = get(aktivnaSezona);
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
			zavrsiError = err instanceof Error ? err.message : 'Greška pri završetku';
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
	<title>Parovi – Uzgoj ptica</title>
</svelte:head>

<div class="container mx-auto p-4 space-y-4 max-w-2xl">

	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h2 class="h3 font-bold">Parovi</h2>
			{#if $aktivnaSezona}
				<p class="text-sm text-surface-500">Sezona {$aktivnaSezona.godina}</p>
			{/if}
		</div>
		{#if $aktivnaSezona && !loading}
			<button class="btn variant-filled-primary btn-sm" on:click={() => (novParOpen = true)}>
				+ Novi par
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
	{:else if !$aktivnaSezona}
		<div class="flex flex-col items-center justify-center py-16 space-y-3">
			<span class="text-5xl">📅</span>
			<p class="h4 text-center">Nema aktivne sezone</p>
			<p class="text-surface-500 text-sm text-center">
				Kreirajte sezonu na stranici Kavezi.
			</p>
			<a class="btn variant-filled-primary" href="/kavezi">Idi na Kaveze</a>
		</div>

	<!-- Nema ptica -->
	{:else if $ptice.length === 0}
		<div class="flex flex-col items-center justify-center py-16 space-y-3">
			<span class="text-5xl">🐦</span>
			<p class="h4 text-center">Nema unesenih ptica</p>
			<p class="text-surface-500 text-sm text-center">
				Dodajte ptice kako biste mogli kreirati parove.
			</p>
			<a class="btn variant-filled-primary" href="/ptice">Dodaj ptice</a>
		</div>

	{:else}

		<!-- Aktivni parovi -->
		{#if aktivniParovi.length > 0}
			<section class="space-y-2">
				<h3 class="text-xs font-semibold text-surface-500 uppercase tracking-wider px-1">
					Aktivni parovi ({aktivniParovi.length})
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
									📅 Od {formatDatum(par.datum_formiranja)}
								</p>
								{#if par.napomena}
									<p class="text-xs text-surface-500 italic">{par.napomena}</p>
								{/if}
							</div>
							<span class="badge variant-filled-success text-xs shrink-0">Aktivan</span>
						</div>

						<!-- Inline završetak -->
						{#if zavrsiParId === par.id}
							<div class="space-y-2 pt-1 border-t border-surface-200-700-token">
								<p class="text-sm font-medium">Završi par?</p>
								<div class="flex gap-2">
									<label class="flex items-center gap-1.5 text-sm cursor-pointer">
										<input
											type="radio"
											class="radio radio-sm"
											bind:group={zavrsiStatus}
											value="završen"
											disabled={zavrsiLoading}
										/>
										Završen
									</label>
									<label class="flex items-center gap-1.5 text-sm cursor-pointer">
										<input
											type="radio"
											class="radio radio-sm"
											bind:group={zavrsiStatus}
											value="razdvojen"
											disabled={zavrsiLoading}
										/>
										Razdvojen
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
										Odustani
									</button>
									<button
										class="btn btn-sm variant-filled-warning flex-1"
										on:click={potvrdiZavrsetak}
										disabled={zavrsiLoading}
									>
										{#if zavrsiLoading}<span class="animate-spin mr-1">↻</span>{/if}
										Potvrdi
									</button>
								</div>
							</div>
						{:else}
							<button
								class="btn btn-sm variant-soft-warning w-full"
								on:click={() => otvoriZavrsetak(par.id)}
							>
								Završi par
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
					Nema aktivnih parova u ovoj sezoni.
				</p>
				<button class="btn variant-filled-primary" on:click={() => (novParOpen = true)}>
					Kreiraj prvi par
				</button>
			</div>
		{/if}

		<!-- Arhiva završenih/razdvojenih -->
		{#if zavrseniParovi.length > 0}
			<section class="space-y-2">
				<h3 class="text-xs font-semibold text-surface-500 uppercase tracking-wider px-1">
					Arhiva ({zavrseniParovi.length})
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
								{par.status === 'završen' ? 'Završen' : 'Razdvojen'}
							</span>
						</div>
					</div>
				{/each}
			</section>
		{/if}

	{/if}
</div>

<!-- Modal: novi par -->
{#if novParOpen && $aktivnaSezona}
	<NovParModal
		sezonaId={$aktivnaSezona.id}
		onClose={() => (novParOpen = false)}
		onSuccess={handleNovPar}
	/>
{/if}
