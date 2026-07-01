<script lang="ts">
	import { onMount } from 'svelte';
	import { user } from '$lib/stores/auth';
	import {
		isAdmin, vrstePtica, adminLoading,
		loadVrstePtica, createVrstaPtica, updateVrstaPtica, deleteVrstaPtica,
		loadFazeZaVrstu, createFaza, updateFaza, deleteFaza,
		loadAllUserTiers, setUserTier, allUserTiers,
		loadAdminUzgajivacnice, adminUpdateAppUrl, adminUzgajivacnice,
		updateVrstaGenetikaPolja,
		genetikaPoljaI18n, loadSvaGenetikaPolja, deleteGenetikaPoljeI18n
	} from '$lib/stores/admin';
	import { TIER_LIMITS } from '$lib/stores/userTier';
	import type { Tier } from '$lib/stores/userTier';
	import { goto } from '$app/navigation';
	import type { VrstaPtica, FazaCiklusa, GenetikaPoljaI18n } from '$lib/db/schema';
	import NovoGenetikaPoljeModal from '$lib/components/NovoGenetikaPoljeModal.svelte';
	import {
		getSchemaForVrsta, type GenetikaPolje, type PoljeTip,
		GENETIKA_SHEME, type VrstaGrupa
	} from '$lib/utils/genetika-schema';

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
	let formaVrstaGrupa = 'ostalo';
	let vrstaLoading = false;
	let vrstaError = '';

	const GRUPA_OPCIJE = [
		{ value: 'ostalo',          label: '— Ostalo (nema posebnih polja)' },
		{ value: 'kanarinac_finke', label: '🐦 Kanarinac / Finke' },
		{ value: 'golubovi',        label: '🕊️ Golubovi' },
		{ value: 'papagaji',        label: '🦜 Papagaji' }
	];

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

	// ── Tier / Korisnici state ───────────────────────────────────
	let tierLoading = false;
	let tierError = '';
	const TIER_OPTIONS: Tier[] = ['free', 'paid_1', 'paid_2', 'paid_3', 'admin'];

	// App URL state
	let appUrlEdit: Record<string, string> = {};
	let appUrlSaving: Record<string, boolean> = {};

	// Genetička polja state
	let novoGenetikaPoljeOpen = false;
	let editGenetikaPolje: GenetikaPoljaI18n | null = null;
	let odabranaGrupa: 'kanarinac_finke' | 'golubovi' | 'papagaji' | 'ostalo' = 'kanarinac_finke';
	let brisiPoljeId: string | null = null;

	async function handleSetTier(userId: string, tier: Tier) {
		tierLoading = true;
		tierError = '';
		try {
			await setUserTier(userId, tier);
		} catch (e) {
			tierError = e instanceof Error ? e.message : 'Greška';
		} finally {
			tierLoading = false;
		}
	}

	async function handleSaveAppUrl(uzId: string) {
		appUrlSaving = { ...appUrlSaving, [uzId]: true };
		try {
			await adminUpdateAppUrl(uzId, appUrlEdit[uzId] ?? '');
		} finally {
			appUrlSaving = { ...appUrlSaving, [uzId]: false };
		}
	}

	async function obrisiGenetikaPolje() {
		if (brisiPoljeId) {
			try {
				await deleteGenetikaPoljeI18n(brisiPoljeId);
			} finally {
				brisiPoljeId = null;
			}
		}
	}

	onMount(async () => {
		if (!isAdmin($user?.email)) return;
		await Promise.all([
			loadVrstePtica(),
			loadAllUserTiers(),
			loadAdminUzgajivacnice(),
			loadSvaGenetikaPolja()
		]);
		// Popuni app_url edit stanja
		$adminUzgajivacnice.forEach((u) => { appUrlEdit[u.id] = u.app_url ?? ''; });
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
		formaVrstaGrupa = 'ostalo';
		vrstaError = '';
		novaVrstaOpen = true;
	}

	function otvoriUrediVrsta(vrsta: VrstaPtica) {
		editVrsta = vrsta;
		formaVrstaNaziv = vrsta.naziv;
		formaVrstaNapomena = vrsta.napomena ?? '';
		formaVrstaGrupa = vrsta.grupa ?? 'ostalo';
		vrstaError = '';
		novaVrstaOpen = true;
	}

	async function sacuvajVrstu() {
		if (!formaVrstaNaziv.trim()) return;
		vrstaLoading = true;
		vrstaError = '';
		try {
			if (editVrsta) {
				await updateVrstaPtica(editVrsta.id, formaVrstaNaziv, formaVrstaNapomena || undefined, formaVrstaGrupa);
			} else {
				await createVrstaPtica(formaVrstaNaziv, formaVrstaNapomena || undefined, formaVrstaGrupa);
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
		fazaError = '';
		try {
			const faza = Object.values(fazePoVrsti).flat().find((f) => f.id === brisiFazaId);
			await deleteFaza(brisiFazaId);
			if (faza) {
				// Eksplicitna reassignacija objekta da triggira Svelte reaktivnost
				fazePoVrsti = {
					...fazePoVrsti,
					[faza.vrsta_ptica_id]: fazePoVrsti[faza.vrsta_ptica_id].filter(
						(f) => f.id !== brisiFazaId
					)
				};
			}
			brisiFazaId = null;
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Greška pri brisanju';
			// FK constraint — faza je korištena u postojećim ciklusima
			if (msg.includes('foreign key') || msg.includes('violates') || msg.includes('aktivnosti')) {
				fazaError = 'Faza se ne može obrisati jer je korištena u postojećim ciklusima uzgoja.';
			} else {
				fazaError = msg;
			}
			// Ne zatvaraj dijalog — prikaži grešku uz dugme
		} finally {
			fazaLoading = false;
		}
	}

	// Ukupno dana (suma) za prikaz u headeru vrste
	function ukupnoDana(faze: FazaCiklusa[]): number {
		return faze.reduce((s, f) => s + f.broj_dana, 0);
	}

	// ── Genetička polja ──────────────────────────────────────────
	let aktivnaPoljaVrstaId: string | null = null;
	let editPoljeData: GenetikaPolje | null = null;
	let formaPoljeNaziv = '';
	let formaPoljeKljuc = '';
	let formaPoljeTip: PoljeTip = 'text';
	let formaPoljeSekcija: 'genetika' | 'ocjena' = 'genetika';
	let formaPoljeOpcije = '';
	let poljeLoading = false;
	let poljeError = '';
	let brisiPoljeKljuc: string | null = null;
	let brisiPoljeVrstaId: string | null = null;

	const TIP_OPCIJE: { value: PoljeTip; label: string }[] = [
		{ value: 'text', label: 'Tekst (sa prijedlozima)' },
		{ value: 'select', label: 'Padajući meni' },
		{ value: 'tags', label: 'Tagovi (više vrijednosti)' },
		{ value: 'stars', label: 'Zvjezdice (ocjena 1–5)' },
		{ value: 'number', label: 'Broj' }
	];

	function tipLabel(tip: string): string {
		return TIP_OPCIJE.find(o => o.value === tip)?.label.split(' ')[0] ?? tip;
	}

	function genKljuc(naziv: string): string {
		return naziv.toLowerCase()
			.replace(/[šŠ]/g, 's').replace(/[čČ]/g, 'c').replace(/[ćĆ]/g, 'c')
			.replace(/[žŽ]/g, 'z').replace(/[đĐ]/g, 'd')
			.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
	}

	function getPoljaZaVrstu(vrsta: VrstaPtica): GenetikaPolje[] {
		return getSchemaForVrsta(vrsta);
	}

	function imaCustomPolja(vrsta: VrstaPtica): boolean {
		const c = vrsta.custom_fields?.genetika_polja;
		return Array.isArray(c) && (c as unknown[]).length > 0;
	}

	function otvoriNovoPolje(vrstaId: string) {
		aktivnaPoljaVrstaId = vrstaId;
		editPoljeData = null;
		formaPoljeNaziv = '';
		formaPoljeKljuc = '';
		formaPoljeTip = 'text';
		formaPoljeSekcija = 'genetika';
		formaPoljeOpcije = '';
		poljeError = '';
	}

	function otvoriUrediPolje(vrstaId: string, polje: GenetikaPolje) {
		aktivnaPoljaVrstaId = vrstaId;
		editPoljeData = polje;
		formaPoljeNaziv = polje.naziv;
		formaPoljeKljuc = polje.kljuc;
		formaPoljeTip = polje.tip;
		formaPoljeSekcija = polje.sekcija;
		formaPoljeOpcije = (polje.opcije ?? []).join(', ');
		poljeError = '';
	}

	function otkaziPolje() {
		aktivnaPoljaVrstaId = null;
		editPoljeData = null;
		poljeError = '';
	}

	async function sacuvajPolje(vrsta: VrstaPtica) {
		if (!formaPoljeNaziv.trim() || !formaPoljeKljuc.trim()) return;
		poljeLoading = true;
		poljeError = '';
		try {
			const novoPolje: GenetikaPolje = {
				kljuc: formaPoljeKljuc.trim(),
				naziv: formaPoljeNaziv.trim(),
				tip: formaPoljeTip,
				sekcija: formaPoljeSekcija,
				opcije: ['select', 'tags'].includes(formaPoljeTip) && formaPoljeOpcije.trim()
					? formaPoljeOpcije.split(',').map(s => s.trim()).filter(Boolean)
					: undefined
			};
			const postojecaPolja = getPoljaZaVrstu(vrsta);
			let novaPolja: GenetikaPolje[];
			if (editPoljeData) {
				novaPolja = postojecaPolja.map(p => p.kljuc === editPoljeData!.kljuc ? novoPolje : p);
			} else {
				if (postojecaPolja.some(p => p.kljuc === novoPolje.kljuc)) {
					poljeError = `Ključ "${novoPolje.kljuc}" već postoji za ovu vrstu.`;
					return;
				}
				novaPolja = [...postojecaPolja, novoPolje];
			}
			await updateVrstaGenetikaPolja(vrsta.id, novaPolja);
			otkaziPolje();
		} catch (err) {
			poljeError = err instanceof Error ? err.message : 'Greška';
		} finally {
			poljeLoading = false;
		}
	}

	async function obrisiPolje() {
		if (!brisiPoljeKljuc || !brisiPoljeVrstaId) return;
		poljeLoading = true;
		try {
			const vrsta = $vrstePtica.find(v => v.id === brisiPoljeVrstaId);
			if (!vrsta) return;
			const novaPolja = getPoljaZaVrstu(vrsta).filter(p => p.kljuc !== brisiPoljeKljuc);
			await updateVrstaGenetikaPolja(vrsta.id, novaPolja);
		} catch (err) {
			poljeError = err instanceof Error ? err.message : 'Greška';
		} finally {
			poljeLoading = false;
			brisiPoljeKljuc = null;
			brisiPoljeVrstaId = null;
		}
	}

	async function ucitajZadaneVrijednosti(vrsta: VrstaPtica) {
		const zadane = GENETIKA_SHEME[(vrsta.grupa as VrstaGrupa) ?? 'ostalo'] ?? [];
		if (!zadane.length) return;
		poljeLoading = true;
		try {
			await updateVrstaGenetikaPolja(vrsta.id, zadane);
		} catch (err) {
			poljeError = err instanceof Error ? err.message : 'Greška';
		} finally {
			poljeLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Administracija – HatchPlan</title>
</svelte:head>

<div class="container mx-auto p-4 space-y-5 max-w-3xl">

	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h2 class="h3 font-bold">🔧 Administracija</h2>
			<p class="text-sm text-surface-500">Upravljanje korisnicima, vrstama ptica i fazama</p>
		</div>
		<a href="/kavezi" class="btn btn-sm variant-ghost-surface">← Nazad</a>
	</div>

	<!-- ── Korisnici / Tierovi ──────────────────────────────── -->
	<section class="space-y-3">
		<h3 class="h4 font-bold">👤 Korisnici</h3>

		{#if tierError}
			<aside class="alert variant-filled-error py-2 px-3 text-sm"><p>{tierError}</p></aside>
		{/if}

		<div class="card overflow-hidden">
			<table class="table table-compact w-full text-sm">
				<thead>
					<tr>
						<th>Email</th>
						<th>Tier</th>
						<th>Limiti</th>
					</tr>
				</thead>
				<tbody>
					{#each $allUserTiers as row (row.user_id)}
						<tr>
							<td class="font-mono text-xs">{row.email}</td>
							<td>
								<select
									class="select select-sm text-xs py-0.5"
									value={row.tier}
									disabled={tierLoading}
									on:change={(e) => handleSetTier(row.user_id, /** @type {Tier} */ (e.currentTarget.value))}
								>
									{#each TIER_OPTIONS as t}
										<option value={t}>{TIER_LIMITS[t].label}</option>
									{/each}
								</select>
							</td>
							<td class="text-xs text-surface-500">
								{#if TIER_LIMITS[row.tier].max_ptice !== null}
									{TIER_LIMITS[row.tier].max_uzgajivacnice} uzg. / {TIER_LIMITS[row.tier].max_ptice} ptica
								{:else}
									Neograničeno
								{/if}
							</td>
						</tr>
					{/each}
					{#if $allUserTiers.length === 0}
						<tr><td colspan="3" class="text-center text-surface-400 py-4">Nema korisnika</td></tr>
					{/if}
				</tbody>
			</table>
		</div>
	</section>

	<!-- ── App URL (QR kodovi) ──────────────────────────────── -->
	<section class="space-y-3">
		<h3 class="h4 font-bold">🔗 App URL (za QR kodove)</h3>
		<p class="text-sm text-surface-500">Ovo polje određuje URL koji se upisuje u QR kod na rodovnicima. Vidljivo samo adminu.</p>

		<div class="space-y-2">
			{#each $adminUzgajivacnice as uz (uz.id)}
				<div class="card p-3 flex gap-3 items-center">
					<div class="flex-1 min-w-0">
						<p class="text-sm font-medium truncate">{uz.naziv}</p>
						<p class="text-xs text-surface-400 font-mono truncate">{uz.user_id.slice(0, 8)}…</p>
					</div>
					<input
						class="input input-sm font-mono text-xs flex-1"
						type="url"
						placeholder="https://..."
						bind:value={appUrlEdit[uz.id]}
					/>
					<button
						class="btn btn-sm variant-filled-primary shrink-0"
						disabled={appUrlSaving[uz.id]}
						on:click={() => handleSaveAppUrl(uz.id)}
					>
						{appUrlSaving[uz.id] ? '↻' : 'Spremi'}
					</button>
				</div>
			{/each}
			{#if $adminUzgajivacnice.length === 0}
				<p class="text-sm text-surface-400 text-center py-4">Nema uzgajivačnica</p>
			{/if}
		</div>
	</section>

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
					<span class="text-xs font-medium">Kategorija (grupa polja)</span>
					<select class="select select-sm" bind:value={formaVrstaGrupa} disabled={vrstaLoading}>
						{#each GRUPA_OPCIJE as opt}
							<option value={opt.value}>{opt.label}</option>
						{/each}
					</select>
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
								{#if vrsta.grupa && vrsta.grupa !== 'ostalo'}
									<span class="badge variant-filled-secondary text-xs shrink-0">{vrsta.grupa}</span>
								{/if}
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
															<p class="text-xs text-error-500 font-medium">Obrisati fazu "{faza.naziv}"?</p>
															{#if fazaError}
																<p class="text-xs text-error-600 bg-error-100 rounded px-2 py-1">{fazaError}</p>
															{/if}
															<div class="flex gap-2">
																<button class="btn btn-sm variant-ghost flex-1" on:click={() => { brisiFazaId = null; fazaError = ''; }}>Ne</button>
																{#if !fazaError}
																	<button class="btn btn-sm variant-filled-error flex-1" on:click={obrisiFazu} disabled={fazaLoading}>
																		{#if fazaLoading}<span class="animate-spin mr-1">↻</span>{/if}
																		Da, obriši
																	</button>
																{/if}
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

							<!-- ── Genetička polja ─────────────────────── -->
							<div class="border-t border-surface-200-700-token pt-3 mt-1 space-y-2">
								<div class="flex items-center justify-between">
									<p class="text-xs font-semibold text-surface-500 uppercase tracking-wide">🧬 Genetička polja</p>
									<div class="flex gap-1">
										{#if !imaCustomPolja(vrsta) && (GENETIKA_SHEME[(vrsta.grupa || 'ostalo')] ?? []).length > 0}
											<button
												class="btn btn-xs variant-ghost-secondary text-xs"
												on:click={() => ucitajZadaneVrijednosti(vrsta)}
												disabled={poljeLoading}
											>
												Učitaj zadane →
											</button>
										{/if}
										{#if aktivnaPoljaVrstaId !== vrsta.id}
											<button
												class="btn btn-xs variant-ghost-primary text-xs"
												on:click={() => otvoriNovoPolje(vrsta.id)}
											>
												+ Dodaj polje
											</button>
										{/if}
									</div>
								</div>

								{#if !imaCustomPolja(vrsta)}
									<p class="text-xs text-surface-400 italic">
										Koriste se zadane vrijednosti po grupi "{vrsta.grupa ?? 'ostalo'}".
										Klikni "Učitaj zadane →" da ih prebaciš ovdje i urediš.
									</p>
								{:else}
									<!-- Lista polja grupiranih po sekciji -->
									{@const polja = getPoljaZaVrstu(vrsta)}
									{@const genetikaPolja = polja.filter(p => p.sekcija === 'genetika')}
									{@const ocjenaPolja = polja.filter(p => p.sekcija === 'ocjena')}

									{#if genetikaPolja.length > 0}
										<p class="text-xs text-surface-500 font-medium">Genetika i izgled</p>
										<div class="space-y-1">
											{#each genetikaPolja as polje}
												{#if brisiPoljeKljuc === polje.kljuc && brisiPoljeVrstaId === vrsta.id}
													<div class="px-2 py-2 rounded bg-error-500/10 space-y-2">
														<p class="text-xs text-error-500">Obrisati polje "{polje.naziv}"?</p>
														<div class="flex gap-2">
															<button class="btn btn-xs variant-ghost flex-1" on:click={() => { brisiPoljeKljuc = null; brisiPoljeVrstaId = null; }}>Ne</button>
															<button class="btn btn-xs variant-filled-error flex-1" on:click={obrisiPolje} disabled={poljeLoading}>Da</button>
														</div>
													</div>
												{:else}
													<div class="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface-100-800-token group text-xs">
														<span class="font-mono text-surface-400 shrink-0">{polje.kljuc}</span>
														<span class="flex-1 truncate font-medium">{polje.naziv}</span>
														<span class="badge variant-soft text-xs shrink-0">{tipLabel(polje.tip)}</span>
														{#if polje.opcije?.length}
															<span class="text-surface-400 truncate max-w-[100px]">{polje.opcije.slice(0,3).join(', ')}{polje.opcije.length > 3 ? '…' : ''}</span>
														{/if}
														<div class="flex gap-1 opacity-0 group-hover:opacity-100 shrink-0">
															<button class="btn btn-xs variant-ghost px-1" on:click={() => otvoriUrediPolje(vrsta.id, polje)}>✏</button>
															<button class="btn btn-xs variant-ghost-error px-1" on:click={() => { brisiPoljeKljuc = polje.kljuc; brisiPoljeVrstaId = vrsta.id; }}>🗑</button>
														</div>
													</div>
												{/if}
											{/each}
										</div>
									{/if}

									{#if ocjenaPolja.length > 0}
										<p class="text-xs text-surface-500 font-medium mt-2">Ocjena kvaliteta</p>
										<div class="space-y-1">
											{#each ocjenaPolja as polje}
												{#if brisiPoljeKljuc === polje.kljuc && brisiPoljeVrstaId === vrsta.id}
													<div class="px-2 py-2 rounded bg-error-500/10 space-y-2">
														<p class="text-xs text-error-500">Obrisati polje "{polje.naziv}"?</p>
														<div class="flex gap-2">
															<button class="btn btn-xs variant-ghost flex-1" on:click={() => { brisiPoljeKljuc = null; brisiPoljeVrstaId = null; }}>Ne</button>
															<button class="btn btn-xs variant-filled-error flex-1" on:click={obrisiPolje} disabled={poljeLoading}>Da</button>
														</div>
													</div>
												{:else}
													<div class="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface-100-800-token group text-xs">
														<span class="font-mono text-surface-400 shrink-0">{polje.kljuc}</span>
														<span class="flex-1 truncate font-medium">{polje.naziv}</span>
														<span class="badge variant-soft-warning text-xs shrink-0">{tipLabel(polje.tip)}</span>
														<div class="flex gap-1 opacity-0 group-hover:opacity-100 shrink-0">
															<button class="btn btn-xs variant-ghost px-1" on:click={() => otvoriUrediPolje(vrsta.id, polje)}>✏</button>
															<button class="btn btn-xs variant-ghost-error px-1" on:click={() => { brisiPoljeKljuc = polje.kljuc; brisiPoljeVrstaId = vrsta.id; }}>🗑</button>
														</div>
													</div>
												{/if}
											{/each}
										</div>
									{/if}
								{/if}

								<!-- Forma za novo/uredi polje -->
								{#if aktivnaPoljaVrstaId === vrsta.id}
									<div class="card p-3 space-y-2 border border-secondary-500/30 mt-2">
										<p class="text-xs font-medium">{editPoljeData ? 'Uredi polje' : 'Novo polje'}</p>
										<div class="grid grid-cols-2 gap-2">
											<label class="label col-span-2">
												<span class="text-xs font-medium">Naziv *</span>
												<input
													class="input input-sm"
													type="text"
													bind:value={formaPoljeNaziv}
													placeholder="npr. Vizuelna mutacija"
													on:input={() => { if (!editPoljeData) formaPoljeKljuc = genKljuc(formaPoljeNaziv); }}
													disabled={poljeLoading}
												/>
											</label>
											<label class="label col-span-2">
												<span class="text-xs font-medium">Ključ (ID) *</span>
												<input
													class="input input-sm font-mono text-xs"
													type="text"
													bind:value={formaPoljeKljuc}
													placeholder="vizuelna_mutacija"
													disabled={poljeLoading || !!editPoljeData}
												/>
											</label>
											<label class="label">
												<span class="text-xs font-medium">Tip</span>
												<select class="select select-sm" bind:value={formaPoljeTip} disabled={poljeLoading}>
													{#each TIP_OPCIJE as opt}
														<option value={opt.value}>{opt.label}</option>
													{/each}
												</select>
											</label>
											<label class="label">
												<span class="text-xs font-medium">Sekcija</span>
												<select class="select select-sm" bind:value={formaPoljeSekcija} disabled={poljeLoading}>
													<option value="genetika">Genetika i izgled</option>
													<option value="ocjena">Ocjena kvaliteta</option>
												</select>
											</label>
											{#if formaPoljeTip === 'select' || formaPoljeTip === 'tags'}
												<label class="label col-span-2">
													<span class="text-xs font-medium">Opcije (odvojene zarezom)</span>
													<input
														class="input input-sm"
														type="text"
														bind:value={formaPoljeOpcije}
														placeholder="Opcija 1, Opcija 2, Opcija 3"
														disabled={poljeLoading}
													/>
												</label>
											{/if}
										</div>
										{#if poljeError}
											<p class="text-error-500 text-xs">{poljeError}</p>
										{/if}
										<div class="flex gap-2">
											<button class="btn btn-sm variant-ghost flex-1" on:click={otkaziPolje} disabled={poljeLoading}>Odustani</button>
											<button
												class="btn btn-sm variant-filled-secondary flex-1"
												on:click={() => sacuvajPolje(vrsta)}
												disabled={poljeLoading || !formaPoljeNaziv.trim() || !formaPoljeKljuc.trim()}
											>
												{#if poljeLoading}<span class="animate-spin mr-1">↻</span>{/if}
												{editPoljeData ? 'Sačuvaj' : 'Dodaj'}
											</button>
										</div>
									</div>
								{/if}
							</div>

						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</section>

	<!-- ── Genetička polja sa prevodima (17 jezika) ──────────────── -->
	<section class="space-y-3">
		<h3 class="h4 font-bold">🧬 Genetička Polja (Prevodi)</h3>
		<p class="text-sm text-surface-500">Upravljanje genetičkim poljima sa prevodima na sve 17 dostupnih jezika</p>

		<!-- Tab-ovi za grupu -->
		<div class="flex gap-2 flex-wrap">
			{#each [
				{ value: 'kanarinac_finke', label: '🐦 Kanarinac / Finke' },
				{ value: 'golubovi', label: '🕊️ Golubovi' },
				{ value: 'papagaji', label: '🦜 Papagaji' },
				{ value: 'ostalo', label: '❓ Ostalo' }
			] as grupa}
				<button
					class="btn btn-sm"
					class:variant-filled-primary={odabranaGrupa === grupa.value}
					class:variant-ghost={odabranaGrupa !== grupa.value}
					on:click={() => odabranaGrupa = grupa.value}
				>
					{grupa.label}
				</button>
			{/each}
		</div>

		<!-- Polja za odabranu grupu -->
		{@const poljaGrupe = $genetikaPoljaI18n.filter(p => p.vrsta_grupa === odabranaGrupa)}
		{@const genetikaPolja = poljaGrupe.filter(p => p.sekcija === 'genetika')}
		{@const ocjenaPolja = poljaGrupe.filter(p => p.sekcija === 'ocjena')}

		{#if genetikaPolja.length > 0 || ocjenaPolja.length > 0}
			<div class="card p-4 space-y-4">
				{#if genetikaPolja.length > 0}
					<div class="space-y-2">
						<p class="text-sm font-semibold text-surface-500 uppercase tracking-wide">Genetika i izgled</p>
						<div class="space-y-1">
							{#each genetikaPolja as polje}
								{#if brisiPoljeId === polje.id}
									<div class="px-3 py-2 rounded bg-error-500/10 space-y-2">
										<p class="text-xs text-error-500">Obrisati polje "{polje.polje_kljuc}"?</p>
										<div class="flex gap-2">
											<button class="btn btn-xs variant-ghost flex-1" on:click={() => brisiPoljeId = null}>Ne</button>
											<button class="btn btn-xs variant-filled-error flex-1" on:click={obrisiGenetikaPolje}>Da</button>
										</div>
									</div>
								{:else}
									<div class="flex items-center gap-3 px-3 py-2 rounded hover:bg-surface-100-800-token group text-xs">
										<span class="font-mono text-surface-400 shrink-0 w-24">{polje.polje_kljuc}</span>
										<div class="flex-1 min-w-0">
											<p class="font-medium truncate">{polje.nazivi_jezicima?.bs ?? polje.polje_kljuc}</p>
											<p class="text-surface-400 text-xs">Tip: {polje.tip} | Redoslijed: {polje.redoslijed}</p>
										</div>
										<button
											class="btn btn-xs variant-ghost-error opacity-0 group-hover:opacity-100 transition-opacity"
											on:click={() => brisiPoljeId = polje.id}
										>
											Obriši
										</button>
									</div>
								{/if}
							{/each}
						</div>
					</div>
				{/if}

				{#if ocjenaPolja.length > 0}
					<div class="space-y-2 border-t border-surface-200-700-token pt-4">
						<p class="text-sm font-semibold text-surface-500 uppercase tracking-wide">Ocjena kvaliteta</p>
						<div class="space-y-1">
							{#each ocjenaPolja as polje}
								{#if brisiPoljeId === polje.id}
									<div class="px-3 py-2 rounded bg-error-500/10 space-y-2">
										<p class="text-xs text-error-500">Obrisati polje "{polje.polje_kljuc}"?</p>
										<div class="flex gap-2">
											<button class="btn btn-xs variant-ghost flex-1" on:click={() => brisiPoljeId = null}>Ne</button>
											<button class="btn btn-xs variant-filled-error flex-1" on:click={obrisiGenetikaPolje}>Da</button>
										</div>
									</div>
								{:else}
									<div class="flex items-center gap-3 px-3 py-2 rounded hover:bg-surface-100-800-token group text-xs">
										<span class="font-mono text-surface-400 shrink-0 w-24">{polje.polje_kljuc}</span>
										<div class="flex-1 min-w-0">
											<p class="font-medium truncate">{polje.nazivi_jezicima?.bs ?? polje.polje_kljuc}</p>
											<p class="text-surface-400 text-xs">Tip: {polje.tip} | Redoslijed: {polje.redoslijed}</p>
										</div>
										<button
											class="btn btn-xs variant-ghost-error opacity-0 group-hover:opacity-100 transition-opacity"
											on:click={() => brisiPoljeId = polje.id}
										>
											Obriši
										</button>
									</div>
								{/if}
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{:else}
			<p class="text-sm text-surface-400 italic px-3 py-2">
				Nema genetičkih polja za grupu "{odabranaGrupa}". Klikni dugme ispod da dodaš nova.
			</p>
		{/if}

		<button
			class="btn variant-filled-primary w-full"
			on:click={() => novoGenetikaPoljeOpen = true}
		>
			+ Dodaj novo genetičko polje
		</button>
	</section>

	{#if novoGenetikaPoljeOpen}
		<NovoGenetikaPoljeModal
			vrstaGrupa={odabranaGrupa}
			editPolje={editGenetikaPolje}
			onClose={() => { novoGenetikaPoljeOpen = false; editGenetikaPolje = null; }}
			onSuccess={() => {
				novoGenetikaPoljeOpen = false;
				editGenetikaPolje = null;
				loadSvaGenetikaPolja();
			}}
		/>
	{/if}
</div>
