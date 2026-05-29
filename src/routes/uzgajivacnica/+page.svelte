<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';

	import { user } from '$lib/stores/auth';
	import { ptice, filtriranePtice, loadPtice } from '$lib/stores/ptice';
	import { aktivnaSezona, loadSezone } from '$lib/stores/sezona';
	import {
		uzgajivacnice,
		aktivnaUzgajivacnica,
		loadUzgajivacnice,
		setAktivnaUzgajivacnica,
		createUzgajivacnica,
		updateUzgajivacnica
	} from '$lib/stores/uzgajivacnica';
	import { isAdmin } from '$lib/stores/admin';
	import { tierLimits, jeNaLimitUzgajivacnica } from '$lib/stores/userTier';
	import SlikaUnos from '$lib/components/SlikaUnos.svelte';
	import { t } from '$lib/i18n';

	let editId: string | null = null; // ID uzgajivačnice koja se uređuje (null = nova)
	let showForm = false;

	$: limitDostignut = jeNaLimitUzgajivacnica($uzgajivacnice.length, $tierLimits);
	$: jeAdminUser = isAdmin($user?.email);
	let saving = false;
	let input = { naziv: '', ime_prezime: '', adresa: '', telefon: '', prsten_prefiks: '', app_url: '' };
	let slikaUrl: string | undefined;
	let slikaKomponenta: SlikaUnos;

	onMount(async () => {
		const currentUser = get(user);
		if (!currentUser) return;
		await Promise.all([
			loadUzgajivacnice(currentUser.id),
			loadPtice(currentUser.id),
			loadSezone(currentUser.id)
		]);
	});

	function otvoriNova() {
		editId = null;
		input = { naziv: '', ime_prezime: '', adresa: '', telefon: '', prsten_prefiks: '', app_url: '' };
		slikaUrl = undefined;
		showForm = true;
	}

	function otvoriEdit(uz: typeof $uzgajivacnice[0]) {
		editId = uz.id;
		input = {
			naziv: uz.naziv ?? '',
			ime_prezime: uz.ime_prezime ?? '',
			adresa: uz.adresa ?? '',
			telefon: uz.telefon ?? '',
			prsten_prefiks: uz.prsten_prefiks ?? '',
			app_url: uz.app_url ?? ''
		};
		slikaUrl = uz.slika_url;
		showForm = true;
	}

	async function sacuvaj() {
		const currentUser = get(user);
		if (!currentUser || !input.naziv.trim()) return;
		saving = true;
		try {
			const finalSlikaUrl = slikaKomponenta ? await slikaKomponenta.saveImage() : slikaUrl;
			const podaci = {
				...input,
				naziv: input.naziv.trim(),
				prsten_prefiks: input.prsten_prefiks.trim(),
				app_url: input.app_url.trim(),
				slika_url: finalSlikaUrl
			};

			if (editId) {
				await updateUzgajivacnica(editId, podaci);
			} else {
				const nova = await createUzgajivacnica(currentUser.id, {
					user_id: currentUser.id,
					...podaci
				});
				setAktivnaUzgajivacnica(nova.id);
			}
			showForm = false;
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>{t.uzgajivacnica.pageTitle}</title>
</svelte:head>

<div class="container mx-auto p-4 space-y-5 max-w-lg">

	<div class="flex items-center justify-between">
		<h2 class="h3 font-bold">{t.uzgajivacnica.title}</h2>
		{#if !showForm}
			{#if limitDostignut}
				<span class="badge variant-filled-warning text-xs" title="Dostignut limit za vaš plan">
					🔒 Limit: {$uzgajivacnice.length}/{$tierLimits.max_uzgajivacnice}
				</span>
			{:else}
				<button class="btn btn-sm variant-filled-primary" on:click={otvoriNova}>
					+ Nova uzgajivačnica
				</button>
			{/if}
		{/if}
	</div>

	{#if !showForm}
		<!-- Lista uzgajivačnica -->
		<div class="space-y-3">
			{#each $uzgajivacnice as uz (uz.id)}
				{@const jeAktivna = $aktivnaUzgajivacnica?.id === uz.id}
				{@const brojPtica = $ptice.filter((p) => !p.uzgajivacnica_id || p.uzgajivacnica_id === uz.id).length}
				<div
					class="card p-4 cursor-pointer border-2 transition-colors {jeAktivna
						? 'border-primary-500 bg-primary-50 dark:bg-primary-950'
						: 'border-transparent'}"
					on:click={() => setAktivnaUzgajivacnica(uz.id)}
					on:keypress={(e) => e.key === 'Enter' && setAktivnaUzgajivacnica(uz.id)}
					role="button"
					tabindex="0"
				>
					<div class="flex items-center gap-4">
						{#if uz.slika_url}
							<img src={uz.slika_url} alt={uz.naziv} class="w-14 h-14 rounded-xl object-cover shrink-0" />
						{:else}
							<div class="w-14 h-14 rounded-xl bg-surface-200-700-token flex items-center justify-center text-2xl shrink-0">
								🏡
							</div>
						{/if}
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2">
								<p class="font-bold truncate">{uz.naziv}</p>
								{#if jeAktivna}
									<span class="badge variant-filled-primary text-xs">Aktivna</span>
								{/if}
							</div>
							{#if uz.ime_prezime}
								<p class="text-sm text-surface-500 truncate">{uz.ime_prezime}</p>
							{/if}
							<div class="flex gap-3 mt-1 text-xs text-surface-400">
								{#if uz.prsten_prefiks}
									<span>🔖 {uz.prsten_prefiks}</span>
								{/if}
								<span>🐦 {brojPtica} ptica</span>
								{#if jeAktivna && $aktivnaSezona}
									<span>📅 Sezona {$aktivnaSezona.godina}</span>
								{/if}
							</div>
						</div>
						<button
							class="btn btn-sm variant-ghost shrink-0"
							on:click|stopPropagation={() => otvoriEdit(uz)}
						>
							✏️
						</button>
					</div>
				</div>
			{/each}
		</div>

		{#if $uzgajivacnice.length === 0}
			<div class="card p-8 text-center text-surface-400">
				<p class="text-4xl mb-2">🏡</p>
				<p class="text-sm">Nemate uzgajivačnica. Kreirajte prvu.</p>
			</div>
		{/if}

		<!-- Statistike aktivne uzgajivačnice -->
		{#if $aktivnaUzgajivacnica}
			<div class="grid grid-cols-2 gap-3">
				<div class="card p-4 text-center space-y-1">
					<p class="text-3xl font-bold text-primary-500">{$filtriranePtice.length}</p>
					<p class="text-xs text-surface-500">{t.uzgajivacnica.ukupnoPtica}</p>
				</div>
				<div class="card p-4 text-center space-y-1">
					<p class="text-3xl font-bold text-success-500">{$aktivnaSezona?.godina ?? '—'}</p>
					<p class="text-xs text-surface-500">{t.uzgajivacnica.aktivnaSezona}</p>
				</div>
			</div>
		{/if}

	{:else}
		<!-- Forma za kreiranje / uređivanje -->
		<div class="card p-5 space-y-4">
			<h3 class="font-bold text-lg">{editId ? 'Uredi uzgajivačnicu' : 'Nova uzgajivačnica'}</h3>

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
					<span class="text-sm font-medium">Naziv uzgajivačnice *</span>
					<input
						class="input"
						type="text"
						bind:value={input.naziv}
						placeholder="npr. Uzgajivačnica ptica, Golubnjak..."
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
				{#if jeAdminUser}
				<label class="label">
					<span class="text-sm font-medium">{t.uzgajivac.appUrl} <span class="badge variant-filled-warning text-xs ml-1">Admin</span></span>
					<input
						class="input font-mono text-sm"
						type="url"
						bind:value={input.app_url}
						placeholder={t.uzgajivac.appUrlPlaceholder}
						disabled={saving}
					/>
					<span class="text-xs text-surface-400">{t.uzgajivac.appUrlOpis}</span>
				</label>
				{/if}
			</div>

			<div class="flex gap-3 pt-1">
				<button class="btn variant-ghost flex-1" on:click={() => (showForm = false)} disabled={saving}>
					{t.common.odustani}
				</button>
				<button
					class="btn variant-filled-primary flex-1"
					on:click={sacuvaj}
					disabled={saving || !input.naziv.trim()}
				>
					{#if saving}<span class="animate-spin mr-2">↻</span>{/if}
					{t.uzgajivac.sacuvaj}
				</button>
			</div>
		</div>
	{/if}
</div>
