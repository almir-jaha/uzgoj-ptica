<script lang="ts">
	import { updateSezona, createKavez, deleteKavez, deleteSezona, kavezi as kaveziStore } from '$lib/stores/sezona';
	import type { Sezona, Kavez, Sekcija } from '$lib/db/schema';
	import { t } from '$lib/i18n';
	import { get } from 'svelte/store';

	export let sezona: Sezona;
	export let sekcije: Sekcija[] = [];
	export let onClose: () => void;
	export let onSuccess: (deleted?: boolean) => void;

	type Tab = 'info' | 'kavezi';
	let tab: Tab = 'info';

	// ── Info tab ──
	let naziv = sezona.naziv ?? '';
	let datum_pocetka = sezona.datum_pocetka;
	let datum_kraja = sezona.datum_kraja ?? '';
	let status = sezona.status;
	let loading = false;
	let errorMsg = '';

	async function handleSubmit() {
		loading = true;
		errorMsg = '';
		try {
			await updateSezona(sezona.id, {
				naziv: naziv.trim() || undefined,
				datum_pocetka,
				datum_kraja: datum_kraja || undefined,
				status
			});
			onSuccess();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : $t.sezona.urediGreska;
		} finally {
			loading = false;
		}
	}

	// ── Kavezi tab ──
	$: trenutniKavezi = get(kaveziStore).filter((k) => k.sezona_id === sezona.id).sort((a, b) => a.oznaka - b.oznaka);
	// Reaktivno pratimo store
	$: _storeKavezi = $kaveziStore; // trigger reaktivnost
	$: trenutniKavezi = $kaveziStore.filter((k) => k.sezona_id === sezona.id).sort((a, b) => a.oznaka - b.oznaka);

	let dodajBroj = 1;
	let dodajSekcijaId = '';
	let dodajLoading = false;
	let dodajError = '';

	async function handleDodajKaveze() {
		if (dodajBroj < 1) return;
		dodajLoading = true;
		dodajError = '';
		try {
			const maxOznaka = trenutniKavezi.length > 0 ? Math.max(...trenutniKavezi.map((k) => k.oznaka)) : 0;
			const promises = Array.from({ length: dodajBroj }, (_, i) =>
				createKavez(sezona.id, sezona.user_id, maxOznaka + i + 1, undefined, dodajSekcijaId || undefined)
			);
			await Promise.all(promises);
			// Ažuriraj broj_kaveza na sezoni
			await updateSezona(sezona.id, { broj_kaveza: trenutniKavezi.length + dodajBroj });
			dodajBroj = 1;
		} catch (err) {
			dodajError = err instanceof Error ? err.message : $t.kavezUredi.greska;
		} finally {
			dodajLoading = false;
		}
	}

	let brisanjeKavezaId: string | null = null;

	async function handleObrisiKavez(kavez: Kavez) {
		if (kavez.status !== 'prazan') return;
		brisanjeKavezaId = kavez.id;
		try {
			await deleteKavez(kavez.id);
			await updateSezona(sezona.id, { broj_kaveza: Math.max(0, trenutniKavezi.length - 1) });
		} catch (err) {
			alert(err instanceof Error ? err.message : $t.kavezUredi.greskaKavez);
		} finally {
			brisanjeKavezaId = null;
		}
	}

	// ── Brisanje sezone ──
	$: svePrazni = trenutniKavezi.every((k) => k.status === 'prazan');
	$: mozeBrisati = svePrazni;
	let brisanjeSezona = false;
	let brisanjeError = '';

	async function handleObrisiSezonu() {
		if (!mozeBrisati) return;
		brisanjeSezona = true;
		brisanjeError = '';
		try {
			await deleteSezona(sezona.id);
			onSuccess(true);
		} catch (err) {
			brisanjeError = err instanceof Error ? err.message : $t.kavezUredi.greskaSezone;
			brisanjeSezona = false;
		}
	}
</script>

<div
	class="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4"
	role="presentation"
	on:click|self={onClose}
	on:keydown={(e) => e.key === 'Escape' && onClose()}
>
	<div class="card w-full max-w-md p-6 space-y-4 max-h-[90vh] flex flex-col">
		<header class="flex items-center justify-between shrink-0">
			<h3 class="h4 font-bold">{$t.sezona.urediTitle} {sezona.godina}</h3>
			<button class="btn-icon btn-icon-sm variant-ghost" on:click={onClose} disabled={loading}>
				{$t.modali.zatvoriBtnTitle}
			</button>
		</header>

		<!-- Tabovi -->
		<div class="flex gap-1 shrink-0">
			<button
				class="btn btn-sm flex-1 {tab === 'info' ? 'variant-filled-primary' : 'variant-ghost-surface'}"
				on:click={() => (tab = 'info')}
			>
				{$t.kavezUredi.tabInfo}
			</button>
			<button
				class="btn btn-sm flex-1 {tab === 'kavezi' ? 'variant-filled-primary' : 'variant-ghost-surface'}"
				on:click={() => (tab = 'kavezi')}
			>
				{$t.kavezUredi.tabKavezi} <span class="badge variant-soft ml-1 text-xs">{trenutniKavezi.length}</span>
			</button>
		</div>

		<div class="overflow-y-auto flex-1">

		{#if tab === 'info'}
			<!-- ── INFO TAB ── -->
			<form class="space-y-4" on:submit|preventDefault={handleSubmit}>
				<label class="label">
					<span class="text-sm font-medium">{$t.sezona.urediNazivLabel}</span>
					<input
						class="input"
						type="text"
						bind:value={naziv}
						placeholder={$t.sezona.urediNazivPlaceholder}
						disabled={loading}
					/>
				</label>

				<div class="grid grid-cols-2 gap-3">
					<label class="label">
						<span class="text-sm font-medium">{$t.common.datumPocetka}</span>
						<input class="input" type="date" bind:value={datum_pocetka} required disabled={loading} />
					</label>
					<label class="label">
						<span class="text-sm font-medium">{$t.common.datumZavrsetka}</span>
						<input class="input" type="date" bind:value={datum_kraja} disabled={loading} />
					</label>
				</div>

				<label class="label">
					<span class="text-sm font-medium">{$t.sezona.urediStatus}</span>
					<select class="select" bind:value={status} disabled={loading}>
						<option value="aktiva">{$t.sezona.statusAktiva}</option>
						<option value="završena">{$t.sezona.statusZavrsena}</option>
					</select>
				</label>

				{#if errorMsg}
					<aside class="alert variant-filled-error py-2 px-3 text-sm"><p>{errorMsg}</p></aside>
				{/if}

				<div class="flex gap-3 pt-1">
					<button class="btn variant-ghost flex-1" type="button" on:click={onClose} disabled={loading}>
						{$t.common.odustani}
					</button>
					<button class="btn variant-filled-primary flex-1" type="submit" disabled={loading}>
						{#if loading}<span class="animate-spin mr-2">↻</span>{/if}
						{$t.common.sacuvaj}
					</button>
				</div>
			</form>

		{:else}
			<!-- ── KAVEZI TAB ── -->
			<div class="space-y-4">

				<!-- Lista kaveza -->
				<div class="space-y-1 max-h-48 overflow-y-auto">
					{#each trenutniKavezi as k (k.id)}
						<div class="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-surface-100-800-token">
							<div class="flex items-center gap-2">
								<span class="text-sm font-mono font-medium">K{k.oznaka}</span>
								{#if sekcije.length > 0 && k.sekcija_id}
									<span class="badge variant-soft text-xs">
										{sekcije.find(s => s.id === k.sekcija_id)?.naziv ?? ''}
									</span>
								{/if}
								<span class="badge text-xs {k.status === 'prazan' ? 'variant-soft-surface' : k.status === 'aktivan' ? 'variant-filled-success' : 'variant-filled-error'}">
									{k.status}
								</span>
							</div>
							{#if k.status === 'prazan'}
								<button
									class="btn-icon btn-icon-sm variant-ghost-error"
									title={$t.kavezUredi.obrisatiKavezTitle}
									disabled={brisanjeKavezaId === k.id}
									on:click={() => handleObrisiKavez(k)}
								>
									{brisanjeKavezaId === k.id ? '↻' : '🗑'}
								</button>
							{/if}
						</div>
					{/each}
					{#if trenutniKavezi.length === 0}
						<p class="text-xs text-surface-400 text-center py-3">{$t.kavezUredi.nemaKavezaUSezonui}</p>
					{/if}
				</div>

				<!-- Dodaj kaveze -->
				<div class="card p-3 space-y-3 variant-soft">
					<p class="text-sm font-semibold">{$t.kavezUredi.dodajKavezeTitle}</p>
					<div class="flex items-end gap-2">
						<label class="label flex-1">
							<span class="text-xs">{$t.kavezUredi.brojKavezaLabel}</span>
							<input
								class="input"
								type="number"
								bind:value={dodajBroj}
								min="1"
								max="50"
								disabled={dodajLoading}
							/>
						</label>
						{#if sekcije.length > 0}
							<label class="label flex-1">
								<span class="text-xs">{$t.kavezUredi.sekcijaLabel}</span>
								<select class="select" bind:value={dodajSekcijaId} disabled={dodajLoading}>
									<option value="">{$t.kavezUredi.bezSekcije}</option>
									{#each sekcije as s (s.id)}
										<option value={s.id}>{s.naziv}</option>
									{/each}
								</select>
							</label>
						{/if}
					</div>
					{#if dodajError}
						<p class="text-xs text-error-500">{dodajError}</p>
					{/if}
					<button
						class="btn btn-sm variant-filled-primary w-full"
						on:click={handleDodajKaveze}
						disabled={dodajLoading || dodajBroj < 1}
					>
						{#if dodajLoading}<span class="animate-spin mr-1">↻</span>{/if}
						{$t.kavezUredi.dodajBtn} {dodajBroj}
					</button>
				</div>

				<!-- Danger zone: brisanje sezone -->
				<div class="border border-error-300 dark:border-error-700 rounded-lg p-3 space-y-2">
					<p class="text-sm font-semibold text-error-600 dark:text-error-400">{$t.kavezUredi.obrisatiSezonuTitle}</p>
					{#if !mozeBrisati}
						<p class="text-xs text-surface-400">{$t.kavezUredi.obrisatiSezonuUvjet}</p>
					{:else}
						<p class="text-xs text-surface-400">{$t.kavezUredi.obrisatiSezonuSpremno}</p>
					{/if}
					{#if brisanjeError}
						<p class="text-xs text-error-500">{brisanjeError}</p>
					{/if}
					<button
						class="btn btn-sm variant-filled-error w-full"
						disabled={!mozeBrisati || brisanjeSezona}
						on:click={handleObrisiSezonu}
					>
						{#if brisanjeSezona}<span class="animate-spin mr-1">↻</span>{/if}
						{$t.kavezUredi.obrisatiSezonuBtn} {sezona.godina}
					</button>
				</div>

			</div>
		{/if}

		</div>
	</div>
</div>
