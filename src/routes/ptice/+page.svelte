<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';

	import { user } from '$lib/stores/auth';
	import { ptice, pticeMuzjaci, pticeSenke, pticaLoading, loadPtice } from '$lib/stores/ptice';
	import { postavke, loadPostavke, savePostavke } from '$lib/stores/postavke';
	import { aktivnaSezona } from '$lib/stores/sezona';
	import { db } from '$lib/db/dexie';
	import { supabase } from '$lib/supabase/client';
	import type { Ptica, VrstaPtica } from '$lib/db/schema';

	import NovaPticaModal from '$lib/components/NovaPticaModal.svelte';
	import { t } from '$lib/i18n';

	type Filter = 'sve' | 'muzjaci' | 'zenke' | 'ovaSezone' | 'ostale';

	let vrstePtica: VrstaPtica[] = [];
	let filter: Filter = 'sve';
	let loading = true;
	let modalOtvoren = false;
	let editPtica: Ptica | null = null;

	// Postavke / prefiks
	let editPrefiks = false;
	let prefiksInput = '';
	let prefiksSaving = false;

	let pretragaBroj = '';
	let pretragaGodina = '';

	function resetujPretragu() {
		pretragaBroj = '';
		pretragaGodina = '';
	}

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

		const [localPtice, localVrste] = await Promise.all([
			db.ptice.where('user_id').equals(currentUser.id).toArray(),
			db.vrsta_ptica.toArray()
		]);
		ptice.set(localPtice);
		vrstePtica = localVrste.sort((a, b) => a.naziv.localeCompare(b.naziv));
		loading = false;

		loadPtice(currentUser.id);
		loadVrstePtica();
		await loadPostavke(currentUser.id);
		prefiksInput = $postavke?.prsten_prefiks ?? '';
	});

	async function sacuvajPrefiks() {
		const currentUser = get(user);
		if (!currentUser) return;
		prefiksSaving = true;
		await savePostavke(currentUser.id, { prsten_prefiks: prefiksInput.trim() });
		prefiksSaving = false;
		editPrefiks = false;
	}

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

	// Godina aktivne sezone (ili tekuća godina ako nema sezone)
	$: tekucaGodina = $aktivnaSezona?.godina ?? new Date().getFullYear();

	// Ove sezone = ptice s unesenom godinom koja odgovara aktivnoj sezoni
	$: pticeOveSezone = $ptice.filter((p) => p.godina === tekucaGodina);
	$: pticeOstale = $ptice.filter((p) => p.godina !== tekucaGodina);

	// Filtrirane + pretražene ptice
	$: bazaPtica =
		filter === 'muzjaci'   ? $pticeMuzjaci :
		filter === 'zenke'     ? $pticeSenke :
		filter === 'ovaSezone' ? pticeOveSezone :
		filter === 'ostale'    ? pticeOstale :
		$ptice;

	$: pretragaAktivna = pretragaBroj.trim() !== '' || pretragaGodina.trim() !== '';

	$: filtriranePtice = bazaPtica.filter((p) => {
		const broj = pretragaBroj.trim();
		const godina = pretragaGodina.trim();
		const brojOk = broj === '' ||
			(p.prsten_redni_broj != null && String(p.prsten_redni_broj) === broj);
		const godinaOk = godina === '' ||
			String(p.godina ?? '') === godina ||
			(p.datum_rodjenja?.startsWith(godina) ?? false);
		return brojOk && godinaOk;
	});

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

	function postaviFilter(val: string) { filter = val as Filter; }
</script>

<svelte:head>
	<title>{t.ptice.pageTitle}</title>
</svelte:head>

<div class="container mx-auto p-4 space-y-4 max-w-2xl">

	<!-- Header -->
	<div class="flex items-center justify-between">
		<h2 class="h3 font-bold">{t.ptice.title}</h2>
		{#if !loading}
			<button class="btn variant-filled-primary btn-sm" on:click={otvoriNova}>
				{t.ptice.novaPtica}
			</button>
		{/if}
	</div>

	<!-- Postavke prefiksa -->
	{#if !loading}
		<div class="card p-3 variant-soft-surface space-y-2">
			<div class="flex items-center justify-between gap-2">
				<div>
					<p class="text-sm font-medium">{t.ptice.prsten_prefiks}</p>
					{#if !editPrefiks}
						<p class="text-xs text-surface-500">
							{$postavke?.prsten_prefiks || '—'}
						</p>
					{/if}
				</div>
				{#if !editPrefiks}
					<button class="btn btn-sm variant-ghost" on:click={() => { editPrefiks = true; prefiksInput = $postavke?.prsten_prefiks ?? ''; }}>
						✏️
					</button>
				{/if}
			</div>
			{#if editPrefiks}
				<div class="flex gap-2">
					<input
						class="input input-sm flex-1"
						type="text"
						bind:value={prefiksInput}
						placeholder={t.ptice.prsten_prefiksPlaceholder}
					/>
					<button class="btn btn-sm variant-filled-primary" on:click={sacuvajPrefiks} disabled={prefiksSaving}>
						{#if prefiksSaving}<span class="animate-spin mr-1">↻</span>{/if}
						{t.ptice.sacuvajPostavke}
					</button>
					<button class="btn btn-sm variant-ghost" on:click={() => (editPrefiks = false)}>✕</button>
				</div>
				<p class="text-xs text-surface-400">{t.ptice.prsten_prefiksOpis}</p>
			{/if}
		</div>
	{/if}

	<!-- Filter tabovi -->
	{#if !loading && $ptice.length > 0}
		<div class="flex gap-2 flex-wrap">
			{#each [
				['sve',        t.ptice.filtar.sve,           $ptice.length],
				['muzjaci',    t.ptice.filtar.muzjaci,        $pticeMuzjaci.length],
				['zenke',      t.ptice.filtar.zenke,          $pticeSenke.length],
				['ovaSezone',  `🐣 ${tekucaGodina}`,          pticeOveSezone.length],
				['ostale',     t.ptice.filtar.ostale,         pticeOstale.length]
			] as [val, label, count] (val)}
				<button
					class="btn btn-sm {filter === val ? 'variant-filled-primary' : 'variant-soft'}"
					on:click={() => postaviFilter(val)}
				>
					{label}
					<span class="badge {filter === val ? 'bg-white/30' : 'variant-soft'} text-xs ml-1 px-1">
						{count}
					</span>
				</button>
			{/each}
		</div>

		<!-- Pretraga po prstenu -->
		<div class="flex gap-2 items-end">
			<label class="label flex-1">
				<span class="text-xs text-surface-500">{t.ptice.pretragaPoRednomBroju}</span>
				<input
					class="input input-sm"
					type="text"
					inputmode="numeric"
					bind:value={pretragaBroj}
					placeholder="1, 2, 3..."
				/>
			</label>
			<label class="label w-28">
				<span class="text-xs text-surface-500">{t.ptice.pretragaPoGodini}</span>
				<input
					class="input input-sm"
					type="text"
					inputmode="numeric"
					bind:value={pretragaGodina}
					placeholder="2026"
				/>
			</label>
			{#if pretragaAktivna}
				<button
					class="btn btn-sm variant-ghost-error mb-0.5 shrink-0"
					on:click={resetujPretragu}
					title="Resetuj pretragu"
				>✕</button>
			{/if}
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
			<p class="h4 text-center">{t.ptice.nemaPtica}</p>
			<p class="text-surface-500 text-sm text-center max-w-xs">
				{t.ptice.nemaPticaOpis}
			</p>
			<button class="btn variant-filled-primary" on:click={otvoriNova}>
				{t.ptice.dodajPrvu}
			</button>
		</div>

	<!-- Lista ptica -->
	{:else if filtriranePtice.length === 0}
		<p class="text-center text-surface-500 py-8">{t.ptice.filtar.nemaPticaZaFilter}</p>

	{:else}
		<div class="space-y-2">
			{#each filtriranePtice as ptica (ptica.id)}
				<div class="card p-4 border-l-4"
					style="border-left-color: {ptica.godina === tekucaGodina ? '#22c55e' : 'transparent'}"
				>
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
									{t.ptice.uredi}
								</button>
							</div>

							<p class="text-sm text-surface-500">{vrstaLabel(ptica.vrsta_ptica_id)}</p>

							<!-- Prsten + redni broj + datum -->
							<div class="flex items-center gap-3 text-xs text-surface-500 flex-wrap">
								{#if ptica.prstena_oznaka}
									<span>📍 {ptica.prstena_oznaka}{ptica.prsten_redni_broj != null ? `-${ptica.prsten_redni_broj}` : ''}</span>
								{:else if ptica.prsten_redni_broj != null}
									<span>📍 #{ptica.prsten_redni_broj}</span>
								{/if}
								{#if ptica.datum_rodjenja}
									<span>🎂 {formatDatum(ptica.datum_rodjenja)}</span>
								{:else if ptica.godina}
									<span>📅 {ptica.godina}</span>
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
		prstenPrefiks={$postavke?.prsten_prefiks ?? ''}
		onClose={() => { modalOtvoren = false; editPtica = null; }}
		onSuccess={handleSacuvano}
	/>
{/if}
