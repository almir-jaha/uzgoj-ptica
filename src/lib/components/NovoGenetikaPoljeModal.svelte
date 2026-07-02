<script lang="ts">
	import { createGenetikaPoljeI18n, updateGenetikaPoljeI18n } from '$lib/stores/admin';
	import type { GenetikaPoljaI18n } from '$lib/db/schema';
	import GenetikaPoljeI18nForm from './GenetikaPoljeI18nForm.svelte';

	export let vrstaGrupa: 'kanarinac_finke' | 'golubovi' | 'papagaji' | 'ostalo' =
		'kanarinac_finke';
	export let editPolje: GenetikaPoljaI18n | null = null;
	export let onClose: () => void;
	export let onSuccess: () => void;

	let formNaziv = editPolje?.polje_kljuc?.replace(/_/g, ' ') ?? '';
	let formKljuc = editPolje?.polje_kljuc ?? '';
	let formTip: 'text' | 'select' | 'tags' | 'stars' | 'number' = editPolje?.tip ?? 'text';
	let formSekcija: 'genetika' | 'ocjena' = editPolje?.sekcija ?? 'genetika';
	let formRedoslijed = editPolje?.redoslijed ?? 1;
	let formOpcije = editPolje?.opcije?.join(', ') ?? '';
	let formMinMax = { min: editPolje?.min_vrijednost ?? 0, max: editPolje?.max_vrijednost ?? 100 };

	let loading = false;
	let error = '';
	let formRef: any;

	function autoGenerateKljuc() {
		formKljuc = formNaziv
			.toLowerCase()
			.trim()
			.replace(/\s+/g, '_')
			.replace(/[^a-z0-9_]/g, '');
	}

	async function handleSubmit() {
		if (!formNaziv.trim() || !formKljuc.trim()) {
			error = 'Naziv i ključ su obavezni';
			return;
		}

		loading = true;
		error = '';

		try {
			const jsonbData = formRef?.getJSONBData?.();

			const poljeData: Omit<GenetikaPoljaI18n, 'id' | 'created_at' | 'updated_at'> = {
				polje_kljuc: formKljuc.trim(),
				vrsta_grupa: vrstaGrupa,
				tip: formTip,
				sekcija: formSekcija,
				redoslijed: formRedoslijed,
				nazivi_jezicima: jsonbData?.nazivi_jezicima ?? {},
				opisi_jezicima: jsonbData?.opisi_jezicima ?? {},
				placeholder_jezicima: jsonbData?.placeholder_jezicima ?? {},
				opcije_jezicima: jsonbData?.opcije_jezicima ?? {},
				opcije:
					formTip === 'select' || formTip === 'tags'
						? formOpcije
								.split(',')
								.map((s) => s.trim())
								.filter(Boolean)
						: [],
				min_vrijednost:
					formTip === 'number' || formTip === 'stars' ? formMinMax.min : undefined,
				max_vrijednost:
					formTip === 'number' || formTip === 'stars' ? formMinMax.max : undefined
			};

			if (editPolje) {
				await updateGenetikaPoljeI18n(editPolje.id, poljeData);
			} else {
				await createGenetikaPoljeI18n(poljeData);
			}

			onSuccess();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Greška pri čuvanju';
		} finally {
			loading = false;
		}
	}
</script>

<div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
	<div class="card w-full max-w-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
		<header class="flex items-center justify-between">
			<h3 class="h4 font-bold">
				{editPolje ? 'Uredi genetika polje' : 'Novo genetika polje'}
			</h3>
			<button class="btn-icon btn-icon-sm variant-ghost" on:click={onClose} disabled={loading}>
				✕
			</button>
		</header>

		<form class="space-y-6" on:submit|preventDefault={handleSubmit}>
			<!-- Osnovne postavke -->
			<div class="space-y-3">
				<h4 class="text-sm font-semibold">Osnovne postavke</h4>

				<div class="grid grid-cols-2 gap-3">
					<label class="label">
						<span class="text-xs font-medium">Naziv (prikaz) *</span>
						<input
							class="input input-sm"
							type="text"
							placeholder="npr. Vizuelna mutacija"
							bind:value={formNaziv}
							on:blur={autoGenerateKljuc}
							disabled={loading}
							required
						/>
					</label>
					<label class="label">
						<span class="text-xs font-medium">Ključ (ID) *</span>
						<input
							class="input input-sm font-mono text-xs"
							type="text"
							placeholder="vizuelna_mutacija"
							bind:value={formKljuc}
							disabled={loading}
							required
						/>
					</label>
				</div>

				<div class="grid grid-cols-3 gap-3">
					<label class="label">
						<span class="text-xs font-medium">Tip</span>
						<select class="select select-sm" bind:value={formTip} disabled={loading}>
							<option value="text">Tekst</option>
							<option value="select">Select</option>
							<option value="tags">Tagovi</option>
							<option value="number">Broj</option>
							<option value="stars">Zvjezdice</option>
						</select>
					</label>
					<label class="label">
						<span class="text-xs font-medium">Sekcija</span>
						<select class="select select-sm" bind:value={formSekcija} disabled={loading}>
							<option value="genetika">Genetika</option>
							<option value="ocjena">Ocjena</option>
						</select>
					</label>
					<label class="label">
						<span class="text-xs font-medium">Redoslijed</span>
						<input
							class="input input-sm"
							type="number"
							bind:value={formRedoslijed}
							disabled={loading}
						/>
					</label>
				</div>

				{#if formTip === 'select' || formTip === 'tags'}
					<label class="label">
						<span class="text-xs font-medium">Opcije (odvojene zarezom)</span>
						<input
							class="input input-sm"
							type="text"
							placeholder="Opcija1, Opcija2, Opcija3"
							bind:value={formOpcije}
							disabled={loading}
						/>
					</label>
				{/if}

				{#if formTip === 'number' || formTip === 'stars'}
					<div class="grid grid-cols-2 gap-3">
						<label class="label">
							<span class="text-xs font-medium">Minimum</span>
							<input
								class="input input-sm"
								type="number"
								bind:value={formMinMax.min}
								disabled={loading}
							/>
						</label>
						<label class="label">
							<span class="text-xs font-medium">Maksimum</span>
							<input
								class="input input-sm"
								type="number"
								bind:value={formMinMax.max}
								disabled={loading}
							/>
						</label>
					</div>
				{/if}
			</div>

			<!-- 17 jezičnih prevoda -->
			<GenetikaPoljeI18nForm
				bind:this={formRef}
				loading={loading}
				polje={editPolje}
				hasOpcije={formTip === 'select' || formTip === 'tags'}
				opcijeBs={formOpcije.split(',').map(s => s.trim()).filter(Boolean)}
			/>

			{#if error}
				<aside class="alert variant-filled-error text-sm">{error}</aside>
			{/if}

			<div class="flex gap-3 pt-4">
				<button
					type="button"
					class="btn variant-ghost flex-1"
					on:click={onClose}
					disabled={loading}
				>
					Odustani
				</button>
				<button type="submit" class="btn variant-filled-primary flex-1" disabled={loading}>
					{loading
						? 'Čuvam...'
						: editPolje
							? 'Ažuriraj polje'
							: 'Kreiraj polje'}
				</button>
			</div>
		</form>
	</div>
</div>
