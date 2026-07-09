<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { getCurrentPhase, getDaysUntilNextPhase } from '$lib/stores/ciklus';
	import type { KavezWithDetails, FazaCiklusa, Ptica } from '$lib/db/schema';
	import { t } from '$lib/i18n';
	import { locale } from '$lib/i18n/locale';

	export let details: KavezWithDetails;
	export let faze: FazaCiklusa[] = [];
	export let svePtice: Ptica[] = [];
	export let readonly = false;

	const dispatch = createEventDispatcher<{ kliknut: void }>();

	$: fazeZaVrstu = details.aktivni_ciklus
		? faze
				.filter((f) => f.vrsta_ptica_id === details.aktivni_ciklus!.vrsta_ptica_id)
				.sort((a, b) => a.redoslijed - b.redoslijed)
		: [];

	$: trenutnaFaza = details.aktivni_ciklus ? getCurrentPhase(details.aktivni_ciklus, faze) : undefined;
	$: daniDo = details.aktivni_ciklus ? getDaysUntilNextPhase(details.aktivni_ciklus, faze) : null;

	$: todayStr = new Date().toISOString().split('T')[0];
	$: fazaNaziv = trenutnaFaza
		? (trenutnaFaza.nazivi_jezicima?.[$locale] ?? trenutnaFaza.naziv)
		: '';
	$: isAlarm =
		details.status === 'alarm' ||
		(details.sledeca_aktivnost
			? details.sledeca_aktivnost.potreban_datum <= todayStr
			: false);

	$: ptica1Label =
		details.aktivni_ciklus?.par?.ptica1?.naziv ||
		details.aktivni_ciklus?.par?.ptica1?.prstena_oznaka ||
		'?';
	$: ptica2Label =
		details.aktivni_ciklus?.par?.ptica2?.naziv ||
		details.aktivni_ciklus?.par?.ptica2?.prstena_oznaka ||
		'?';

	$: ptica1Id = details.aktivni_ciklus?.par?.ptica1?.id;
	$: ptica2Id = details.aktivni_ciklus?.par?.ptica2?.id;
	// Mladi samo iz TEKUĆEG ciklusa — filter po created_at ciklusa
	$: ciklusKreiranAt = details.aktivni_ciklus?.created_at ?? '';
	$: mladiCount = svePtice.filter(
		(p) =>
			p.id !== ptica1Id &&
			p.id !== ptica2Id &&
			(!ciklusKreiranAt || p.created_at >= ciklusKreiranAt) &&
			((p.otac_id === ptica1Id && p.majka_id === ptica2Id) ||
				(p.otac_id === ptica2Id && p.majka_id === ptica1Id) ||
				(p.otac_id === ptica1Id && !ptica2Id) ||
				(p.otac_id === ptica2Id && !ptica1Id))
	).length;

	$: imaPaznju = !!(details.aktivni_ciklus?.napomena_paznje);

	// Boja bordera: alarm > pažnja > boja faze > siva (prazan)
	$: borderColor = isAlarm
		? '#ef4444'
		: imaPaznju
			? '#f97316'
			: trenutnaFaza?.boja ?? (details.status === 'aktivan' ? '#22c55e' : '#64748b');

	function formatDatum(datum: string): string {
		return new Date(datum).toLocaleDateString('hr-BA', { day: '2-digit', month: '2-digit' });
	}

	// Crni tekst za svjetle boje, bijeli za tamne
	function chipTextColor(hex: string): string {
		const r = parseInt(hex.slice(1, 3), 16) / 255;
		const g = parseInt(hex.slice(3, 5), 16) / 255;
		const b = parseInt(hex.slice(5, 7), 16) / 255;
		return 0.299 * r + 0.587 * g + 0.114 * b > 0.55 ? '#000000' : '#ffffff';
	}
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
	class="card p-3 flex flex-col gap-2 border-l-4 min-h-[160px] {readonly ? '' : 'cursor-pointer hover:brightness-95 active:scale-[0.98] transition-transform'}"
	style="border-left-color: {borderColor}"
	role={readonly ? undefined : 'button'}
	tabindex={readonly ? undefined : 0}
	on:click={() => !readonly && dispatch('kliknut')}
>
	<!-- Header -->
	<div class="flex items-start justify-between gap-1">
		<span class="font-bold text-lg leading-none">K{details.oznaka}</span>
		<div class="flex gap-1 items-center">
			{#if imaPaznju}
				<span class="badge text-xs px-1 py-0.5 leading-none" style="background:#f97316;color:#fff" title={details.aktivni_ciklus?.napomena_paznje}>⚠</span>
			{/if}
			{#if isAlarm && details.status !== 'prazan'}
				<span class="badge variant-filled-error text-xs px-1 py-0.5 leading-none">!</span>
			{:else if details.status === 'aktivan'}
				<span class="badge variant-filled-success text-xs px-1 py-0.5 leading-none">✓</span>
			{/if}
		</div>
	</div>

	{#if details.status === 'prazan'}
		<div class="flex-1 flex items-center justify-center">
			<p class="text-surface-400 text-xs text-center">{$t.kavezi.prazan}</p>
		</div>
		{#if !readonly}
			<p class="text-xs text-surface-400 text-center mt-auto">↑ {$t.kavezi.pokreniCiklus}</p>
		{/if}
	{:else}
		<!-- Par + broj mladih -->
		<div class="flex items-center gap-1 min-w-0">
			<p class="text-xs font-medium truncate text-surface-700-200-token flex-1">
				{ptica1Label} / {ptica2Label}
			</p>
			{#if mladiCount > 0}
				<span class="text-xs shrink-0 font-semibold text-surface-500">🐣{mladiCount}</span>
			{/if}
		</div>

		<!-- Napomena pažnje -->
		{#if imaPaznju}
			<p class="text-xs font-medium truncate" style="color:#f97316">
				⚠ {details.aktivni_ciklus?.napomena_paznje}
			</p>
		{/if}

		<!-- Traka faza -->
		{#if fazeZaVrstu.length > 0}
			<div class="flex gap-0.5 rounded overflow-hidden" title={fazaNaziv}>
				{#each fazeZaVrstu as faza (faza.id)}
					<div
						class="h-2 flex-1 transition-opacity"
						style="background-color: {faza.boja}; opacity: {faza.id === trenutnaFaza?.id ? 1 : 0.3};"
					></div>
				{/each}
			</div>
		{/if}

		<!-- Trenutna faza + dani -->
		{#if !details.aktivni_ciklus?.datum_prvog_jajeta}
			<p class="text-xs font-medium" style="color:#6366f1">{$t.kavezi.cekaDatumPrvogJajeta}</p>
		{:else if trenutnaFaza}
			<div class="flex items-center justify-between gap-1">
				<span
					class="text-xs font-semibold px-1.5 py-0.5 rounded truncate leading-tight"
					style="background-color: {trenutnaFaza.boja}; color: {chipTextColor(trenutnaFaza.boja)}"
				>
					{fazaNaziv}
				</span>
				{#if daniDo !== null}
					<span
						class="text-xs badge {daniDo <= 1
							? 'variant-filled-error'
							: daniDo <= 3
								? 'variant-filled-warning'
								: 'variant-soft'} shrink-0"
					>
						{daniDo === 0 ? $t.kavezi.danas : daniDo === 1 ? $t.kavezi.sutra : `${daniDo}d`}
					</span>
				{/if}
			</div>
		{:else if fazeZaVrstu.length === 0}
			<p class="text-xs text-warning-500">⚠ Faze nisu postavljene</p>
		{:else}
			<p class="text-xs text-surface-400">{$t.kavezi.sveRazePravrsene}</p>
		{/if}

		<!-- Datum sljedeće aktivnosti -->
		{#if details.sledeca_aktivnost}
			<p class="text-xs text-surface-500">
				📅 {formatDatum(details.sledeca_aktivnost.potreban_datum)}
			</p>
		{/if}
	{/if}
</div>
