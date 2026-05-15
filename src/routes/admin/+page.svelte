<script lang="ts">
	import { onMount } from 'svelte';
	import { user } from '$lib/stores/auth';
	import { isAdmin, vrstePtica, adminLoading, loadVrstePtica, createVrstaPtica, updateVrstaPtica, deleteVrstaPtica, loadFazeZaVrstu, createFaza, updateFaza, deleteFaza } from '$lib/stores/admin';
	import { goto } from '$app/navigation';
	import type { VrstaPtica, FazaCiklusa } from '$lib/db/schema';

	// Redirect if not admin
	$: if ($user !== undefined && !isAdmin($user?.email)) goto('/kavezi');

	// ── State ──────────────────────────────────────────────────

	// Expanded species (shows phases)
	let expandedId: string | null = null;
	// Phases per species
	let fazePoVrsti: Record<string, FazaCiklusa[]> = {};
	let fazeLoading: Record<string, boolean> = {};

	// Nova/uredi vrsta forma (inline)
	let novaVrstaOpen = false;
	let editVrsta: VrstaPtica | null = null;
	let formaVrstaNaziv = '';
	let formaVrstaNapomena = '';
	let vrstaLoading = false;
	let vrstaError = '';

	// Nova/uredi faza forma (inline, per species)
	let novaFazaZaVrstu: string | null = null;
	let editFaza: FazaCiklusa | null = null;
	let formaFazaNaziv = '';
	let formaFazaBoja = '#6366f1';
	let formaFazaDana = 7;
	let formaFazaRedoslijed = 1;
	let formaFazaOpis = '';
	let fazaLoading = false;
	let fazaError = '';

	let brisiVrstaId: string | null = null;
	let brisiFazaId: string | null = null;

	onMount(async () => {
		if (!isAdmin($user?.email)) return;
		await loadVrstePtica();
	});

	// ── Helpers ─────────────────────────────────────────────────

	async function toggleExpand(vrstaId: string) {
		if (expandedId === vrstaId) {
			expandedId = null;
			return;
		}
		expandedId = vrstaId;
		if (!fazePoVrsti[vrstaId]) {
			fazeLoading = { ...fazeLoading, [vrstaId]: true };
			fazePoVrsti[vrstaId] = await loadFazeZaVrstu(vrstaId);
			fazeLoading = { ...fazeLoading, [vrstaId]: false };
		}
	}

	function otvoriNovaVrsta() {
		editVrsta = null;
		formaVrstaNaziv = '';
		formaVrstaNapomena = '';
		vrstaError = '';
		novaVrstaOpen = true;
	}

	function otvoriUrediVrsta(vrsta: VrstaPtica) {
		editVrsta = vrsta;
		formaVrstaNaziv = vrsta.naziv;
		formaVrstaNapomena = vrsta.napomena ?? '';
		vrstaError = '';
		novaVrstaOpen = true;
	}

	async function sacuvajVrstu() {
		if (!formaVrstaNaziv.trim()) return;
		vrstaLoading = true;
		vrstaError = '';
		try {
			if (editVrsta) {
				await updateVrstaPtica(editVrsta.id, formaVrstaNaziv, formaVrstaNapomena || undefined);
			} else {
				await createVrstaPtica(formaVrstaNaziv, formaVrstaNapomena || undefined);
			}
			novaVrstaOpen = false;
			editVrsta = null;
		} catch (err) {
			vrstaError = err instanceof Error ? err.message : 'Greška';
		} finally {
			vrstaLoading = false;
		}
	}

	async function obrisiVrstu() {
		if (!brisiVrstaId) return;
		vrstaLoading = true;
		try {
			await deleteVrstaPtica(brisiVrstaId);
			if (expandedId === brisiVrstaId) expandedId = null;
			delete fazePoVrsti[brisiVrstaId];
		} catch (err) {
			vrstaError = err instanceof Error ? err.message : 'Greška pri brisanju';
		} finally {
			vrstaLoading = false;
			brisiVrstaId = null;
		}
	}

	function otvoriNovaFaza(vrstaId: string, existingFaze: FazaCiklusa[]) {
		editFaza = null;
		novaFazaZaVrstu = vrstaId;
		formaFazaNaziv = '';
		formaFazaBoja = '#6366f1';
		formaFazaDana = 7;
		formaFazaRedoslijed = (existingFaze.length + 1);
		formaFazaOpis = '';
		fazaError = '';
	}

	function otvoriUrediaFazu(faza: FazaCiklusa) {
		editFaza = faza;
		novaFazaZaVrstu = faza.vrsta_ptica_id;
		formaFazaNaziv = faza.naziv;
		formaFazaBoja = faza.boja;
		formaFazaDana = faza.broj_dana;
		formaFazaRedoslijed = faza.redoslijed;
		formaFazaOpis = faza.opis ?? '';
		fazaError = '';
	}

	function otkaziFormuFaze() {
		novaFazaZaVrstu = null;
		editFaza = null;
		fazaError = '';
	}

	async function sacuvajFazu() {
		if (!novaFazaZaVrstu || !formaFazaNaziv.trim()) return;
		fazaLoading = true;
		fazaError = '';
		try {
			if (editFaza) {
				await updateFaza(editFaza.id, {
					naziv: formaFazaNaziv.trim(),
					boja: formaFazaBoja,
					broj_dana: formaFazaDana,
					redoslijed: formaFazaRedoslijed,
					opis: formaFazaOpis || undefined
				});
				fazePoVrsti[novaFazaZaVrstu] = fazePoVrsti[novaFazaZaVrstu].map((f) =>
					f.id === editFaza!.id
						? { ...f, naziv: formaFazaNaziv.trim(), boja: formaFazaBoja, broj_dana: formaFazaDana, redoslijed: formaFazaRedoslijed, opis: formaFazaOpis || undefined }
						: f
				).sort((a, b) => a.redoslijed - b.redoslijed);
			} else {
				const novaFaza = await createFaza({
					vrsta_ptica_id: novaFazaZaVrstu,
					redoslijed: formaFazaRedoslijed,
					naziv: formaFazaNaziv.trim(),
					boja: formaFazaBoja,
					broj_dana: formaFazaDana,
					opis: formaFazaOpis || undefined
				});
				fazePoVrsti[novaFazaZaVrstu] = [
					...(fazePoVrsti[novaFazaZaVrstu] ?? []),
					novaFaza
				].sort((a, b) => a.redoslijed - b.redoslijed);
			}
			otkaziFormuFaze();
		} catch (err) {
			fazaError = err instanceof Error ? err.message : 'Greška';
		} finally {
			fazaLoading = false;
		}
	}

	async function obrisiFazu() {
		if (!brisiFazaId) return;
		fazaLoading = true;
		try {
			const faza = Object.values(fazePoVrsti).flat().find((f) => f.id === brisiFazaId);
			await deleteFaza(brisiFazaId);
			if (faza) {
				fazePoVrsti[faza.vrsta_ptica_id] = fazePoVrsti[faza.vrsta_ptica_id].filter(
					(f) => f.id !== brisiFazaId
				);
			}
		} catch (err) {
			fazaError = err instanceof Error ? err.message : 'Greška pri brisanju';
		} finally {
			fazaLoading = false;
			brisiFazaId = null;
		}
	}

	// Ukupno dana (suma) za prikaz u headeru vrste
	function ukupnoDana(faze: FazaCiklusa[]): number {
		return faze.reduce((s, f) => s + f.broj_dana, 0);
	}
</script>

<svelte:head>
	<title>Administracija – Uzgoj ptica</title>
</svelte:head>

<div class="container mx-auto p-4 space-y-5 max-w-3xl">

	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h2 class="h3 font-bold">🔧 Administracija</h2>
			<p class="text-sm text-surface-500">Upravljanje vrstama ptica i fazama uzgoja</p>
		</div>
		<a href="/kavezi" class="btn btn-sm variant-ghost-surface">← Nazad</a>
	</div>

	<!-- ── Vrste ptica ──────────────────────────────────────── -->
	<section class="space-y-3">
		<div class="flex items-center justify-between">
			<h3 class="font-semibold text-surface-700-200-token">Vrste ptica i faze uzgoja</h3>
			<button class="btn btn-sm variant-filled-primary" on:click={otvoriNovaVrsta}>
				+ Nova vrsta
			</button>
		</div>

		<!-- Forma za novu / uređivanje vrste -->
		{#if novaVrstaOpen}
			<div class="card p-4 space-y-3 border border-primary-500/30">
				<h4 class="font-medium text-sm">{editVrsta ? `Uredi: ${editVrsta.naziv}` : 'Nova vrsta ptica'}</h4>
				<label class="label">
					<span class="text-xs font-medium">Naziv *</span>
					<input class="input input-sm" type="text" bind:value={formaVrstaNaziv} placeholder="npr. Kanarinac boja" disabled={vrstaLoading} />
				</label>
				<label class="label">
					<span class="text-xs font-medium">Napomena</span>
					<textarea class="textarea text-sm" rows="2" bind:value={formaVrstaNapomena} placeholder="Opcionalna bilješka..." disabled={vrstaLoading}></textarea>
				</label>
				{#if vrstaError}
					<p class="text-error-500 text-xs">{vrstaError}</p>
				{/if}
				<div class="flex gap-2">
					<button class="btn btn-sm variant-ghost flex-1" on:click={() => { novaVrstaOpen = false; editVrsta = null; }} disabled={vrstaLoading}>Odustani</button>
					<button class="btn btn-sm variant-filled-primary flex-1" on:click={sacuvajVrstu} disabled={vrstaLoading || !formaVrstaNaziv.trim()}>
						{#if vrstaLoading}<span class="animate-spin mr-1">↻</span>{/if}
						{editVrsta ? 'Sačuvaj' : 'Kreiraj'}
					</button>
				</div>
			</div>
		{/if}

		{#if $adminLoading}
			<div class="space-y-2">
				{#each Array(3) as _}
					<div class="card p-3 h-14 animate-pulse bg-surface-200-700-token"></div>
				{/each}
			</div>
		{:else if $vrstePtica.length === 0}
			<div class="card p-6 text-center text-surface-500 text-sm">
				Nema vrsta ptica. Kliknite "+ Nova vrsta" da dodate.
			</div>
		{:else}
			<div class="space-y-2">
				{#each $vrstePtica as vrsta (vrsta.id)}
					<!-- Vrsta header -->
					<div class="card overflow-hidden">
						<button
							class="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-surface-100-800-token transition-colors"
							on:click={() => toggleExpand(vrsta.id)}
						>
							<div class="flex items-center gap-2 min-w-0">
								<span class="text-sm font-semibold truncate">{vrsta.naziv}</span>
								{#if fazePoVrsti[vrsta.id]}
									<span class="badge variant-soft text-xs shrink-0">
										{fazePoVrsti[vrsta.id].length} faza · {ukupnoDana(fazePoVrsti[vrsta.id])} dana
									</span>
								{/if}
							</div>
							<div class="flex items-center gap-1 shrink-0">
								<button
									class="btn btn-sm variant-ghost-surface px-2"
									on:click|stopPropagation={() => otvoriUrediVrsta(vrsta)}
									title="Uredi vrstu"
								>✏</button>
								<button
									class="btn btn-sm variant-ghost-error px-2"
									on:click|stopPropagation={() => (brisiVrstaId = vrsta.id)}
									title="Obriši vrstu"
								>🗑</button>
								<span class="text-surface-400 text-xs ml-1">{expandedId === vrsta.id ? '▲' : '▼'}</span>
							</div>
						</button>

						<!-- Potvrda brisanja vrste -->
						{#if brisiVrstaId === vrsta.id}
							<div class="px-4 pb-3 space-y-2 border-t border-surface-200-700-token bg-error-500/5">
								<p class="text-sm font-medium text-error-500">Obrisati vrstu "{vrsta.naziv}"? Ovo briše i sve njene faze!</p>
								<div class="flex gap-2">
									<button class="btn btn-sm variant-ghost flex-1" on:click={() => (brisiVrstaId = null)}>Odustani</button>
									<button class="btn btn-sm variant-filled-error flex-1" on:click={obrisiVrstu} disabled={vrstaLoading}>Obriši</button>
								</div>
							</div>
						{/if}

						<!-- Expandovane faze -->
						{#if expandedId === vrsta.id}
							<div class="border-t border-surface-200-700-token bg-surface-50-900-token px-4 py-3 space-y-3">

								{#if fazeLoading[vrsta.id]}
									<p class="text-xs text-surface-500 animate-pulse">Učitavanje faza...</p>
								{:else}

									<!-- Lista faza -->
									{#if (fazePoVrsti[vrsta.id] ?? []).length > 0}
										<div class="space-y-1">
											{#each fazePoVrsti[vrsta.id] as faza (faza.id)}
												<!-- Inline forma za uređivanje faze -->
												{#if editFaza?.id === faza.id && novaFazaZaVrstu === vrsta.id}
													<div class="card p-3 space-y-2 border border-primary-500/30">
														<div class="grid grid-cols-2 gap-2">
															<label class="label col-span-2">
																<span class="text-xs font-medium">Naziv faze *</span>
																<input class="input input-sm" type="text" bind:value={formaFazaNaziv} disabled={fazaLoading} />
															</label>
															<label class="label">
																<span class="text-xs font-medium">Boja</span>
																<div class="flex gap-2 items-center">
																	<input type="color" bind:value={formaFazaBoja} class="h-9 w-14 rounded cursor-pointer border border-surface-300" disabled={fazaLoading} />
																	<input class="input input-sm flex-1" type="text" bind:value={formaFazaBoja} disabled={fazaLoading} />
																</div>
															</label>
															<label class="label">
																<span class="text-xs font-medium">Broj dana</span>
																<input class="input input-sm" type="number" bind:value={formaFazaDana} min="1" disabled={fazaLoading} />
															</label>
															<label class="label">
																<span class="text-xs font-medium">Redoslijed</span>
																<input class="input input-sm" type="number" bind:value={formaFazaRedoslijed} min="1" disabled={fazaLoading} />
															</label>
															<label class="label">
																<span class="text-xs font-medium">Opis (opt.)</span>
																<input class="input input-sm" type="text" bind:value={formaFazaOpis} placeholder="Bilješka..." disabled={fazaLoading} />
															</label>
														</div>
														{#if fazaError}<p class="text-error-500 text-xs">{fazaError}</p>{/if}
														<div class="flex gap-2">
															<button class="btn btn-sm variant-ghost flex-1" on:click={otkaziFormuFaze} disabled={fazaLoading}>Odustani</button>
															<button class="btn btn-sm variant-filled-primary flex-1" on:click={sacuvajFazu} disabled={fazaLoading || !formaFazaNaziv.trim()}>
																{#if fazaLoading}<span class="animate-spin mr-1">↻</span>{/if}
																Sačuvaj
															</button>
														</div>
													</div>
												{:else}
													<div class="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface-100-800-token group">
														<span class="text-xs text-surface-400 w-5 text-right shrink-0">{faza.redoslijed}.</span>
														<div
															class="w-3 h-3 rounded-full shrink-0"
															style="background-color: {faza.boja}"
														></div>
														<span class="text-sm flex-1 truncate">{faza.naziv}</span>
														<span class="badge variant-soft text-xs shrink-0">{faza.broj_dana}d</span>
														{#if faza.opis}
															<span class="text-xs text-surface-400 truncate max-w-[120px]">{faza.opis}</span>
														{/if}
														<div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
															<button class="btn btn-sm variant-ghost px-1.5 py-0.5" on:click={() => otvoriUrediaFazu(faza)} title="Uredi">✏</button>
															<button class="btn btn-sm variant-ghost-error px-1.5 py-0.5" on:click={() => (brisiFazaId = faza.id)} title="Obriši">🗑</button>
														</div>
													</div>

													<!-- Potvrda brisanja faze -->
													{#if brisiFazaId === faza.id}
														<div class="px-2 py-2 rounded bg-error-500/10 space-y-2">
															<p class="text-xs text-error-500">Obrisati fazu "{faza.naziv}"?</p>
															<div class="flex gap-2">
																<button class="btn btn-sm variant-ghost flex-1" on:click={() => (brisiFazaId = null)}>Ne</button>
																<button class="btn btn-sm variant-filled-error flex-1" on:click={obrisiFazu} disabled={fazaLoading}>Da, obriši</button>
															</div>
														</div>
													{/if}
												{/if}
											{/each}
										</div>
									{:else}
										<p class="text-xs text-surface-400">Ova vrsta nema definisane faze uzgoja.</p>
									{/if}

									<!-- Forma za novu fazu -->
									{#if novaFazaZaVrstu === vrsta.id && editFaza === null}
										<div class="card p-3 space-y-2 border border-primary-500/30">
											<p class="text-xs font-medium">Nova faza</p>
											<div class="grid grid-cols-2 gap-2">
												<label class="label col-span-2">
													<span class="text-xs font-medium">Naziv faze *</span>
													<input class="input input-sm" type="text" bind:value={formaFazaNaziv} placeholder="npr. Inkubacija" disabled={fazaLoading} />
												</label>
												<label class="label">
													<span class="text-xs font-medium">Boja</span>
													<div class="flex gap-2 items-center">
														<input type="color" bind:value={formaFazaBoja} class="h-9 w-14 rounded cursor-pointer border border-surface-300" disabled={fazaLoading} />
														<input class="input input-sm flex-1" type="text" bind:value={formaFazaBoja} disabled={fazaLoading} />
													</div>
												</label>
												<label class="label">
													<span class="text-xs font-medium">Broj dana</span>
													<input class="input input-sm" type="number" bind:value={formaFazaDana} min="1" disabled={fazaLoading} />
												</label>
												<label class="label">
													<span class="text-xs font-medium">Redoslijed</span>
													<input class="input input-sm" type="number" bind:value={formaFazaRedoslijed} min="1" disabled={fazaLoading} />
												</label>
												<label class="label">
													<span class="text-xs font-medium">Opis (opt.)</span>
													<input class="input input-sm" type="text" bind:value={formaFazaOpis} placeholder="Bilješka..." disabled={fazaLoading} />
												</label>
											</div>
											{#if fazaError}<p class="text-error-500 text-xs">{fazaError}</p>{/if}
											<div class="flex gap-2">
												<button class="btn btn-sm variant-ghost flex-1" on:click={otkaziFormuFaze} disabled={fazaLoading}>Odustani</button>
												<button class="btn btn-sm variant-filled-primary flex-1" on:click={sacuvajFazu} disabled={fazaLoading || !formaFazaNaziv.trim()}>
													{#if fazaLoading}<span class="animate-spin mr-1">↻</span>{/if}
													Dodaj fazu
												</button>
											</div>
										</div>
									{:else if novaFazaZaVrstu !== vrsta.id || editFaza !== null}
										<button
											class="btn btn-sm variant-ghost-primary w-full text-xs"
											on:click={() => otvoriNovaFaza(vrsta.id, fazePoVrsti[vrsta.id] ?? [])}
										>
											+ Dodaj fazu
										</button>
									{/if}

								{/if}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</section>
</div>
