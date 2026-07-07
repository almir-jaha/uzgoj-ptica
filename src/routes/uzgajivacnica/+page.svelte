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
	import {
		aktivneSekcije,
		loadSekcije,
		createSekcija,
		updateSekcija,
		deleteSekcija
	} from '$lib/stores/sekcija';
	import { isAdmin } from '$lib/stores/admin';
	import { tierLimits, jeNaLimitUzgajivacnica } from '$lib/stores/userTier';
	import SlikaUnos from '$lib/components/SlikaUnos.svelte';
	import { t } from '$lib/i18n';

	let editId: string | null = null;
	let showForm = false;

	$: limitDostignut = jeNaLimitUzgajivacnica($uzgajivacnice.length, $tierLimits);
	$: jeAdminUser = isAdmin($user?.email);
	let saving = false;
	let input = { naziv: '', opis: '', ime_prezime: '', adresa: '', telefon: '', prsten_prefiks: '', app_url: '' };
	let slikaUrl: string | undefined;
	let slikaKomponenta: SlikaUnos;

	// Sekcije
	let showSekcijePanel = false;
	let sekcijaEditId: string | null = null;
	let sekcijaInput = { naziv: '', opis: '', kapacitet_kaveza: '' };
	let sekcijaShowForm = false;
	let sekcijaSaving = false;
	let sekcijaError = '';

	$: if ($aktivnaUzgajivacnica && showSekcijePanel) {
		loadSekcije($aktivnaUzgajivacnica.id);
	}

	function otvoriNovaSekcija() {
		sekcijaEditId = null;
		sekcijaInput = { naziv: '', opis: '', kapacitet_kaveza: '' };
		sekcijaError = '';
		sekcijaShowForm = true;
	}

	function otvoriEditSekcija(s: typeof $aktivneSekcije[0]) {
		sekcijaEditId = s.id;
		sekcijaInput = {
			naziv: s.naziv,
			opis: s.opis ?? '',
			kapacitet_kaveza: s.kapacitet_kaveza ? String(s.kapacitet_kaveza) : ''
		};
		sekcijaError = '';
		sekcijaShowForm = true;
	}

	async function sacuvajSekciju() {
		const currentUser = get(user);
		const uz = $aktivnaUzgajivacnica;
		if (!currentUser || !uz || !sekcijaInput.naziv.trim()) return;
		sekcijaSaving = true;
		sekcijaError = '';
		try {
			const podaci = {
				naziv: sekcijaInput.naziv.trim(),
				opis: sekcijaInput.opis.trim() || undefined,
				kapacitet_kaveza: sekcijaInput.kapacitet_kaveza ? parseInt(sekcijaInput.kapacitet_kaveza) : undefined,
				redoslijed: sekcijaEditId
					? ($aktivneSekcije.find(s => s.id === sekcijaEditId)?.redoslijed ?? 0)
					: $aktivneSekcije.length
			};
			if (sekcijaEditId) {
				await updateSekcija(sekcijaEditId, podaci);
			} else {
				await createSekcija(uz.id, currentUser.id, podaci);
			}
			sekcijaShowForm = false;
		} catch (err) {
			sekcijaError = err instanceof Error ? err.message : $t.common.greska;
		} finally {
			sekcijaSaving = false;
		}
	}

	async function obrisiSekciju(id: string) {
		if (!confirm($t.sekcije.brisanjeKonfirmacija)) return;
		try {
			await deleteSekcija(id);
		} catch (err) {
			alert(err instanceof Error ? err.message : $t.common.greska);
		}
	}

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
		input = { naziv: '', opis: '', ime_prezime: '', adresa: '', telefon: '', prsten_prefiks: '', app_url: '' };
		slikaUrl = undefined;
		showForm = true;
	}

	function otvoriEdit(uz: typeof $uzgajivacnice[0]) {
		editId = uz.id;
		input = {
			naziv: uz.naziv ?? '',
			opis: uz.opis ?? '',
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
	<title>{$t.uzgajivacnica.pageTitle}</title>
</svelte:head>

<div class="container mx-auto p-4 space-y-5 max-w-lg">


	<div class="flex items-center justify-between">
		<h2 class="h3 font-bold">{$t.uzgajivacnica.title}</h2>
		{#if !showForm}
			{#if limitDostignut}
				<span class="badge variant-filled-warning text-xs" title={$t.ptice.dostignutLimitTitle}>
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
					<p class="text-xs text-surface-500">{$t.uzgajivacnica.ukupnoPtica}</p>
				</div>
				<div class="card p-4 text-center space-y-1">
					<p class="text-3xl font-bold text-success-500">{$aktivnaSezona?.godina ?? '—'}</p>
					<p class="text-xs text-surface-500">{$t.uzgajivacnica.aktivnaSezona}</p>
				</div>
			</div>

			<!-- Sekcije panel -->
			<div class="card p-4 space-y-3">
				<button
					class="w-full flex items-center justify-between"
					on:click={async () => {
						showSekcijePanel = !showSekcijePanel;
						if (showSekcijePanel && $aktivnaUzgajivacnica)
							await loadSekcije($aktivnaUzgajivacnica.id);
					}}
				>
					<div class="flex items-center gap-2">
						<span class="text-lg">🏠</span>
						<span class="font-semibold text-sm">{$t.sekcije.panelTitle}</span>
						{#if $aktivneSekcije.length > 0}
							<span class="badge variant-soft text-xs">{$aktivneSekcije.length}</span>
						{/if}
					</div>
					<span class="text-surface-400">{showSekcijePanel ? '▲' : '▼'}</span>
				</button>

				{#if showSekcijePanel}
					<div class="space-y-2 pt-1 border-t border-surface-200-700-token">
						{#each $aktivneSekcije as s (s.id)}
							{#if sekcijaEditId === s.id && sekcijaShowForm}
								<!-- Inline edit forma -->
								<div class="card p-3 space-y-2 variant-soft">
									<input class="input input-sm" type="text" bind:value={sekcijaInput.naziv} placeholder={$t.sekcije.nazivLabel} disabled={sekcijaSaving} />
									<input class="input input-sm" type="text" bind:value={sekcijaInput.opis} placeholder={$t.sekcije.opisLabel} disabled={sekcijaSaving} />
									<input class="input input-sm" type="number" bind:value={sekcijaInput.kapacitet_kaveza} placeholder={$t.sekcije.kapacitetLabel} min="1" disabled={sekcijaSaving} />
									{#if sekcijaError}<p class="text-xs text-error-500">{sekcijaError}</p>{/if}
									<div class="flex gap-2">
										<button class="btn btn-sm variant-ghost flex-1" on:click={() => { sekcijaShowForm = false; sekcijaEditId = null; }} disabled={sekcijaSaving}>{$t.common.odustani}</button>
										<button class="btn btn-sm variant-filled-primary flex-1" on:click={sacuvajSekciju} disabled={sekcijaSaving || !sekcijaInput.naziv.trim()}>
											{#if sekcijaSaving}<span class="animate-spin mr-1">↻</span>{/if}{$t.sekcije.spremi}
										</button>
									</div>
								</div>
							{:else}
								<div class="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-surface-100-800-token">
									<div>
										<span class="text-sm font-medium">{s.naziv}</span>
										{#if s.opis}<span class="text-xs text-surface-400 ml-2">{s.opis}</span>{/if}
										{#if s.kapacitet_kaveza}<span class="badge variant-soft text-xs ml-2">{s.kapacitet_kaveza} {$t.sekcije.kavezaLabel}</span>{/if}
									</div>
									<div class="flex gap-1">
										<button class="btn btn-sm variant-ghost-surface" on:click={() => otvoriEditSekcija(s)}>✏️</button>
										<button class="btn btn-sm variant-ghost-error" on:click={() => obrisiSekciju(s.id)}>🗑</button>
									</div>
								</div>
							{/if}
						{/each}

						{#if $aktivneSekcije.length === 0}
							<p class="text-xs text-surface-400 text-center py-2">{$t.sekcije.nemaSekcija}</p>
						{/if}

						{#if !sekcijaShowForm}
							<button class="btn btn-sm variant-ghost-primary w-full" on:click={otvoriNovaSekcija}>
								{$t.sekcije.novaSekcijaBtn}
							</button>
						{:else if sekcijaEditId === null}
							<!-- Nova sekcija forma -->
							<div class="card p-3 space-y-2 variant-soft">
								<input class="input input-sm" type="text" bind:value={sekcijaInput.naziv} placeholder={$t.sekcije.nazivLabel} disabled={sekcijaSaving} />
								<input class="input input-sm" type="text" bind:value={sekcijaInput.opis} placeholder={$t.sekcije.opisLabel} disabled={sekcijaSaving} />
								<input class="input input-sm" type="number" bind:value={sekcijaInput.kapacitet_kaveza} placeholder={$t.sekcije.kapacitetLabel} min="1" disabled={sekcijaSaving} />
								{#if sekcijaError}<p class="text-xs text-error-500">{sekcijaError}</p>{/if}
								<div class="flex gap-2">
									<button class="btn btn-sm variant-ghost flex-1" on:click={() => { sekcijaShowForm = false; }} disabled={sekcijaSaving}>{$t.common.odustani}</button>
									<button class="btn btn-sm variant-filled-primary flex-1" on:click={sacuvajSekciju} disabled={sekcijaSaving || !sekcijaInput.naziv.trim()}>
										{#if sekcijaSaving}<span class="animate-spin mr-1">↻</span>{/if}{$t.sekcije.dodajBtn}
									</button>
								</div>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		{/if}

	{:else}
		<!-- Forma za kreiranje / uređivanje -->
		<div class="card p-5 space-y-4">
			<h3 class="font-bold text-lg">{editId ? $t.uzgajivacnica.urediProfil : $t.uzgajivac.naziv}</h3>

			<SlikaUnos
				bind:this={slikaKomponenta}
				bind:slika_url={slikaUrl}
				bucket="uzgajivaci"
				userId={$user?.id ?? ''}
				disabled={saving}
				label={$t.uzgajivac.slika}
			/>

			<div class="space-y-3">
				<label class="label">
					<span class="text-sm font-medium">{$t.uzgajivac.naziv} *</span>
					<input
						class="input"
						type="text"
						bind:value={input.naziv}
						placeholder={$t.uzgajivac.nazivInputPlaceholder}
						disabled={saving}
					/>
				</label>
				<label class="label">
					<span class="text-sm font-medium">{$t.sekcije.opisLabel}</span>
					<input
						class="input"
						type="text"
						bind:value={input.opis}
						placeholder={$t.uzgajivac.opisInputPlaceholder}
						disabled={saving}
					/>
				</label>
				<label class="label">
					<span class="text-sm font-medium">{$t.uzgajivac.imePrezime}</span>
					<input
						class="input"
						type="text"
						bind:value={input.ime_prezime}
						placeholder={$t.uzgajivac.imePrezimePlaceholder}
						disabled={saving}
					/>
				</label>
				<label class="label">
					<span class="text-sm font-medium">{$t.uzgajivac.adresa}</span>
					<input
						class="input"
						type="text"
						bind:value={input.adresa}
						placeholder={$t.uzgajivac.adresaPlaceholder}
						disabled={saving}
					/>
				</label>
				<label class="label">
					<span class="text-sm font-medium">{$t.uzgajivac.telefon}</span>
					<input
						class="input"
						type="tel"
						bind:value={input.telefon}
						placeholder={$t.uzgajivac.telefonPlaceholder}
						disabled={saving}
					/>
				</label>
				<label class="label">
					<span class="text-sm font-medium">{$t.ptice.prsten_prefiks}</span>
					<input
						class="input"
						type="text"
						bind:value={input.prsten_prefiks}
						placeholder={$t.ptice.prsten_prefiksPlaceholder}
						disabled={saving}
					/>
					<span class="text-xs text-surface-400">{$t.ptice.prsten_prefiksOpis}</span>
				</label>
				{#if jeAdminUser}
				<label class="label">
					<span class="text-sm font-medium">{$t.uzgajivac.appUrl} <span class="badge variant-filled-warning text-xs ml-1">Admin</span></span>
					<input
						class="input font-mono text-sm"
						type="url"
						bind:value={input.app_url}
						placeholder={$t.uzgajivac.appUrlPlaceholder}
						disabled={saving}
					/>
					<span class="text-xs text-surface-400">{$t.uzgajivac.appUrlOpis}</span>
				</label>
				{/if}
			</div>

			<div class="flex gap-3 pt-1">
				<button class="btn variant-ghost flex-1" on:click={() => (showForm = false)} disabled={saving}>
					{$t.common.odustani}
				</button>
				<button
					class="btn variant-filled-primary flex-1"
					on:click={sacuvaj}
					disabled={saving || !input.naziv.trim()}
				>
					{#if saving}<span class="animate-spin mr-2">↻</span>{/if}
					{$t.uzgajivac.sacuvaj}
				</button>
			</div>
		</div>
	{/if}
</div>
