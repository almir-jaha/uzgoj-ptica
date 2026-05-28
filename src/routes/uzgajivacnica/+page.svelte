<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';

	import { user } from '$lib/stores/auth';
	import { postavke, loadPostavke, savePostavke } from '$lib/stores/postavke';
	import { ptice, loadPtice } from '$lib/stores/ptice';
	import { aktivnaSezona, loadSezone } from '$lib/stores/sezona';
	import SlikaUnos from '$lib/components/SlikaUnos.svelte';
	import { t } from '$lib/i18n';

	let editMode = false;
	let saving = false;
	let input = { naziv_uzgajivacnice: '', ime_prezime: '', adresa: '', telefon: '', prsten_prefiks: '', app_url: '' };
	let slikaUrl: string | undefined;
	let slikaKomponenta: SlikaUnos;

	onMount(async () => {
		const currentUser = get(user);
		if (!currentUser) return;
		await Promise.all([
			loadPostavke(currentUser.id),
			loadPtice(currentUser.id),
			loadSezone(currentUser.id)
		]);
	});

	function otvoriEdit() {
		input = {
			naziv_uzgajivacnice: $postavke?.naziv_uzgajivacnice ?? '',
			ime_prezime: $postavke?.ime_prezime ?? '',
			adresa: $postavke?.adresa ?? '',
			telefon: $postavke?.telefon ?? '',
			prsten_prefiks: $postavke?.prsten_prefiks ?? '',
			app_url: $postavke?.app_url ?? ''
		};
		slikaUrl = $postavke?.slika_url;
		editMode = true;
	}

	async function sacuvaj() {
		const currentUser = get(user);
		if (!currentUser) return;
		saving = true;
		const finalSlikaUrl = slikaKomponenta ? await slikaKomponenta.saveImage() : slikaUrl;
		await savePostavke(currentUser.id, {
			...input,
			prsten_prefiks: input.prsten_prefiks.trim(),
			app_url: input.app_url.trim(),
			slika_url: finalSlikaUrl
		});
		saving = false;
		editMode = false;
	}
</script>

<svelte:head>
	<title>{t.uzgajivacnica.pageTitle}</title>
</svelte:head>

<div class="container mx-auto p-4 space-y-5 max-w-lg">

	<div class="flex items-center justify-between">
		<h2 class="h3 font-bold">{t.uzgajivacnica.title}</h2>
		{#if !editMode}
			<button class="btn btn-sm variant-ghost" on:click={otvoriEdit}>
				✏️ {t.common.uredi}
			</button>
		{/if}
	</div>

	{#if !editMode}
		<!-- Prikaz profila -->
		<div class="card p-5 space-y-4">
			<div class="flex items-center gap-4">
				{#if $postavke?.slika_url}
					<img
						src={$postavke.slika_url}
						alt="Logo uzgajivačnice"
						class="w-24 h-24 rounded-xl object-cover shrink-0 border border-surface-300-600-token"
					/>
				{:else}
					<div class="w-24 h-24 rounded-xl bg-surface-200-700-token flex items-center justify-center text-4xl shrink-0">
						🏡
					</div>
				{/if}
				<div class="space-y-1 min-w-0">
					{#if $postavke?.naziv_uzgajivacnice}
						<h3 class="h4 font-bold truncate">{$postavke.naziv_uzgajivacnice}</h3>
					{:else}
						<h3 class="h4 font-bold text-surface-400">—</h3>
					{/if}
					{#if $postavke?.ime_prezime}
						<p class="text-sm text-surface-500">{$postavke.ime_prezime}</p>
					{/if}
				</div>
			</div>

			{#if $postavke?.adresa || $postavke?.telefon || $postavke?.prsten_prefiks}
				<div class="border-t border-surface-200-700-token pt-3 space-y-2 text-sm">
					{#if $postavke?.adresa}
						<div class="flex gap-3 items-start">
							<span class="text-surface-400 shrink-0">📍</span>
							<span>{$postavke.adresa}</span>
						</div>
					{/if}
					{#if $postavke?.telefon}
						<div class="flex gap-3 items-center">
							<span class="text-surface-400 shrink-0">📞</span>
							<span>{$postavke.telefon}</span>
						</div>
					{/if}
					{#if $postavke?.prsten_prefiks}
						<div class="flex gap-3 items-center">
							<span class="text-surface-400 shrink-0">🔖</span>
							<span>{t.ptice.prsten_prefiks}: <span class="font-mono">{$postavke.prsten_prefiks}</span></span>
						</div>
					{/if}
					{#if $postavke?.app_url}
						<div class="flex gap-3 items-center">
							<span class="text-surface-400 shrink-0">🔗</span>
							<span class="text-sm font-mono truncate">{$postavke.app_url}</span>
						</div>
					{/if}
				</div>
			{:else if !$postavke?.naziv_uzgajivacnice && !$postavke?.ime_prezime}
				<p class="text-sm text-surface-400 text-center py-2">{t.uzgajivacnica.nemaPoDataka}</p>
			{/if}
		</div>

		<!-- Statistike -->
		<div class="grid grid-cols-2 gap-3">
			<div class="card p-4 text-center space-y-1">
				<p class="text-3xl font-bold text-primary-500">{$ptice.length}</p>
				<p class="text-xs text-surface-500">{t.uzgajivacnica.ukupnoPtica}</p>
			</div>
			<div class="card p-4 text-center space-y-1">
				<p class="text-3xl font-bold text-success-500">{$aktivnaSezona?.godina ?? '—'}</p>
				<p class="text-xs text-surface-500">{t.uzgajivacnica.aktivnaSezona}</p>
			</div>
		</div>

	{:else}
		<!-- Edit forma -->
		<div class="card p-5 space-y-4">
			<SlikaUnos
				bind:this={slikaKomponenta}
				bind:slika_url={slikaUrl}
				bucket="uzgajivaci"
				userId={$user?.id ?? ''}
				disabled={saving}
				label={t.uzgajivac.slika}
			/>

			<div class="space-y-3">
				<label class="label">
					<span class="text-sm font-medium">{t.uzgajivac.naziv}</span>
					<input
						class="input"
						type="text"
						bind:value={input.naziv_uzgajivacnice}
						placeholder={t.uzgajivac.nazivPlaceholder}
						disabled={saving}
					/>
				</label>
				<label class="label">
					<span class="text-sm font-medium">{t.uzgajivac.imePrezime}</span>
					<input
						class="input"
						type="text"
						bind:value={input.ime_prezime}
						placeholder={t.uzgajivac.imePrezimePlaceholder}
						disabled={saving}
					/>
				</label>
				<label class="label">
					<span class="text-sm font-medium">{t.uzgajivac.adresa}</span>
					<input
						class="input"
						type="text"
						bind:value={input.adresa}
						placeholder={t.uzgajivac.adresaPlaceholder}
						disabled={saving}
					/>
				</label>
				<label class="label">
					<span class="text-sm font-medium">{t.uzgajivac.telefon}</span>
					<input
						class="input"
						type="tel"
						bind:value={input.telefon}
						placeholder={t.uzgajivac.telefonPlaceholder}
						disabled={saving}
					/>
				</label>
				<label class="label">
					<span class="text-sm font-medium">{t.ptice.prsten_prefiks}</span>
					<input
						class="input"
						type="text"
						bind:value={input.prsten_prefiks}
						placeholder={t.ptice.prsten_prefiksPlaceholder}
						disabled={saving}
					/>
					<span class="text-xs text-surface-400">{t.ptice.prsten_prefiksOpis}</span>
				</label>
				<label class="label">
					<span class="text-sm font-medium">{t.uzgajivac.appUrl}</span>
					<input
						class="input font-mono text-sm"
						type="url"
						bind:value={input.app_url}
						placeholder={t.uzgajivac.appUrlPlaceholder}
						disabled={saving}
					/>
					<span class="text-xs text-surface-400">{t.uzgajivac.appUrlOpis}</span>
				</label>
			</div>

			<div class="flex gap-3 pt-1">
				<button class="btn variant-ghost flex-1" on:click={() => (editMode = false)} disabled={saving}>
					{t.common.odustani}
				</button>
				<button class="btn variant-filled-primary flex-1" on:click={sacuvaj} disabled={saving}>
					{#if saving}<span class="animate-spin mr-2">↻</span>{/if}
					{t.uzgajivac.sacuvaj}
				</button>
			</div>
		</div>
	{/if}
</div>
