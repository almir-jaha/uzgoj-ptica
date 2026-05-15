<script lang="ts">
	import { createPar } from '$lib/stores/parovi';
	import { pticeMuzjaci, pticeSenke } from '$lib/stores/ptice';
	import { t } from '$lib/i18n';

	export let sezonaId: string;
	export let onClose: () => void;
	export let onSuccess: () => void;

	const today = new Date().toISOString().split('T')[0];

	let muzjakId = '';
	let zenkaId = '';
	let datumFormiranja = today;
	let napomena = '';
	let loading = false;
	let errorMsg = '';

	// Spriječi sparivanje iste ptice sa sobom
	$: zenkeOsimOdabrane = $pticeSenke.filter((p) => p.id !== muzjakId);
	$: muzjaciOsimOdabrane = $pticeMuzjaci.filter((p) => p.id !== zenkaId);

	function pticaLabel(p: { naziv?: string; prstena_oznaka?: string; id: string }): string {
		return p.naziv || p.prstena_oznaka || p.id.slice(0, 8);
	}

	async function handleSubmit() {
		if (!muzjakId || !zenkaId) return;
		loading = true;
		errorMsg = '';

		try {
			await createPar(sezonaId, muzjakId, zenkaId, datumFormiranja, napomena.trim() || undefined);
			onSuccess();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : t.parovi.gresakKreiranja;
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
	<div class="card w-full max-w-md p-6 space-y-5">
		<header class="flex items-center justify-between">
			<h3 class="h4 font-bold">{t.parovi.novParTitle}</h3>
			<button class="btn-icon btn-icon-sm variant-ghost" on:click={onClose} disabled={loading}>
				{t.modali.zatvoriBtnTitle}
			</button>
		</header>

		{#if $pticeMuzjaci.length === 0 || $pticeSenke.length === 0}
			<aside class="alert variant-soft-warning">
				<div class="alert-message space-y-1">
					<p class="font-semibold">{t.parovi.nemaDovoljnoPtica}</p>
					<p class="text-sm">
						{t.parovi.nemaDovoljnoPticaOpis}
					</p>
				</div>
			</aside>
			<div class="flex gap-3">
				<button class="btn variant-ghost flex-1" on:click={onClose}>{t.common.zatvori}</button>
				<a class="btn variant-filled-primary flex-1" href="/ptice">{t.parovi.iditeNaPtice}</a>
			</div>
		{:else}
			<form class="space-y-4" on:submit|preventDefault={handleSubmit}>
				<label class="label">
					<span class="text-sm font-medium">{t.parovi.muzjak}</span>
					<select class="select" bind:value={muzjakId} required disabled={loading}>
						<option value="" disabled>{t.parovi.odaberiteMuzjaka}</option>
						{#each muzjaciOsimOdabrane as ptica (ptica.id)}
							<option value={ptica.id}>{pticaLabel(ptica)}</option>
						{/each}
					</select>
				</label>

				<label class="label">
					<span class="text-sm font-medium">{t.parovi.zenka}</span>
					<select class="select" bind:value={zenkaId} required disabled={loading}>
						<option value="" disabled>{t.parovi.odaberiteZenku}</option>
						{#each zenkeOsimOdabrane as ptica (ptica.id)}
							<option value={ptica.id}>{pticaLabel(ptica)}</option>
						{/each}
					</select>
				</label>

				<label class="label">
					<span class="text-sm font-medium">{t.parovi.datumFormiranja}</span>
					<input
						class="input"
						type="date"
						bind:value={datumFormiranja}
						required
						disabled={loading}
					/>
				</label>

				<label class="label">
					<span class="text-sm font-medium">{t.common.napomenaOpt}</span>
					<textarea
						class="textarea text-sm"
						rows="2"
						bind:value={napomena}
						placeholder={t.parovi.napomenaPlaceholder}
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
						disabled={loading || !muzjakId || !zenkaId}
					>
						{#if loading}<span class="animate-spin mr-2">↻</span>{/if}
						{t.parovi.kreirajPar}
					</button>
				</div>
			</form>
		{/if}
	</div>
</div>
