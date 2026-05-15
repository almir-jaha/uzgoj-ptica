<script lang="ts">
	import { createSezona, createKavez, aktivnaSezona } from '$lib/stores/sezona';
	import { t } from '$lib/i18n';

	export let userId: string;
	export let onClose: () => void;
	export let onSuccess: () => void;

	const currentYear = new Date().getFullYear();
	const today = new Date().toISOString().split('T')[0];

	let godina = currentYear;
	let brojKaveza = 10;
	let datumPocetka = today;
	let naziv = '';
	let zavrsiTrenutnu = true;
	let loading = false;
	let errorMsg = '';

	// Provjera: postoji li aktivna sezona iste godine (blokira kreiranje)
	$: duplikatGodina = $aktivnaSezona?.godina === godina && $aktivnaSezona?.status === 'aktiva';

	async function handleSubmit() {
		if (brojKaveza < 1 || brojKaveza > 50) return;
		loading = true;
		errorMsg = '';

		try {
			const sezona = await createSezona(
				userId,
				{
					user_id: userId,
					godina,
					naziv: naziv.trim() || `Sezona ${godina}`,
					broj_kaveza: brojKaveza,
					datum_pocetka: datumPocetka,
					status: 'aktiva'
				},
				zavrsiTrenutnu && $aktivnaSezona ? $aktivnaSezona.id : undefined
			);

			await Promise.all(
				Array.from({ length: brojKaveza }, (_, i) => createKavez(sezona.id, userId, i + 1))
			);

			onSuccess();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : t.sezona.greska;
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
			<h3 class="h4 font-bold">{t.sezona.novaSezona}</h3>
			<button class="btn-icon btn-icon-sm variant-ghost" on:click={onClose} disabled={loading}>
				{t.modali.zatvoriBtnTitle}
			</button>
		</header>

		<form class="space-y-4" on:submit|preventDefault={handleSubmit}>
			<div class="grid grid-cols-2 gap-4">
				<label class="label">
					<span class="text-sm font-medium">{t.sezona.godina}</span>
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
					<span class="text-sm font-medium">{t.sezona.brojKaveza}</span>
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

			{#if duplikatGodina}
				<aside class="alert variant-filled-error py-2 px-3 text-sm">
					<p>Sezona {godina} je već aktivna. Promijenite godinu ili završite aktivnu sezonu.</p>
				</aside>
			{/if}

			<label class="label">
				<span class="text-sm font-medium">{t.sezona.datumPocetka}</span>
				<input class="input" type="date" bind:value={datumPocetka} required disabled={loading} />
			</label>

			<label class="label">
				<span class="text-sm font-medium">{t.sezona.naziv}</span>
				<input
					class="input"
					type="text"
					bind:value={naziv}
					placeholder="Sezona {godina}"
					disabled={loading}
				/>
			</label>

			<!-- Opcija arhiviranja samo ako postoji aktivna sezona i nije duplikat godina -->
			{#if $aktivnaSezona && !duplikatGodina}
				<label class="flex items-center gap-2 cursor-pointer">
					<input
						type="checkbox"
						class="checkbox"
						bind:checked={zavrsiTrenutnu}
						disabled={loading}
					/>
					<span class="text-sm">
						Završi sezonu {$aktivnaSezona.godina} i arhiviraj je
					</span>
				</label>
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
					disabled={loading || brojKaveza < 1 || duplikatGodina}
				>
					{#if loading}<span class="animate-spin mr-2">↻</span>{/if}
					{t.sezona.kreirajSezonu}
				</button>
			</div>
		</form>
	</div>
</div>
