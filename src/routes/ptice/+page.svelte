<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';

	import { user } from '$lib/stores/auth';
	import { ptice, filtriranePtice, pticeMuzjaci, pticeSenke, pticaLoading, loadPtice } from '$lib/stores/ptice';
	import { aktivnaSezona } from '$lib/stores/sezona';
	import { aktivnaUzgajivacnica } from '$lib/stores/uzgajivacnica';
	import { tierLimits, jeNaLimitPtica } from '$lib/stores/userTier';
	import { db } from '$lib/db/dexie';
	import { supabase } from '$lib/supabase/client';
	import type { Ptica, VrstaPtica } from '$lib/db/schema';

	import NovaPticaModal from '$lib/components/NovaPticaModal.svelte';
	import RodovnikModal from '$lib/components/RodovnikModal.svelte';
	import { t } from '$lib/i18n';

	type Filter = 'sve' | 'muzjaci' | 'zenke' | 'ovaSezone' | 'ostale';

	let vrstePtica: VrstaPtica[] = [];
	let filter: Filter = 'sve';
	let loading = true;
	let modalOtvoren = false;
	let editPtica: Ptica | null = null;
	let rodovnikModalOtvoren = false;
	let rodovnikPtica: Ptica | null = null;

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

	function otvoriRodovnik(ptica: Ptica) {
		rodovnikPtica = ptica;
		rodovnikModalOtvoren = true;
	}

	function otvoriNova() {
		editPtica = null;
		modalOtvoren = true;
	}

	// Status evidencije
	const STATUS_OPCIJE = [
		{ value: 'aktivna',    label: '✅ Aktivna' },
		{ value: 'uginula',    label: '💀 Uginula' },
		{ value: 'prodata',    label: '💰 Prodata' },
		{ value: 'poklonjena', label: '🎁 Poklonjena' },
		{ value: 'ostalo',     label: '📝 Ostalo' }
	];

	let statusPtica: Ptica | null = null;
	let statusVrijednost = 'aktivna';
	let statusDatum = new Date().toISOString().split('T')[0];
	let statusNapomena = '';
	let statusLoading = false;

	function otvoriStatus(ptica: Ptica) {
		statusPtica = ptica;
		statusVrijednost = ptica.status_evidencije ?? 'aktivna';
		statusDatum = new Date().toISOString().split('T')[0];
		statusNapomena = '';
	}

	async function sacuvajStatus() {
		if (!statusPtica) return;
		statusLoading = true;
		try {
			await updatePtica(statusPtica.id, {
				status_evidencije: statusVrijednost as Ptica['status_evidencije'],
				datum_statusa: statusDatum || undefined,
				napomena_statusa: statusNapomena.trim() || undefined
			});
			statusPtica = null;
		} finally {
			statusLoading = false;
		}
	}

	// Godina aktivne sezone (ili tekuća godina ako nema sezone)
	$: tekucaGodina = $aktivnaSezona?.godina ?? new Date().getFullYear();

	// Ove sezone = ptice s unesenom godinom koja odgovara aktivnoj sezoni (iz aktivne uzgajivačnice)
	$: pticeOveSezone = $filtriranePtice.filter((p) => p.godina === tekucaGodina);
	$: pticeOstale = $filtriranePtice.filter((p) => p.godina !== tekucaGodina);

	// Filtrirane + pretražene ptice
	$: bazaPtica =
		filter === 'muzjaci'   ? $pticeMuzjaci :
		filter === 'zenke'     ? $pticeSenke :
		filter === 'ovaSezone' ? pticeOveSezone :
		filter === 'ostale'    ? pticeOstale :
		$filtriranePtice;

	$: pretragaAktivna = pretragaBroj.trim() !== '' || pretragaGodina.trim() !== '';

	$: pticaSearch = bazaPtica.filter((p) => {
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
			{#if jeNaLimitPtica($ptice.length, $tierLimits)}
				<span class="badge variant-filled-warning text-xs" title="Dostignut limit za vaš plan">
					🔒 {$ptice.length}/{$tierLimits.max_ptice} ptica
				</span>
			{:else}
				<button class="btn variant-filled-primary btn-sm" on:click={otvoriNova}>
					{t.ptice.novaPtica}
				</button>
			{/if}
		{/if}
	</div>

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
	{:else if pticaSearch.length === 0}
		<p class="text-center text-surface-500 py-8">{t.ptice.filtar.nemaPticaZaFilter}</p>

	{:else}
		<div class="space-y-2">
			{#each pticaSearch as ptica (ptica.id)}
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
								<div class="flex gap-1 shrink-0 flex-wrap justify-end">
									{#if ptica.status_evidencije && ptica.status_evidencije !== "aktivna"}
										<span class="badge variant-filled-error text-xs self-center">
											{STATUS_OPCIJE.find(o => o.value === ptica.status_evidencije)?.label ?? ptica.status_evidencije}
										</span>
									{/if}
									<button class="btn btn-sm variant-ghost-surface" on:click={() => otvoriUredi(ptica)}>{t.ptice.uredi}</button>
									<button class="btn btn-sm variant-ghost-tertiary" on:click={() => otvoriRodovnik(ptica)}>Pedigre</button>
									<button
										class="btn btn-sm {ptica.status_evidencije && ptica.status_evidencije !== 'aktivna' ? 'variant-soft-error' : 'variant-ghost-surface'}"
										on:click={() => otvoriStatus(ptica)}
										title="Status ptice"
									>📋</button>
								</div>
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
		uzgajivacnicaId={$aktivnaUzgajivacnica?.id ?? ''}
		{vrstePtica}
		{editPtica}
		prstenPrefiks={$aktivnaUzgajivacnica?.prsten_prefiks ?? ''}
		onClose={() => { modalOtvoren = false; editPtica = null; }}
		onSuccess={handleSacuvano}
	/>
{/if}

<!-- Rodovnik Modal -->
{#if rodovnikModalOtvoren && rodovnikPtica}
	<RodovnikModal
		ptica={rodovnikPtica}
		onClose={() => { rodovnikModalOtvoren = false; rodovnikPtica = null; }}
	/>
{/if}

<!-- Status evidencije modal -->
{#if statusPtica}
	<div
		class="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4"
		role="presentation"
		on:click|self={() => statusPtica = null}
		on:keydown={(e) => e.key === "Escape" && (statusPtica = null)}
	>
		<div class="card w-full max-w-sm p-6 space-y-4">
			<header class="flex items-center justify-between">
				<h3 class="h4 font-bold">Status ptice</h3>
				<button class="btn-icon btn-icon-sm variant-ghost" on:click={() => statusPtica = null}>✕</button>
			</header>
			<p class="text-sm text-surface-500 font-medium truncate">
				{statusPtica.naziv || statusPtica.prstena_oznaka || statusPtica.id.slice(0, 8)}
			</p>
			<div class="space-y-3">
				<label class="label">
					<span class="text-sm font-medium">Status</span>
					<select class="select" bind:value={statusVrijednost} disabled={statusLoading}>
						{#each STATUS_OPCIJE as op}
							<option value={op.value}>{op.label}</option>
						{/each}
					</select>
				</label>
				{#if statusVrijednost !== 'aktivna'}
					<label class="label">
						<span class="text-sm font-medium">Datum</span>
						<input class="input" type="date" bind:value={statusDatum} disabled={statusLoading} />
					</label>
					<label class="label">
						<span class="text-sm font-medium">Napomena</span>
						<textarea class="textarea text-sm" rows="2" bind:value={statusNapomena}
							placeholder="Npr. Prodana Ivanu Ivanoviću, Uginula zbog bolesti..."
							disabled={statusLoading} />
					</label>
				{/if}
			</div>
			<div class="flex gap-3 pt-1">
				<button class="btn variant-ghost flex-1" on:click={() => statusPtica = null} disabled={statusLoading}>Odustani</button>
				<button class="btn variant-filled-primary flex-1" on:click={sacuvajStatus} disabled={statusLoading}>
					{#if statusLoading}<span class="animate-spin mr-1">↻</span>{/if}
					Spremi
				</button>
			</div>
		</div>
	</div>
{/if}