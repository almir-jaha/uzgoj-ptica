<script lang="ts">
	import { createPtica, updatePtica, pticeMuzjaci, pticeSenke } from '$lib/stores/ptice';
	import type { Ptica, VrstaPtica } from '$lib/db/schema';
	import { t } from '$lib/i18n';

	export let userId: string;
	export let vrstePtica: VrstaPtica[] = [];
	export let editPtica: Ptica | null = null; // null = kreiranje, Ptica = uređivanje
	export let onClose: () => void;
	export let onSuccess: () => void;

	// Popuni polja ako je mod uređivanje
	let spol: 'M' | 'Ž' | '?' = editPtica?.spol ?? 'M';
	let vrstaId = editPtica?.vrsta_ptica_id ?? '';
	let naziv = editPtica?.naziv ?? '';
	let prstenaOznaka = editPtica?.prstena_oznaka ?? '';
	let datumRodjenja = editPtica?.datum_rodjenja ?? '';
	let otacId = editPtica?.otac_id ?? '';
	let majkaId = editPtica?.majka_id ?? '';
	let napomena = editPtica?.napomena ?? '';
	let loading = false;
	let errorMsg = '';
	let rodovnikOtvoren = !!(editPtica?.otac_id || editPtica?.majka_id);

	// Isključi samu pticu iz dropdown roditelja (edit mod)
	$: dostupniOcevi = $pticeMuzjaci.filter((p) => p.id !== editPtica?.id);
	$: dostupneMajke = $pticeSenke.filter((p) => p.id !== editPtica?.id);

	$: naslov = editPtica ? t.ptice.urediPticuTitle : t.ptice.novaPticaTitle;

	async function handleSubmit() {
		if (!vrstaId) { errorMsg = t.ptice.odaberiteVrstuGreska; return; }
		loading = true;
		errorMsg = '';

		try {
			const zajednickiPodaci = {
				spol,
				vrsta_ptica_id: vrstaId,
				naziv: naziv.trim() || undefined,
				prstena_oznaka: prstenaOznaka.trim() || undefined,
				datum_rodjenja: datumRodjenja || undefined,
				otac_id: otacId || undefined,
				majka_id: majkaId || undefined,
				napomena: napomena.trim() || undefined
			};

			if (editPtica) {
				await updatePtica(editPtica.id, zajednickiPodaci);
			} else {
				await createPtica(userId, { ...zajednickiPodaci, user_id: userId });
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

				<!-- Naziv i prsten -->
				<div class="grid grid-cols-2 gap-3">
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
				</div>

				<!-- Datum rođenja -->
				<label class="label">
					<span class="text-sm font-medium">{t.ptice.datumRodjenja}</span>
					<input class="input" type="date" bind:value={datumRodjenja} disabled={loading} />
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
