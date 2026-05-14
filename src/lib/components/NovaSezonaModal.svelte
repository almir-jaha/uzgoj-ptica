<script lang="ts">
	import { createSezona, createKavez } from '$lib/stores/sezona';

	export let userId: string;
	export let onClose: () => void;
	export let onSuccess: () => void;

	const currentYear = new Date().getFullYear();
	const today = new Date().toISOString().split('T')[0];

	let godina = currentYear;
	let brojKaveza = 10;
	let datumPocetka = today;
	let naziv = '';
	let loading = false;
	let errorMsg = '';

	async function handleSubmit() {
		if (brojKaveza < 1 || brojKaveza > 50) return;
		loading = true;
		errorMsg = '';

		try {
			const sezona = await createSezona(userId, {
				user_id: userId,
				godina,
				naziv: naziv.trim() || `Sezona ${godina}`,
				broj_kaveza: brojKaveza,
				datum_pocetka: datumPocetka,
				status: 'aktiva'
			});

			// Kreiraj kaveze paralelno
			await Promise.all(
				Array.from({ length: brojKaveza }, (_, i) => createKavez(sezona.id, userId, i + 1))
			);

			onSuccess();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Greška pri kreiranju sezone';
		} finally {
			loading = false;
		}
	}
</script>

<!-- Backdrop -->
<div
	class="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4"
	role="dialog"
	aria-modal="true"
	on:click|self={onClose}
>
	<div class="card w-full max-w-md p-6 space-y-5">
		<header class="flex items-center justify-between">
			<h3 class="h4 font-bold">Nova sezona</h3>
			<button class="btn-icon btn-icon-sm variant-ghost" on:click={onClose} disabled={loading}>
				✕
			</button>
		</header>

		<form class="space-y-4" on:submit|preventDefault={handleSubmit}>
			<div class="grid grid-cols-2 gap-4">
				<label class="label">
					<span class="text-sm font-medium">Godina</span>
					<input
						class="input"
						type="number"
						bind:value={godina}
						min="2000"
						max="2099"
						required
						disabled={loading}
					/>
				</label>
				<label class="label">
					<span class="text-sm font-medium">Broj kaveza</span>
					<input
						class="input"
						type="number"
						bind:value={brojKaveza}
						min="1"
						max="50"
						required
						disabled={loading}
					/>
				</label>
			</div>

			<label class="label">
				<span class="text-sm font-medium">Datum početka</span>
				<input class="input" type="date" bind:value={datumPocetka} required disabled={loading} />
			</label>

			<label class="label">
				<span class="text-sm font-medium">Naziv (opcionalno)</span>
				<input
					class="input"
					type="text"
					bind:value={naziv}
					placeholder="Sezona {godina}"
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
					Odustani
				</button>
				<button
					class="btn variant-filled-primary flex-1"
					type="submit"
					disabled={loading || brojKaveza < 1}
				>
					{#if loading}
						<span class="animate-spin mr-2">↻</span>
					{/if}
					Kreiraj sezonu
				</button>
			</div>
		</form>
	</div>
</div>
