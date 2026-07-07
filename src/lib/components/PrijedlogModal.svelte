<script lang="ts">
	import { submitPrijedlog } from '$lib/stores/prijevodPrijedlozi';
	import type { LangCode } from '$lib/i18n/locale';

	export let terminKljuc: string;
	export let trenutniPrijevod: string;
	export let jezik: LangCode;
	export let userId: string;
	export let onClose: () => void;

	let prijedlog = '';
	let komentar = '';
	let loading = false;
	let error = '';
	let poslano = false;

	async function handleSubmit() {
		if (!prijedlog.trim()) {
			error = 'Unesi prijedlog prijevoda';
			return;
		}
		loading = true;
		error = '';
		try {
			await submitPrijedlog({
				termin_kljuc: terminKljuc,
				jezik,
				trenutni_prijevod: trenutniPrijevod,
				prijedlog: prijedlog.trim(),
				komentar: komentar.trim() || undefined,
				user_id: userId
			});
			poslano = true;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Greška pri slanju prijedloga';
		} finally {
			loading = false;
		}
	}
</script>

<div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
	<div class="card w-full max-w-md p-5 space-y-4">
		<header class="flex items-center justify-between">
			<h3 class="h4 font-bold">💬 Predloži bolji prijevod</h3>
			<button class="btn-icon btn-icon-sm variant-ghost" on:click={onClose}>✕</button>
		</header>

		{#if poslano}
			<p class="text-sm text-success-500">Hvala! Prijedlog je poslan na pregled adminu.</p>
			<button class="btn variant-filled-primary w-full" on:click={onClose}>Zatvori</button>
		{:else}
			<form class="space-y-3" on:submit|preventDefault={handleSubmit}>
				<div class="text-xs text-surface-500 font-mono break-all">{terminKljuc} ({jezik})</div>

				<label class="label">
					<span class="text-xs font-medium">Trenutni prijevod</span>
					<input class="input input-sm" type="text" value={trenutniPrijevod} disabled />
				</label>

				<label class="label">
					<span class="text-xs font-medium">Tvoj prijedlog *</span>
					<input
						class="input input-sm"
						type="text"
						bind:value={prijedlog}
						placeholder="Bolji prijevod..."
						disabled={loading}
						required
					/>
				</label>

				<label class="label">
					<span class="text-xs font-medium">Komentar (opcionalno)</span>
					<textarea
						class="textarea text-sm"
						rows="2"
						bind:value={komentar}
						placeholder="Zašto je ovo bolje?"
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
						Odustani
					</button>
					<button type="submit" class="btn variant-filled-primary flex-1" disabled={loading}>
						{loading ? 'Šaljem...' : 'Pošalji prijedlog'}
					</button>
				</div>
			</form>
		{/if}
	</div>
</div>
