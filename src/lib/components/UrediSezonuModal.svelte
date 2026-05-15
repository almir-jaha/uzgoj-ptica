<script lang="ts">
	import { updateSezona } from '$lib/stores/sezona';
	import type { Sezona } from '$lib/db/schema';
	import { t } from '$lib/i18n';

	export let sezona: Sezona;
	export let onClose: () => void;
	export let onSuccess: () => void;

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
			errorMsg = err instanceof Error ? err.message : t.sezona.urediGreska;
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
			<h3 class="h4 font-bold">{t.sezona.urediTitle} {sezona.godina}</h3>
			<button class="btn-icon btn-icon-sm variant-ghost" on:click={onClose} disabled={loading}>
				{t.modali.zatvoriBtnTitle}
			</button>
		</header>

		<form class="space-y-4" on:submit|preventDefault={handleSubmit}>
			<label class="label">
				<span class="text-sm font-medium">{t.sezona.urediNazivLabel}</span>
				<input
					class="input"
					type="text"
					bind:value={naziv}
					placeholder={t.sezona.urediNazivPlaceholder}
					disabled={loading}
				/>
			</label>

			<div class="grid grid-cols-2 gap-3">
				<label class="label">
					<span class="text-sm font-medium">{t.common.datumPocetka}</span>
					<input
						class="input"
						type="date"
						bind:value={datum_pocetka}
						required
						disabled={loading}
					/>
				</label>
				<label class="label">
					<span class="text-sm font-medium">{t.common.datumZavrsetka}</span>
					<input
						class="input"
						type="date"
						bind:value={datum_kraja}
						disabled={loading}
					/>
				</label>
			</div>

			<label class="label">
				<span class="text-sm font-medium">{t.sezona.urediStatus}</span>
				<select class="select" bind:value={status} disabled={loading}>
					<option value="aktiva">{t.sezona.statusAktiva}</option>
					<option value="završena">{t.sezona.statusZavrsena}</option>
				</select>
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
					disabled={loading}
				>
					{#if loading}<span class="animate-spin mr-2">↻</span>{/if}
					{t.common.sacuvaj}
				</button>
			</div>
		</form>
	</div>
</div>
