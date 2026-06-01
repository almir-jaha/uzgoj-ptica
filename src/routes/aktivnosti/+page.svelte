<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import type { AktivnostCiklusa, Ciklus, FazaCiklusa, Kavez } from '$lib/db/schema';

	import { user } from '$lib/stores/auth';
	import { prikazanaSezona, kavezi, loadSezone, loadKavezi } from '$lib/stores/sezona';
	import { ciklusi, faze, loadCiklusi, loadFaze, updateAktivnost, clearAktivnostDatum } from '$lib/stores/ciklus';
	import { db } from '$lib/db/dexie';
	import { supabase } from '$lib/supabase/client';
	import { lokalnoSezone, lokalnoPodaci } from '$lib/utils/localLoad';
	import { t } from '$lib/i18n';
	import {
		getPermissionStatus,
		isPushSubscribed,
		subscribePush,
		unsubscribePush,
		syncSubscription
	} from '$lib/utils/notifications';

	interface DnevnikStavka {
		aktivnostId: string;
		kavez: Kavez | undefined;
		kavezOznaka: number;
		faza: FazaCiklusa | undefined;
		ciklus: Ciklus;
		jeDone: boolean;
	}

	let loading = true;
	let odabraniDatum = new Date().toISOString().split('T')[0];
	let dnevnik: DnevnikStavka[] = [];
	let checked = new Set<string>(); // aktivnostId-ovi koji su označeni

	async function toggleCheck(aktivnostId: string) {
		if (checked.has(aktivnostId)) {
			checked.delete(aktivnostId);
			checked = checked;
			await clearAktivnostDatum(aktivnostId).catch(console.error);
		} else {
			checked.add(aktivnostId);
			checked = checked;
			await updateAktivnost(aktivnostId, odabraniDatum, '').catch(console.error);
		}
	}

	// Notifikacije
	let notifPermission: 'unsupported' | 'denied' | 'granted' | 'default' = 'unsupported';
	let notifSubscribed = false;
	let notifLoading = false;
	let notifError = '';

	async function initNotifStatus() {
		notifPermission = getPermissionStatus();
		if (notifPermission === 'unsupported') return;
		notifSubscribed = await isPushSubscribed();
		if (notifSubscribed) {
			const currentUser = get(user);
			if (currentUser) await syncSubscription(currentUser.id);
		}
	}

	async function ukljuciNotifikacije() {
		const currentUser = get(user);
		if (!currentUser) return;
		notifLoading = true;
		notifError = '';
		const { ok, error } = await subscribePush(currentUser.id);
		notifLoading = false;
		if (ok) { notifSubscribed = true; notifPermission = 'granted'; }
		else if (error === 'permission_denied') { notifPermission = 'denied'; }
		else { notifError = error ?? t.notifikacije.greska; }
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

	async function ucitajDnevnik() {
		const aktivniIds = $ciklusi.filter((c) => c.status === 'aktivan').map((c) => c.id);
		if (aktivniIds.length === 0) { dnevnik = []; return; }

		// Povuci aktivnosti za odabrani dan iz Supabase
		const { data } = await supabase
			.from('aktivnosti_ciklusa')
			.select('*')
			.in('ciklus_id', aktivniIds)
			.eq('potreban_datum', odabraniDatum);

		const aktivnostiZaDan: AktivnostCiklusa[] = data ?? await db.aktivnosti_ciklusa
			.where('ciklus_id').anyOf(aktivniIds)
			.filter((a) => a.potreban_datum === odabraniDatum)
			.toArray();

		const stavke: DnevnikStavka[] = aktivnostiZaDan
			.map((a) => {
				const ciklus = $ciklusi.find((c) => c.id === a.ciklus_id);
				if (!ciklus) return null;
				const kavez = $kavezi.find((k) => k.id === ciklus.kavez_id);
				const faza = $faze.find((f) => f.id === a.faza_id);
				return {
					aktivnostId: a.id,
					kavez,
					kavezOznaka: kavez?.oznaka ?? 0,
					faza,
					ciklus,
					jeDone: !!a.datum
				};
			})
			.filter((s): s is DnevnikStavka => s !== null)
			.sort((a, b) => a.kavezOznaka - b.kavezOznaka);

		// Inicijalizuj checked iz baze (već označene aktivnosti)
		checked = new Set(stavke.filter((s) => s.jeDone).map((s) => s.aktivnostId));
		dnevnik = stavke;
	}

	function pomjeriDan(delta: number) {
		const d = new Date(odabraniDatum);
		d.setDate(d.getDate() + delta);
		odabraniDatum = d.toISOString().split('T')[0];
		checked = new Set(); // reset checkboxova pri promjeni dana
	}

	function formatDatumPrikaz(datum: string): string {
		const d = new Date(datum + 'T12:00:00');
		const today = new Date().toISOString().split('T')[0];
		const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
		const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
		if (datum === today) return 'Danas';
		if (datum === tomorrow) return 'Sutra';
		if (datum === yesterday) return 'Juče';
		return d.toLocaleDateString('hr-BA', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
	}

	$: odabraniDatum, $ciklusi.length && $faze.length && $kavezi.length && ucitajDnevnik();

	const today = new Date().toISOString().split('T')[0];
	$: jeToday = odabraniDatum === today;

	onMount(async () => {
		await initNotifStatus();

		const currentUser = get(user);
		if (!currentUser) return;

		await lokalnoSezone(currentUser.id);
		let sezona = get(prikazanaSezona);

		if (!sezona) {
			await loadSezone(currentUser.id);
			sezona = get(prikazanaSezona);
		}

		if (!sezona) { loading = false; return; }

		await lokalnoPodaci(sezona.id, currentUser.id);
		await ucitajDnevnik();
		loading = false;

		Promise.all([
			loadKavezi(sezona.id),
			loadCiklusi(sezona.id),
			loadFaze()
		]).then(() => ucitajDnevnik()).catch(console.error);
	});
</script>

<svelte:head>
	<title>{t.aktivnosti.pageTitle}</title>
</svelte:head>

<div class="container mx-auto p-4 space-y-4 max-w-2xl">

	<div class="flex items-center justify-between no-print">
		<h2 class="h3 font-bold">Dnevnik uzgoja</h2>
		{#if dnevnik.length > 0}
			<button class="btn btn-sm variant-ghost-surface" on:click={() => window.print()} title="Printaj listu">
				🖨️ Print
			</button>
		{/if}
	</div>
	<!-- Print header — vidljiv samo pri štampanju -->
	<div class="print-only hidden">
		<h1 class="text-xl font-bold">Dnevnik uzgoja</h1>
		<p class="text-sm capitalize">{formatDatumPrikaz(odabraniDatum)} — {odabraniDatum}</p>
		{#if $prikazanaSezona}<p class="text-sm text-gray-500">Sezona {$prikazanaSezona.godina}</p>{/if}
	</div>

	<!-- Notifikacije -->
	{#if notifPermission !== 'unsupported'}
		<div class="card p-3 flex items-center justify-between gap-3
			{notifSubscribed ? 'variant-soft-success' : 'variant-soft-surface'}">
			<div class="space-y-0.5">
				<p class="text-sm font-semibold">
					{notifSubscribed ? '🔔 ' + t.notifikacije.aktivna : '🔕 Push obavještenja'}
				</p>
				{#if notifPermission === 'denied'}
					<p class="text-xs text-warning-500">{t.notifikacije.odbijeno}</p>
				{:else if notifError}
					<p class="text-xs text-error-500">{notifError}</p>
				{:else if !notifSubscribed}
					<p class="text-xs text-surface-500">{t.notifikacije.bannerOpis}</p>
				{/if}
			</div>
			{#if notifPermission !== 'denied'}
				{#if notifSubscribed}
					<button class="btn btn-sm variant-ghost-error shrink-0" on:click={iskljuciNotifikacije} disabled={notifLoading}>
						{#if notifLoading}<span class="animate-spin mr-1">↻</span>{/if}
						{t.notifikacije.iskljuci}
					</button>
				{:else}
					<button class="btn btn-sm variant-filled-primary shrink-0" on:click={ukljuciNotifikacije} disabled={notifLoading}>
						{#if notifLoading}<span class="animate-spin mr-1">↻</span>{/if}
						{t.notifikacije.ukljuci}
					</button>
				{/if}
			{/if}
		</div>
	{/if}

	<!-- Navigator datuma -->
	<div class="flex items-center gap-2">
		<button class="btn btn-sm variant-ghost-surface px-3" on:click={() => pomjeriDan(-1)}>‹</button>
		<div class="flex-1 text-center">
			<p class="font-bold text-base capitalize">{formatDatumPrikaz(odabraniDatum)}</p>
			<p class="text-xs text-surface-400">{odabraniDatum}</p>
		</div>
		<button class="btn btn-sm variant-ghost-surface px-3" on:click={() => pomjeriDan(1)}>›</button>
		{#if !jeToday}
			<button class="btn btn-sm variant-soft-primary" on:click={() => odabraniDatum = today}>
				Danas
			</button>
		{/if}
	</div>

	{#if loading}
		<div class="space-y-2">
			{#each Array(4) as _}
				<div class="card p-4 h-14 animate-pulse bg-surface-200-700-token"></div>
			{/each}
		</div>

	{:else if !$prikazanaSezona}
		<div class="flex flex-col items-center justify-center py-16 space-y-3">
			<span class="text-5xl">📅</span>
			<p class="h4 text-center">{t.aktivnosti.nemaSezone}</p>
			<a class="btn variant-filled-primary" href="/sezone">{t.aktivnosti.iditeNaKaveze}</a>
		</div>

	{:else if $ciklusi.filter((c) => c.status === 'aktivan').length === 0}
		<div class="flex flex-col items-center justify-center py-16 space-y-3">
			<span class="text-5xl">🪺</span>
			<p class="h4 text-center">{t.aktivnosti.nemaAktivnihCiklusa}</p>
			<a class="btn variant-filled-primary" href="/sezone">{t.aktivnosti.iditeNaKaveze}</a>
		</div>

	{:else if dnevnik.length === 0}
		<div class="flex flex-col items-center justify-center py-16 space-y-2">
			<span class="text-5xl">✅</span>
			<p class="font-semibold text-surface-500">Nema aktivnosti za ovaj dan</p>
		</div>

	{:else}
		<p class="text-xs text-surface-400 px-1">{dnevnik.length} {dnevnik.length === 1 ? 'kavez zahtijeva pažnju' : 'kaveza zahtijevaju pažnju'}</p>

		<div class="space-y-2">
			{#each dnevnik as s (s.aktivnostId)}
				{@const jeChecked = checked.has(s.aktivnostId)}
				<div class="card p-4 flex items-center gap-4 transition-opacity {jeChecked ? 'opacity-40' : ''}">
					<!-- Broj kaveza -->
					<div class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 font-bold text-lg
						{s.faza?.boja ? '' : 'bg-surface-200-700-token'}"
						style={s.faza?.boja ? `background-color: ${s.faza.boja}22; color: ${s.faza.boja}` : ''}
					>
						{s.kavezOznaka}
					</div>

					<!-- Info -->
					<div class="flex-1 min-w-0">
						<p class="font-semibold text-sm {jeChecked ? 'line-through' : ''}">Kavez {s.kavezOznaka}</p>
						<p class="text-sm {jeChecked ? 'line-through' : ''}" style={s.faza?.boja ? `color: ${s.faza.boja}` : ''}>
							{s.faza?.naziv ?? '—'}
						</p>
					</div>

					<!-- Checkbox — skriven pri printu -->
					<button
						class="no-print w-8 h-8 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors
							{jeChecked ? 'bg-success-500 border-success-500 text-white' : 'border-surface-300-600-token text-transparent hover:border-success-400'}"
						on:click={() => toggleCheck(s.aktivnostId)}
						title={jeChecked ? 'Označeno kao završeno' : 'Označi kao završeno'}
					>
						✓
					</button>

					<!-- Print checkbox — vidljiv samo pri štampanju -->
					<div class="print-only hidden w-5 h-5 border-2 border-gray-400 rounded shrink-0"></div>
				</div>
			{/each}
		</div>
	{/if}

</div>

<style>
	@media print {
		:global(nav), :global(header), :global(.no-print) { display: none !important; }
		:global(.print-only) { display: block !important; }
		:global(body), :global(.card) { background: white !important; color: black !important; box-shadow: none !important; }
		:global(.card) { border: 1px solid #ddd !important; border-radius: 4px !important; break-inside: avoid; }
		:global(.opacity-40) { opacity: 1 !important; }
		:global(.line-through) { text-decoration: none !important; }
	}
</style>
