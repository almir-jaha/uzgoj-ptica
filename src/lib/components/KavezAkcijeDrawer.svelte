<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { fly } from 'svelte/transition';
	import { createPtica } from '$lib/stores/ptice';
	import type { KavezWithDetails, FazaCiklusa, Ptica } from '$lib/db/schema';
	import { t } from '$lib/i18n';

	export let details: KavezWithDetails;
	export let faze: FazaCiklusa[] = [];
	export let svePtice: Ptica[] = [];
	export let prstenPrefiks = '';
	export let userId: string;

	type Pogled = 'akcije' | 'mladi' | 'unos';
	let pogled: Pogled = 'akcije';

	// Brzi unos — stanje forme
	let unosSpol: 'M' | 'Ž' | '?' = '?';
	let unosOznaka = prstenPrefiks;
	let unosRedniBroj: number | '' = '';
	let unosDatum = new Date().toISOString().split('T')[0];
	let unosLoading = false;
	let unosError = '';

	const dispatch = createEventDispatcher<{
		zatvori: void;
		pokreniCiklus: void;
		zavrsiCiklus: void;
		refresh: void;
	}>();

	// Roditelji iz aktivnog ciklusa
	$: par = details.aktivni_ciklus?.par;
	$: ptica1 = par?.ptica1;
	$: ptica2 = par?.ptica2;
	$: otac = ptica1?.spol === 'M' ? ptica1 : (ptica2?.spol === 'M' ? ptica2 : ptica1);
	$: majka = ptica1?.spol === 'Ž' ? ptica1 : (ptica2?.spol === 'Ž' ? ptica2 : ptica2);

	// Mladi — ptice čiji su roditelji ovaj par
	$: ptica1Id = ptica1?.id;
	$: ptica2Id = ptica2?.id;
	$: mladi = svePtice.filter(
		(p) =>
			p.id !== ptica1Id &&
			p.id !== ptica2Id &&
			((p.otac_id === ptica1Id && p.majka_id === ptica2Id) ||
				(p.otac_id === ptica2Id && p.majka_id === ptica1Id) ||
				(p.otac_id === ptica1Id && !ptica2Id) ||
				(p.otac_id === ptica2Id && !ptica1Id))
	);

	function pticaLabel(p: Ptica | undefined): string {
		if (!p) return '?';
		return p.naziv || p.prstena_oznaka || p.id.slice(0, 8);
	}

	function spolSimbol(spol: string): string {
		return spol === 'M' ? '♂' : spol === 'Ž' ? '♀' : '?';
	}

	function otvoriUnos() {
		unosSpol = '?';
		unosOznaka = prstenPrefiks;
		unosRedniBroj = '';
		unosDatum = new Date().toISOString().split('T')[0];
		unosError = '';
		pogled = 'unos';
	}

	async function sacuvajMladu() {
		if (!details.aktivni_ciklus) return;
		unosLoading = true;
		unosError = '';
		try {
			await createPtica(userId, {
				user_id: userId,
				spol: unosSpol,
				vrsta_ptica_id: details.aktivni_ciklus.vrsta_ptica_id,
				prstena_oznaka: unosOznaka.trim() || undefined,
				prsten_redni_broj: unosRedniBroj !== '' ? Number(unosRedniBroj) : undefined,
				datum_rodjenja: unosDatum || undefined,
				otac_id: otac?.id,
				majka_id: majka?.id
			});
			dispatch('refresh');
			pogled = 'mladi';
		} catch (err) {
			unosError = err instanceof Error ? err.message : t.ptice.greska;
		} finally {
			unosLoading = false;
		}
	}
</script>

<!-- Overlay -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
	class="fixed inset-0 bg-black/50 z-40"
	role="presentation"
	on:click={() => dispatch('zatvori')}
></div>

<!-- Bottom sheet -->
<div
	class="fixed bottom-0 left-0 right-0 z-50 bg-surface-100-800-token rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col"
	transition:fly={{ y: 400, duration: 280 }}
>
	<!-- Handle -->
	<div class="flex justify-center pt-3 pb-1 shrink-0">
		<div class="w-10 h-1 rounded-full bg-surface-300-600-token"></div>
	</div>

	<!-- Header -->
	<div class="flex items-center justify-between px-4 py-2 shrink-0">
		<div class="flex items-center gap-2">
			{#if pogled !== 'akcije'}
				<button class="btn-icon btn-icon-sm variant-ghost" on:click={() => (pogled = 'akcije')}>
					←
				</button>
			{/if}
			<h3 class="font-bold text-lg">
				K{details.oznaka}
				{#if pogled === 'mladi'}· {t.kavezi.pregledMladih}
				{:else if pogled === 'unos'}· {t.kavezi.brziUnosMlade}
				{/if}
			</h3>
		</div>
		<button class="btn-icon btn-icon-sm variant-ghost" on:click={() => dispatch('zatvori')}>✕</button>
	</div>

	<!-- Sadržaj -->
	<div class="overflow-y-auto flex-1 px-4 pb-6">

		<!-- ── AKCIJE ── -->
		{#if pogled === 'akcije'}
			{#if details.aktivni_ciklus}
				<!-- Info o paru -->
				<div class="card variant-soft p-3 mb-4 space-y-1">
					<p class="text-xs text-surface-500">{t.kavezi.roditelji}</p>
					<p class="text-sm font-medium">
						{spolSimbol(ptica1?.spol ?? '?')} {pticaLabel(ptica1)}
						&nbsp;×&nbsp;
						{spolSimbol(ptica2?.spol ?? '?')} {pticaLabel(ptica2)}
					</p>
					{#if mladi.length > 0}
						<p class="text-xs text-surface-500">{mladi.length} {t.kavezi.ukupnoMladih}</p>
					{/if}
				</div>

				<!-- Akcije za aktivan ciklus -->
				<div class="space-y-2">
					<button
						class="btn variant-filled-primary w-full justify-start gap-3"
						on:click={otvoriUnos}
					>
						<span class="text-xl">🐣</span>
						<span>{t.kavezi.unosMladih}</span>
					</button>
					<button
						class="btn variant-soft w-full justify-start gap-3"
						on:click={() => (pogled = 'mladi')}
					>
						<span class="text-xl">🐦</span>
						<span>{t.kavezi.pregledMladih}
							{#if mladi.length > 0}
								<span class="badge variant-soft ml-1 text-xs">{mladi.length}</span>
							{/if}
						</span>
					</button>
					<div class="pt-2 border-t border-surface-300-600-token">
						<button
							class="btn variant-soft-error w-full justify-start gap-3"
							on:click={() => dispatch('zavrsiCiklus')}
						>
							<span class="text-xl">🏁</span>
							<span>{t.kavezi.zavrsiCiklus}</span>
						</button>
					</div>
				</div>
			{:else}
				<!-- Prazan kavez -->
				<div class="py-4 text-center text-surface-400 text-sm mb-4">
					{t.kavezi.prazan}
				</div>
				<button
					class="btn variant-filled-primary w-full justify-start gap-3"
					on:click={() => dispatch('pokreniCiklus')}
				>
					<span class="text-xl">▶</span>
					<span>{t.kavezi.pokreniCiklus}</span>
				</button>
			{/if}

		<!-- ── PREGLED MLADIH ── -->
		{:else if pogled === 'mladi'}
			{#if mladi.length === 0}
				<div class="py-8 text-center text-surface-400 text-sm">{t.kavezi.nemaMladih}</div>
			{:else}
				<div class="space-y-2 mt-2">
					{#each mladi as p (p.id)}
						<div class="card p-3 flex items-center gap-3">
							<span class="text-lg">{spolSimbol(p.spol)}</span>
							<div class="flex-1 min-w-0">
								<p class="text-sm font-medium truncate">
									{p.naziv || (p.prstena_oznaka ? `${p.prstena_oznaka}${p.prsten_redni_broj != null ? `-${p.prsten_redni_broj}` : ''}` : p.id.slice(0, 8))}
								</p>
								{#if p.datum_rodjenja}
									<p class="text-xs text-surface-500">
										🎂 {new Date(p.datum_rodjenja).toLocaleDateString('hr-BA', { day: '2-digit', month: '2-digit', year: 'numeric' })}
									</p>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
			<div class="mt-4">
				<button class="btn variant-filled-primary w-full" on:click={otvoriUnos}>
					🐣 {t.kavezi.unosMladih}
				</button>
			</div>

		<!-- ── UNOS MLADE PTICE ── -->
		{:else if pogled === 'unos'}
			<div class="space-y-4 mt-2">
				<!-- Roditelji (info, ne-editabilno) -->
				{#if otac || majka}
					<div class="card variant-soft p-3 text-xs space-y-0.5">
						<p class="text-surface-500">{t.kavezi.roditelji}</p>
						{#if otac}<p>♂ {pticaLabel(otac)}</p>{/if}
						{#if majka}<p>♀ {pticaLabel(majka)}</p>{/if}
					</div>
				{/if}

				<!-- Spol -->
				<fieldset>
					<legend class="text-sm font-medium mb-2">{t.ptice.spol}</legend>
					<div class="flex gap-2">
						{#each [['M', t.ptice.spolMuzjak], ['Ž', t.ptice.spolZenka], ['?', t.ptice.spolNepoznat]] as [val, label]}
							<label class="flex-1 btn btn-sm cursor-pointer {unosSpol === val ? 'variant-filled-primary' : 'variant-soft'}">
								<input type="radio" bind:group={unosSpol} value={val} class="sr-only" disabled={unosLoading} />
								{label}
							</label>
						{/each}
					</div>
				</fieldset>

				<!-- Prsten -->
				<div class="grid grid-cols-[1fr_auto] gap-3 items-end">
					<label class="label">
						<span class="text-sm font-medium">{t.ptice.prstenaOznaka}</span>
						<input class="input" type="text" bind:value={unosOznaka} placeholder={t.ptice.prstenaOznakaPlaceholder} disabled={unosLoading} />
					</label>
					<label class="label w-24">
						<span class="text-sm font-medium">{t.ptice.prstenRedniBroj}</span>
						<input class="input" type="number" min="1" bind:value={unosRedniBroj} placeholder="1" disabled={unosLoading} />
					</label>
				</div>

				<!-- Datum -->
				<label class="label">
					<span class="text-sm font-medium">{t.ptice.datumRodjenja}</span>
					<input class="input" type="date" bind:value={unosDatum} disabled={unosLoading} />
				</label>

				{#if unosError}
					<aside class="alert variant-filled-error py-2 px-3 text-sm"><p>{unosError}</p></aside>
				{/if}

				<div class="flex gap-3">
					<button class="btn variant-ghost flex-1" on:click={() => (pogled = 'akcije')} disabled={unosLoading}>
						{t.common.odustani}
					</button>
					<button class="btn variant-filled-primary flex-1" on:click={sacuvajMladu} disabled={unosLoading}>
						{#if unosLoading}<span class="animate-spin mr-2">↻</span>{/if}
						{t.ptice.dodajPticu}
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>
