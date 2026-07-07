<script lang="ts">
	import { submitPrijedlog } from '$lib/stores/prijevodPrijedlozi';
	import { t } from '$lib/i18n';
	import type { LangCode } from '$lib/i18n/locale';
	import type { PrijevodIzvor } from '$lib/db/schema';

	export let terminKljuc: string;
	export let bsOriginal: string;
	export let trenutniPrijevod: string;
	export let jezik: LangCode;
	export let izvor: PrijevodIzvor;
	export let izvorId: string | null = null;
	export let userId: string;
	export let onClose: () => void;

	let prijedlog = '';
	let komentar = '';
	let loading = false;
	let error = '';
	let poslano = false;

	async function handleSubmit() {
		if (!prijedlog.trim()) {
			error = $t.prijevodi.greskaPrazanPrijedlog;
			return;
		}
		loading = true;
		error = '';
		try {
			await submitPrijedlog({
				termin_kljuc: terminKljuc,
				izvor,
				izvor_id: izvorId,
				jezik,
				trenutni_prijevod: trenutniPrijevod,
				prijedlog: prijedlog.trim(),
				komentar: komentar.trim() || undefined,
				user_id: userId
			});
			poslano = true;
		} catch (err) {
			error = err instanceof Error ? err.message : $t.prijevodi.greskaSlanja;
		} finally {
			loading = false;
		}
	}
</script>

<div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
	<div class="card w-full max-w-md p-5 space-y-4">
		<header class="flex items-center justify-between">
			<h3 class="h4 font-bold">💬 {$t.prijevodi.modalNaslov}</h3>
			<button class="btn-icon btn-icon-sm variant-ghost" on:click={onClose}>✕</button>
		</header>

		{#if poslano}
			<p class="text-sm text-success-500">{$t.prijevodi.modalHvala}</p>
			<button class="btn variant-filled-primary w-full" on:click={onClose}>{$t.common.zatvori}</button>
		{:else}
			<form class="space-y-3" on:submit|preventDefault={handleSubmit}>
				<div class="text-xs text-surface-500 font-mono break-all">{terminKljuc}</div>

				<label class="label">
					<span class="text-xs font-medium">{$t.prijevodi.modalTerminBsOriginal}</span>
					<input class="input input-sm" type="text" value={bsOriginal} disabled />
				</label>

				<label class="label">
					<span class="text-xs font-medium">{$t.prijevodi.trenutniPrijevod} ({jezik})</span>
					<input class="input input-sm" type="text" value={trenutniPrijevod} disabled />
				</label>

				<label class="label">
					<span class="text-xs font-medium">{$t.prijevodi.modalTvojPrijedlog}</span>
					<input
						class="input input-sm"
						type="text"
						bind:value={prijedlog}
						placeholder={$t.prijevodi.modalPrijedlogPlaceholder}
						disabled={loading}
						required
					/>
				</label>

				<label class="label">
					<span class="text-xs font-medium">{$t.prijevodi.modalKomentar}</span>
					<textarea
						class="textarea text-sm"
						rows="2"
						bind:value={komentar}
						placeholder={$t.prijevodi.modalKomentarPlaceholder}
						disabled={loading}
					></textarea>
				</label>

				{#if error}
					<aside class="alert variant-filled-error text-sm">{error}</aside>
				{/if}

				<div class="flex gap-3 pt-2">
					<button
						type="button"
						class="btn variant-ghost flex-1"
						on:click={onClose}
						disabled={loading}
					>
						{$t.common.odustani}
					</button>
					<button type="submit" class="btn variant-filled-primary flex-1" disabled={loading}>
						{loading ? $t.prijevodi.modalSaljemBtn : $t.prijevodi.modalPosaljiBtn}
					</button>
				</div>
			</form>
		{/if}
	</div>
</div>
