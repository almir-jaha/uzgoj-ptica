<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import type { AktivnostCiklusa } from '$lib/db/schema';

	import { user } from '$lib/stores/auth';
	import { aktivnaSezona, kavezi, alarmKavezi, aktivniKavezi, loadSezone, loadKavezi } from '$lib/stores/sezona';
	import { parovi, loadParovi } from '$lib/stores/parovi';
	import { ciklusi, faze, loadCiklusi, loadFaze } from '$lib/stores/ciklus';
	import { ptice, pticeMuzjaci, pticeSenke, loadPtice } from '$lib/stores/ptice';
	import { db } from '$lib/db/dexie';
	import { lokalnoSezone, lokalnoPodaci } from '$lib/utils/localLoad';
	import { t } from '$lib/i18n';

	let loading = true;
	let sveAktivnosti: AktivnostCiklusa[] = [];

	onMount(async () => {
		const currentUser = get(user);
		if (!currentUser) return;

		// Brzo iz Dexie
		await lokalnoSezone(currentUser.id);
		const sezona = get(aktivnaSezona);
		if (sezona) await lokalnoPodaci(sezona.id, currentUser.id);

		// Background Supabase sync
		loadSezone(currentUser.id);
		if (sezona) {
			loadPtice(currentUser.id);
			loadFaze();
			loadKavezi(sezona.id);
			loadParovi(sezona.id);
			loadCiklusi(sezona.id);
		}

		// Aktivnosti za sve cikluse ove sezone
		if (sezona) {
			const ids = get(ciklusi).map((c) => c.id);
			if (ids.length) {
				sveAktivnosti = await db.aktivnosti_ciklusa.where('ciklus_id').anyOf(ids).toArray();
			}
		}

		loading = false;
	});

	// ─── Kavezi ───────────────────────────────────────────────
	$: kavezUkupno   = $kavezi.length;
	$: kavezAktivni  = $aktivniKavezi.length;
	$: kavezAlarmi   = $alarmKavezi.length;
	$: kavezPrazni   = $kavezi.filter((k) => k.status === 'prazan').length;

	// ─── Ciklusi ──────────────────────────────────────────────
	$: ciklusUkupno      = $ciklusi.length;
	$: ciklusAktivni     = $ciklusi.filter((c) => c.status === 'aktivan').length;
	$: ciklusZavrseni    = $ciklusi.filter((c) => c.status === 'završen').length;
	$: ciklusNeuspjesni  = $ciklusi.filter((c) => c.status === 'neuspješan').length;
	$: ukupnoJaja        = $ciklusi.reduce((s, c) => s + (c.broj_jaja ?? 0), 0);
	$: ukupnoIzlijeglo   = $ciklusi.reduce((s, c) => s + (c.broj_izlijegljenih ?? 0), 0);
	$: stopaIzlijeganja  = ukupnoJaja > 0 ? Math.round((ukupnoIzlijeglo / ukupnoJaja) * 100) : null;

	// ─── Parovi ───────────────────────────────────────────────
	$: paroviAktivni  = $parovi.filter((p) => p.status === 'aktivan').length;
	$: paroviZavrseni = $parovi.filter((p) => p.status === 'završen').length;
	$: paroviRazdv    = $parovi.filter((p) => p.status === 'razdvojen').length;

	// ─── Ptice ────────────────────────────────────────────────
	$: pticaUkupno   = $ptice.length;
	$: pticaMuzjaci  = $pticeMuzjaci.length;
	$: pticaZenke    = $pticeSenke.length;
	$: pticaNepozn   = $ptice.filter((p) => p.spol === '?').length;

	// Top vrste ptica po broju jedinki
	$: topVrste = (() => {
		const brojaci: Record<string, number> = {};
		for (const p of $ptice) {
			brojaci[p.vrsta_ptica_id] = (brojaci[p.vrsta_ptica_id] ?? 0) + 1;
		}
		return Object.entries(brojaci)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 4);
	})();

	$: fazeMap = Object.fromEntries($faze.map((f) => [f.id, f]));

	// Naziv vrste iz faza (grupisani su po vrsta_ptica_id na fazama)
	// Koristimo nazive iz $faze indirektno — vrsta_ptica nije u storu
	// Fallback: skraćeni UUID
	function vrstaLabel(vrstaId: string): string {
		const fazaZaVrstu = $faze.find((f) => f.vrsta_ptica_id === vrstaId);
		return fazaZaVrstu ? `Vrsta ${vrstaId.slice(0, 6)}` : vrstaId.slice(0, 8);
	}

	// ─── Aktivnosti ───────────────────────────────────────────
	$: aktUkupno    = sveAktivnosti.length;
	$: aktObavl     = sveAktivnosti.filter((a) => !!a.datum).length;
	$: aktCekanje   = aktUkupno - aktObavl;
	$: aktZakasn    = sveAktivnosti.filter(
		(a) => !a.datum && a.potreban_datum < new Date().toISOString().split('T')[0]
	).length;
	$: stopaAktivnosti = aktUkupno > 0 ? Math.round((aktObavl / aktUkupno) * 100) : 0;

	// ─── Faze distribucija aktivnih ciklusa ───────────────────
	$: fazaDistrib = (() => {
		const mapa: Record<string, number> = {};
		for (const c of $ciklusi.filter((c) => c.status === 'aktivan')) {
			const faza = $faze
				.filter((f) => f.vrsta_ptica_id === c.vrsta_ptica_id)
				.sort((a, b) => a.redoslijed - b.redoslijed)
				.find((f) => {
					// Provjeri je li ciklus još u ovoj fazi
					const start = new Date(c.datum_prvog_jajeta);
					const danas = new Date();
					const diff = Math.floor((danas.getTime() - start.getTime()) / 86400000);
					return diff < f.redoslijed * (f.broj_dana || 1);
				});
			const kljuc = faza?.naziv ?? 'Nepoznato';
			mapa[kljuc] = (mapa[kljuc] ?? 0) + 1;
		}
		return Object.entries(mapa).sort((a, b) => b[1] - a[1]);
	})();
</script>

<svelte:head>
	<title>{t.statistike.pageTitle}</title>
</svelte:head>

<div class="container mx-auto p-4 space-y-6 max-w-3xl">

	<!-- Header -->
	<div>
		<h2 class="h3 font-bold">{t.statistike.title}</h2>
		{#if $aktivnaSezona}
			<p class="text-sm text-surface-500">
				{t.common.sezona} {$aktivnaSezona.godina}
				{#if $aktivnaSezona.naziv && $aktivnaSezona.naziv !== `Sezona ${$aktivnaSezona.godina}`}
					— {$aktivnaSezona.naziv}
				{/if}
			</p>
		{/if}
	</div>

	{#if loading}
		<div class="grid grid-cols-2 md:grid-cols-3 gap-3">
			{#each Array(6) as _}
				<div class="card p-4 h-28 animate-pulse bg-surface-200-700-token"></div>
			{/each}
		</div>

	{:else if !$aktivnaSezona}
		<div class="flex flex-col items-center justify-center py-16 space-y-3">
			<span class="text-5xl">📊</span>
			<p class="h4 text-center">{t.statistike.nemaSezone}</p>
			<a class="btn variant-filled-primary" href="/kavezi">{t.statistike.iditeNaKaveze}</a>
		</div>

	{:else}

		<!-- ── Red 1: Kavezi + Ciklusi ── -->
		<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">

			<!-- Kavezi -->
			<div class="card p-5 space-y-3">
				<h3 class="font-semibold text-sm text-surface-500 uppercase tracking-wide">{t.statistike.kavezi}</h3>
				<p class="text-4xl font-bold">{kavezUkupno}</p>
				<div class="space-y-1.5 text-sm">
					<div class="flex justify-between">
						<span class="text-surface-500">{t.statistike.kavezAktivni}</span>
						<span class="font-semibold text-success-600">{kavezAktivni}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-surface-500">{t.statistike.kavezPrazni}</span>
						<span class="font-semibold">{kavezPrazni}</span>
					</div>
					{#if kavezAlarmi > 0}
						<div class="flex justify-between">
							<span class="text-surface-500">{t.statistike.kavezAlarm}</span>
							<span class="font-semibold text-error-500">⚠ {kavezAlarmi}</span>
						</div>
					{/if}
				</div>
			</div>

			<!-- Ciklusi / Legla -->
			<div class="card p-5 space-y-3">
				<h3 class="font-semibold text-sm text-surface-500 uppercase tracking-wide">{t.statistike.legla}</h3>
				<p class="text-4xl font-bold">{ciklusUkupno}</p>
				<div class="space-y-1.5 text-sm">
					<div class="flex justify-between">
						<span class="text-surface-500">{t.statistike.ciklusAktivna}</span>
						<span class="font-semibold text-success-600">{ciklusAktivni}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-surface-500">{t.statistike.ciklusZavrsena}</span>
						<span class="font-semibold">{ciklusZavrseni}</span>
					</div>
					{#if ciklusNeuspjesni > 0}
						<div class="flex justify-between">
							<span class="text-surface-500">{t.statistike.ciklusNeuspjesna}</span>
							<span class="font-semibold text-error-500">{ciklusNeuspjesni}</span>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- ── Jaja & stopa izlijeganja ── -->
		{#if ukupnoJaja > 0 || ciklusZavrseni > 0}
			<div class="card p-5 space-y-4">
				<h3 class="font-semibold text-sm text-surface-500 uppercase tracking-wide">{t.statistike.izlijeganje}</h3>
				<div class="grid grid-cols-3 gap-4 text-center">
					<div>
						<p class="text-3xl font-bold">{ukupnoJaja}</p>
						<p class="text-xs text-surface-500 mt-1">{t.statistike.jajaUkupno}</p>
					</div>
					<div>
						<p class="text-3xl font-bold text-success-600">{ukupnoIzlijeglo}</p>
						<p class="text-xs text-surface-500 mt-1">{t.statistike.izlijegljenih}</p>
					</div>
					<div>
						<p class="text-3xl font-bold {stopaIzlijeganja !== null && stopaIzlijeganja >= 70 ? 'text-success-600' : stopaIzlijeganja !== null && stopaIzlijeganja < 50 ? 'text-error-500' : 'text-warning-600'}">
							{stopaIzlijeganja !== null ? `${stopaIzlijeganja}%` : '—'}
						</p>
						<p class="text-xs text-surface-500 mt-1">{t.statistike.stopa}</p>
					</div>
				</div>
				{#if stopaIzlijeganja !== null}
					<div class="w-full bg-surface-200-700-token rounded-full h-2">
						<div
							class="h-2 rounded-full transition-all {stopaIzlijeganja >= 70 ? 'bg-success-500' : stopaIzlijeganja >= 50 ? 'bg-warning-500' : 'bg-error-500'}"
							style="width: {stopaIzlijeganja}%"
						></div>
					</div>
				{/if}
			</div>
		{/if}

		<!-- ── Red 2: Parovi + Ptice ── -->
		<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">

			<!-- Parovi -->
			<div class="card p-5 space-y-3">
				<h3 class="font-semibold text-sm text-surface-500 uppercase tracking-wide">{t.statistike.parovi}</h3>
				<p class="text-4xl font-bold">{$parovi.length}</p>
				<div class="space-y-1.5 text-sm">
					<div class="flex justify-between">
						<span class="text-surface-500">{t.statistike.paroviAktivni}</span>
						<span class="font-semibold text-success-600">{paroviAktivni}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-surface-500">{t.statistike.paroviZavrseni}</span>
						<span class="font-semibold">{paroviZavrseni}</span>
					</div>
					{#if paroviRazdv > 0}
						<div class="flex justify-between">
							<span class="text-surface-500">{t.statistike.paroviRazdvojeni}</span>
							<span class="font-semibold text-warning-600">{paroviRazdv}</span>
						</div>
					{/if}
				</div>
			</div>

			<!-- Ptice -->
			<div class="card p-5 space-y-3">
				<h3 class="font-semibold text-sm text-surface-500 uppercase tracking-wide">{t.statistike.ptice}</h3>
				<p class="text-4xl font-bold">{pticaUkupno}</p>
				<div class="space-y-1.5 text-sm">
					<div class="flex justify-between">
						<span class="text-surface-500">{t.statistike.pticeMuzjaci}</span>
						<span class="font-semibold text-primary-600">{pticaMuzjaci}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-surface-500">{t.statistike.pticeZenke}</span>
						<span class="font-semibold text-tertiary-600">{pticaZenke}</span>
					</div>
					{#if pticaNepozn > 0}
						<div class="flex justify-between">
							<span class="text-surface-500">{t.statistike.pticeNepoznato}</span>
							<span class="font-semibold">{pticaNepozn}</span>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- ── Aktivnosti ── -->
		{#if aktUkupno > 0}
			<div class="card p-5 space-y-4">
				<div class="flex items-center justify-between">
					<h3 class="font-semibold text-sm text-surface-500 uppercase tracking-wide">{t.statistike.aktivnosti}</h3>
					{#if aktZakasn > 0}
						<span class="badge variant-filled-error text-xs">⚠ {aktZakasn} {t.statistike.aktZakasnilo}</span>
					{/if}
				</div>
				<div class="grid grid-cols-3 gap-4 text-center">
					<div>
						<p class="text-3xl font-bold">{aktUkupno}</p>
						<p class="text-xs text-surface-500 mt-1">{t.statistike.aktUkupno}</p>
					</div>
					<div>
						<p class="text-3xl font-bold text-success-600">{aktObavl}</p>
						<p class="text-xs text-surface-500 mt-1">{t.statistike.aktObavljene}</p>
					</div>
					<div>
						<p class="text-3xl font-bold {aktCekanje > 0 ? 'text-warning-600' : 'text-success-600'}">{aktCekanje}</p>
						<p class="text-xs text-surface-500 mt-1">{t.statistike.aktNaCekanju}</p>
					</div>
				</div>
				<!-- Progress bar -->
				<div class="space-y-1">
					<div class="flex justify-between text-xs text-surface-500">
						<span>{t.statistike.napredakObavljanja}</span>
						<span>{stopaAktivnosti}%</span>
					</div>
					<div class="w-full bg-surface-200-700-token rounded-full h-2">
						<div
							class="h-2 rounded-full bg-success-500 transition-all"
							style="width: {stopaAktivnosti}%"
						></div>
					</div>
				</div>
			</div>
		{/if}

		<!-- ── Aktivne faze (distribucija) ── -->
		{#if ciklusAktivni > 0 && fazaDistrib.length > 0}
			<div class="card p-5 space-y-3">
				<h3 class="font-semibold text-sm text-surface-500 uppercase tracking-wide">
					{t.statistike.aktivnaLeglaPoFazi}
				</h3>
				<div class="space-y-2">
					{#each fazaDistrib as [naziv, broj]}
						{@const faza = $faze.find((f) => f.naziv === naziv)}
						<div class="space-y-1">
							<div class="flex justify-between text-sm">
								<span class="font-medium" style={faza ? `color: ${faza.boja}` : ''}>{naziv}</span>
								<span class="text-surface-500">{broj} {broj !== 1 ? t.statistike.legloSufiksPlural : t.statistike.legloSufiks}</span>
							</div>
							<div class="w-full bg-surface-200-700-token rounded-full h-1.5">
								<div
									class="h-1.5 rounded-full"
									style="width: {Math.round((broj / ciklusAktivni) * 100)}%; background-color: {faza?.boja ?? '#94a3b8'}"
								></div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- ── Datum početka sezone ── -->
		<p class="text-xs text-surface-400 text-center pb-2">
			{t.sezona.aktivnaOd} {new Date($aktivnaSezona.datum_pocetka).toLocaleDateString('hr-BA', { day: '2-digit', month: 'long', year: 'numeric' })}
		</p>

	{/if}
</div>
