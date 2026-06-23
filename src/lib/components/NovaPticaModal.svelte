<script lang="ts">
	import { createPtica, updatePtica, pticeMuzjaci, pticeSenke } from '$lib/stores/ptice';
	import type { Ptica, VrstaPtica } from '$lib/db/schema';
	import { t } from '$lib/i18n';
	import SlikaUnos from './SlikaUnos.svelte';
	import GenetikaPolja from './GenetikaPolja.svelte';
	import { getGrupaShema } from '$lib/utils/genetika-schema';

	export let userId: string;
	export let uzgajivacnicaId: string = '';
	export let vrstePtica: VrstaPtica[] = [];
	export let editPtica: Ptica | null = null; // null = kreiranje, Ptica = uređivanje
	export let onClose: () => void;
	export let onSuccess: () => void;
	export let prstenPrefiks: string = '';

	// Popuni polja ako je mod uređivanje
	let spol: 'M' | 'Ž' | '?' = editPtica?.spol ?? 'M';
	let vrstaId = editPtica?.vrsta_ptica_id ?? '';
	let naziv = editPtica?.naziv ?? '';
	let prstenaOznaka = editPtica?.prstena_oznaka ?? (editPtica ? '' : prstenPrefiks);
	let prstenRedniBroj: number | '' = editPtica?.prsten_redni_broj ?? '';
	let datumRodjenja = editPtica?.datum_rodjenja ?? '';
	let godina: number | '' = editPtica?.godina ?? '';
	let boja = editPtica?.boja ?? '';
	let statusPtica = editPtica?.status_ptica ?? '';
	let statusEvidencije: 'aktivna' | 'mlada' | 'uginula' | 'prodata' | 'poklonjena' | 'ostalo' =
		editPtica?.status_evidencije ?? 'aktivna';
	let otacId = editPtica?.otac_id ?? '';
	let majkaId = editPtica?.majka_id ?? '';
	let napomena = editPtica?.napomena ?? '';
	let rezultati = editPtica?.rezultati ?? '';
	let napomenaRodovnik = editPtica?.napomena_rodovnik ?? '';
	let slikaUrl: string | undefined = editPtica?.slika_url;
	let loading = false;
	let errorMsg = '';
	let rodovnikOtvoren = !!(editPtica?.otac_id || editPtica?.majka_id);
	let rodovnikPodaciOtvoreni = !!(editPtica?.rezultati || editPtica?.napomena_rodovnik || editPtica?.slika_url || editPtica?.boja || editPtica?.status_ptica);

	let slikaKomponenta: SlikaUnos;
	let genetika: Record<string, unknown> = editPtica?.genetika ?? {};
	let genetikaOtvorena = !!(editPtica?.genetika && Object.keys(editPtica.genetika).length > 0);
	let prijedlogPrimjenjen = false;

	// Auto-popuni godinu iz datuma rodjenja (samo ako godina još nije unesena)
	$: if (datumRodjenja && godina === '') {
		const y = new Date(datumRodjenja).getFullYear();
		if (y > 2000) godina = y;
	}

	// Isključi samu pticu iz dropdown roditelja (edit mod)
	$: dostupniOcevi = $pticeMuzjaci.filter((p) => p.id !== editPtica?.id);
	$: dostupneMajke = $pticeSenke.filter((p) => p.id !== editPtica?.id);

	// Odabrana vrsta i njena schema
	$: odabranaVrsta = vrstePtica.find(v => v.id === vrstaId);
	$: vrstaGrupa = odabranaVrsta?.grupa ?? 'ostalo';
	$: genetikaShema = getGrupaShema(vrstaGrupa);
	$: imaGenetikaPolja = genetikaShema.length > 0;

	// Roditelji za auto-fill prijedlog
	$: otacObj = otacId ? $pticeMuzjaci.find(p => p.id === otacId) : null;
	$: majkaObj = majkaId ? $pticeSenke.find(p => p.id === majkaId) : null;
	$: imaRoditeljskuGenetiku = !!(
		(otacObj?.genetika && Object.keys(otacObj.genetika).length) ||
		(majkaObj?.genetika && Object.keys(majkaObj.genetika).length)
	);

	function predloziGenetiku() {
		const prijedlog: Record<string, unknown> = {};

		// Prikupi mutacije od oba roditelja kao potencijalne skrivene mutacije djeteta
		const mutacije = new Set<string>();
		for (const roditelj of [otacObj, majkaObj]) {
			const g = roditelj?.genetika;
			if (!g) continue;
			if (typeof g.vizuelna_mutacija === 'string' && g.vizuelna_mutacija)
				mutacije.add(g.vizuelna_mutacija);
			const skrivene = g.skrivena_mutacija;
			if (Array.isArray(skrivene)) skrivene.forEach(m => { if (m) mutacije.add(m as string); });
		}
		if (mutacije.size > 0) prijedlog.skrivena_mutacija = [...mutacije];

		// Specijalizacija (golubovi) — preuzmi od roditelja ako postoji
		const spec = otacObj?.genetika?.specijalizacija || majkaObj?.genetika?.specijalizacija;
		if (spec) prijedlog.specijalizacija = spec;

		// Ocjene — prosječna vrijednost od dostupnih roditelja
		for (const kljuc of ['ocjena_stav', 'ocjena_perje', 'ocjena_orijentacija', 'ocjena_konstitucija']) {
			const vals = [otacObj?.genetika?.[kljuc], majkaObj?.genetika?.[kljuc]]
				.filter(v => typeof v === 'number' && (v as number) > 0) as number[];
			if (vals.length > 0)
				prijedlog[kljuc] = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
		}

		genetika = { ...genetika, ...prijedlog };
		prijedlogPrimjenjen = true;
		genetikaOtvorena = true;
	}

	$: naslov = editPtica ? t.ptice.urediPticuTitle : t.ptice.novaPticaTitle;

	async function handleSubmit() {
		if (!vrstaId) { errorMsg = t.ptice.odaberiteVrstuGreska; return; }
		loading = true;
		errorMsg = '';

		try {
				const finalSlikaUrl = slikaKomponenta ? await slikaKomponenta.saveImage() : slikaUrl;

			const zajednickiPodaci = {
				spol,
				vrsta_ptica_id: vrstaId,
				naziv: naziv.trim() || undefined,
				prstena_oznaka: prstenaOznaka.trim() || undefined,
				prsten_redni_broj: prstenRedniBroj !== '' ? Number(prstenRedniBroj) : undefined,
				datum_rodjenja: datumRodjenja || undefined,
				godina: godina !== '' ? Number(godina) : undefined,
				boja: boja.trim() || undefined,
				status_ptica: statusPtica.trim() || undefined,
				status_evidencije: statusEvidencije,
				otac_id: otacId || undefined,
				majka_id: majkaId || undefined,
				napomena: napomena.trim() || undefined,
				rezultati: rezultati.trim() || undefined,
				napomena_rodovnik: napomenaRodovnik.trim() || undefined,
				slika_url: finalSlikaUrl || undefined,
				genetika: Object.keys(genetika).length > 0 ? genetika : undefined
			};

			if (editPtica) {
				await updatePtica(editPtica.id, zajednickiPodaci);
			} else {
				await createPtica(userId, {
					...zajednickiPodaci,
					user_id: userId,
					uzgajivacnica_id: uzgajivacnicaId || undefined
				});
			}

			onSuccess();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : t.ptice.greska;
		} finally {
			loading = false;
		}
	}
</script>

<div
	class="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4"
	role="presentation"
	on:click|self={onClose}
	on:keydown={(e) => e.key === 'Escape' && onClose()}
>
	<div class="card w-full max-w-md p-6 space-y-5 max-h-[90vh] overflow-y-auto">
		<header class="flex items-center justify-between">
			<h3 class="h4 font-bold">{naslov}</h3>
			<button class="btn-icon btn-icon-sm variant-ghost" on:click={onClose} disabled={loading}>
				{t.modali.zatvoriBtnTitle}
			</button>
		</header>

		{#if vrstePtica.length === 0}
			<aside class="alert variant-soft-warning">
				<div class="alert-message">
					<p class="font-semibold">{t.ptice.katalogPrazan}</p>
					<p class="text-sm">
						{t.ptice.katalogPrazanOpis} <code>002_seed_vrsta_ptica.sql</code> u Supabase dashboardu.
					</p>
				</div>
			</aside>
			<button class="btn variant-ghost w-full" on:click={onClose}>{t.common.zatvori}</button>
		{:else}
			<form class="space-y-4" on:submit|preventDefault={handleSubmit}>

				<!-- Spol: pill radio dugmad -->
				<fieldset>
					<legend class="text-sm font-medium mb-2">{t.ptice.spol}</legend>
					<div class="flex gap-2">
						{#each [['M', t.ptice.spolMuzjak], ['Ž', t.ptice.spolZenka], ['?', t.ptice.spolNepoznat]] as [val, label]}
							<label
								class="flex-1 btn btn-sm cursor-pointer {spol === val
									? 'variant-filled-primary'
									: 'variant-soft'}"
							>
								<input
									type="radio"
									bind:group={spol}
									value={val}
									class="sr-only"
									disabled={loading}
								/>
								{label}
							</label>
						{/each}
					</div>
				</fieldset>

				<!-- Vrsta -->
				<label class="label">
					<span class="text-sm font-medium">{t.ptice.vrsta} <span class="text-error-500">{t.ptice.vrstaRequired}</span></span>
					<select class="select" bind:value={vrstaId} required disabled={loading}>
						<option value="" disabled>{t.ptice.odaberiteVrstu}</option>
						{#each vrstePtica as vrsta (vrsta.id)}
							<option value={vrsta.id}>{vrsta.naziv}</option>
						{/each}
					</select>
				</label>

				<!-- Naziv -->
				<label class="label">
					<span class="text-sm font-medium">{t.ptice.naziv}</span>
					<input
						class="input"
						type="text"
						bind:value={naziv}
						placeholder={t.ptice.nazivPlaceholder}
						disabled={loading}
					/>
				</label>

				<!-- Prsten: oznaka + redni broj -->
				<div class="grid grid-cols-[1fr_auto] gap-3 items-end">
					<label class="label">
						<span class="text-sm font-medium">{t.ptice.prstenaOznaka}</span>
						<input
							class="input"
							type="text"
							bind:value={prstenaOznaka}
							placeholder={t.ptice.prstenaOznakaPlaceholder}
							disabled={loading}
						/>
					</label>
					<label class="label w-24">
						<span class="text-sm font-medium">{t.ptice.prstenRedniBroj}</span>
						<input
							class="input"
							type="number"
							min="1"
							bind:value={prstenRedniBroj}
							placeholder={t.ptice.prstenRedniBrojPlaceholder}
							disabled={loading}
						/>
					</label>
				</div>

				<!-- Datum rođenja + godina uzgoja -->
				<div class="grid grid-cols-2 gap-3">
					<label class="label">
						<span class="text-sm font-medium">{t.ptice.datumRodjenja}</span>
						<input class="input" type="date" bind:value={datumRodjenja} disabled={loading} />
					</label>
					<label class="label">
						<span class="text-sm font-medium">{t.ptice.godinaUzgoja}</span>
						<input
							class="input"
							type="number"
							min="2000"
							max="2099"
							bind:value={godina}
							placeholder={t.ptice.godinaUzgojaPlaceholder}
							disabled={loading}
						/>
					</label>
				</div>

				<!-- Dostupnost za parove -->
				<label class="label">
					<span class="text-sm font-medium">Dostupnost za parove</span>
					<select class="select" bind:value={statusEvidencije} disabled={loading}>
						<option value="aktivna">✅ Aktivna — može biti u parovima</option>
						<option value="mlada">🐤 Mlada ptica — nije za parove još</option>
						<option value="vanjska">🔗 Vanjska ptica — tuđa, samo za rodovnik</option>
						<option value="uginula">💀 Uginula</option>
						<option value="prodata">💰 Prodata</option>
						<option value="poklonjena">🎁 Poklonjena</option>
						<option value="ostalo">📝 Ostalo</option>
					</select>
				</label>

				<!-- Rodovnik (collapsible) -->
				<div class="space-y-2">
					<button
						type="button"
						class="btn btn-sm variant-ghost w-full justify-between"
						on:click={() => (rodovnikOtvoren = !rodovnikOtvoren)}
						disabled={loading}
					>
						<span class="text-sm">{t.ptice.rodovnik}</span>
						<span>{rodovnikOtvoren ? '▲' : '▼'}</span>
					</button>

					{#if rodovnikOtvoren}
						<div class="card variant-soft p-3 space-y-3">
							<label class="label">
								<span class="text-sm">{t.ptice.otac}</span>
								<select class="select select-sm" bind:value={otacId} disabled={loading}>
									<option value="">{t.ptice.nijePozan}</option>
									{#each dostupniOcevi as ptica (ptica.id)}
										<option value={ptica.id}>
											{ptica.naziv || ptica.prstena_oznaka || ptica.id.slice(0, 8)}
										</option>
									{/each}
								</select>
							</label>
							<label class="label">
								<span class="text-sm">{t.ptice.majka}</span>
								<select class="select select-sm" bind:value={majkaId} disabled={loading}>
									<option value="">{t.ptice.nijePozdnata}</option>
									{#each dostupneMajke as ptica (ptica.id)}
										<option value={ptica.id}>
											{ptica.naziv || ptica.prstena_oznaka || ptica.id.slice(0, 8)}
										</option>
									{/each}
								</select>
							</label>
						</div>
					{/if}
				</div>

				<!-- Napomena -->
				<label class="label">
					<span class="text-sm font-medium">{t.common.napomenaOpt}</span>
					<textarea
						class="textarea text-sm"
						rows="2"
						bind:value={napomena}
						placeholder={t.ptice.napomenaPlaceholder}
						disabled={loading}
					/>
				</label>

				<!-- Rodovnik podaci (collapsible) -->
				<div class="space-y-2">
					<button
						type="button"
						class="btn btn-sm variant-ghost w-full justify-between"
						on:click={() => (rodovnikPodaciOtvoreni = !rodovnikPodaciOtvoreni)}
						disabled={loading}
					>
						<span class="text-sm">{t.ptice.rodovnikSekcija}</span>
						<span>{rodovnikPodaciOtvoreni ? '▲' : '▼'}</span>
					</button>
					{#if rodovnikPodaciOtvoreni}
						<div class="card variant-soft p-3 space-y-3">
							<SlikaUnos
								bind:this={slikaKomponenta}
								bind:slika_url={slikaUrl}
								bucket="ptice"
								{userId}
								disabled={loading}
								label={t.ptice.slika}
							/>
							<div class="grid grid-cols-2 gap-3">
								<label class="label">
									<span class="text-sm">Boja / Mutacija</span>
									<input
										class="input"
										type="text"
										bind:value={boja}
										placeholder="npr. bijela, šarena..."
										disabled={loading}
									/>
								</label>
								<label class="label">
									<span class="text-sm">Status</span>
									<input
										class="input"
										type="text"
										bind:value={statusPtica}
										placeholder="npr. aktivan, prodan..."
										disabled={loading}
									/>
								</label>
							</div>
							<label class="label">
								<span class="text-sm">{t.ptice.rezultati}</span>
								<textarea
									class="textarea text-sm font-mono"
									rows="4"
									bind:value={rezultati}
									placeholder={t.ptice.rezultatiPlaceholder}
									disabled={loading}
								/>
							</label>
							<label class="label">
								<span class="text-sm">{t.ptice.napomenaRodovnik}</span>
								<textarea
									class="textarea text-sm"
									rows="3"
									bind:value={napomenaRodovnik}
									placeholder={t.ptice.napomenaRodovnikPlaceholder}
									disabled={loading}
								/>
							</label>
						</div>
					{/if}
				</div>

				<!-- Genetika i ocjene (dinamički po vrsti) -->
				{#if imaGenetikaPolja}
					<div class="space-y-2">
						<button
							type="button"
							class="btn btn-sm variant-ghost w-full justify-between"
							on:click={() => (genetikaOtvorena = !genetikaOtvorena)}
							{disabled}
						>
							<span class="text-sm">🧬 Genetika i ocjene</span>
							<span>{genetikaOtvorena ? '▲' : '▼'}</span>
						</button>

						{#if genetikaOtvorena}
							<div class="card variant-soft p-3 space-y-4">
								<!-- Auto-fill prijedlog iz roditelja -->
								{#if imaRoditeljskuGenetiku && !prijedlogPrimjenjen}
									<div class="flex items-center justify-between p-2 rounded-lg variant-soft-secondary">
										<span class="text-xs">🌳 Roditelji imaju genetičke podatke</span>
										<button
											type="button"
											class="btn btn-sm variant-filled-secondary"
											on:click={predloziGenetiku}
											{disabled}
										>
											Preuzmi prijedlog →
										</button>
									</div>
								{/if}
								{#if prijedlogPrimjenjen}
									<p class="text-xs text-success-600">✓ Prijedlog iz roditelja primijenjen — provjeri i po potrebi izmijeni.</p>
								{/if}

								<GenetikaPolja
									polja={genetikaShema}
									bind:genetika
									{disabled}
								/>
							</div>
						{/if}
					</div>
				{/if}

				{#if errorMsg}
					<aside class="alert variant-filled-error py-2 px-3 text-sm">
						<p>{errorMsg}</p>
					</aside>
				{/if}

				<div class="flex gap-3 pt-1">
					<button
						class="btn variant-ghost flex-1"
						type="button"
						on:click={onClose}
						disabled={loading}
					>
						{t.common.odustani}
					</button>
					<button
						class="btn variant-filled-primary flex-1"
						type="submit"
						disabled={loading || !vrstaId}
					>
						{#if loading}<span class="animate-spin mr-2">↻</span>{/if}
						{editPtica ? t.common.sacuvajIzmjene : t.ptice.dodajPticu}
					</button>
				</div>
			</form>
		{/if}
	</div>
</div>
