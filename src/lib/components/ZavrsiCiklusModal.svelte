<script lang="ts">
	import { finishCiklus } from '$lib/stores/ciklus';
	import { updateKavezStatus } from '$lib/stores/sezona';
	import { db, addOfflineAction } from '$lib/db/dexie';
	import { supabase } from '$lib/supabase/client';
	import type { KavezWithDetails } from '$lib/db/schema';

	export let details: KavezWithDetails;
	export let onClose: () => void;
	export let onSuccess: () => void;

	let odabraniStatus: 'završen' | 'neuspješan' = 'završen';
	let brojJaja: number | string = '';
	let brojIzlijegljenih: number | string = '';
	let napomena = '';
	let loading = false;
	let errorMsg = '';

	async function handleSubmit() {
		if (!details.aktivni_ciklus) return;
		loading = true;
		errorMsg = '';

		try {
			await finishCiklus(details.aktivni_ciklus.id, odabraniStatus);

			// Ažuriraj statistike ako su unesene (finishCiklus ne prima ta polja)
			const statsFields: Record<string, unknown> = {
				updated_at: new Date().toISOString()
			};
			if (brojJaja !== '') statsFields.broj_jaja = Number(brojJaja);
			if (odabraniStatus === 'završen' && brojIzlijegljenih !== '') {
				statsFields.broj_izlijegljenih = Number(brojIzlijegljenih);
			}
			if (napomena.trim()) statsFields.napomena = napomena.trim();

			if (Object.keys(statsFields).length > 1) {
				await db.ciklusi.update(details.aktivni_ciklus.id, statsFields);
				await addOfflineAction('update', 'ciklusi', {
					id: details.aktivni_ciklus.id,
					...statsFields
				});
				await supabase
					.from('ciklusi')
					.update(statsFields)
					.eq('id', details.aktivni_ciklus.id);
			}

			await updateKavezStatus(details.id, 'prazan');
			onSuccess();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Greška pri završetku ciklusa';
		} finally {
			loading = false;
		}
	}

	$: par = details.aktivni_ciklus?.par;
	$: ptica1Label = par?.ptica1?.naziv || par?.ptica1?.prstena_oznaka || '?';
	$: ptica2Label = par?.ptica2?.naziv || par?.ptica2?.prstena_oznaka || '?';
</script>

<!-- Backdrop -->
<div
	class="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4"
	role="presentation"
	on:click|self={onClose}
	on:keydown={(e) => e.key === 'Escape' && onClose()}
>
	<div class="card w-full max-w-md p-6 space-y-5">
		<header class="flex items-center justify-between">
			<div>
				<h3 class="h4 font-bold">Završi ciklus</h3>
				<p class="text-sm text-surface-500">
					Kavez {details.oznaka} — {ptica1Label} / {ptica2Label}
				</p>
			</div>
			<button class="btn-icon btn-icon-sm variant-ghost" on:click={onClose} disabled={loading}>
				✕
			</button>
		</header>

		<form class="space-y-4" on:submit|preventDefault={handleSubmit}>
			<!-- Status izbor -->
			<fieldset class="space-y-2">
				<legend class="text-sm font-medium">Rezultat legla</legend>
				<label class="flex items-center gap-3 p-3 card variant-soft cursor-pointer hover:variant-soft-success">
					<input
						type="radio"
						class="radio"
						bind:group={odabraniStatus}
						value="završen"
						disabled={loading}
					/>
					<span class="font-medium">✅ Uspješno završen</span>
				</label>
				<label class="flex items-center gap-3 p-3 card variant-soft cursor-pointer hover:variant-soft-error">
					<input
						type="radio"
						class="radio"
						bind:group={odabraniStatus}
						value="neuspješan"
						disabled={loading}
					/>
					<span class="font-medium">❌ Neuspješan</span>
				</label>
			</fieldset>

			<!-- Statistike -->
			<div class="grid grid-cols-2 gap-3">
				<label class="label">
					<span class="text-sm">Broj jaja</span>
					<input
						class="input"
						type="number"
						bind:value={brojJaja}
						min="0"
						placeholder="—"
						disabled={loading}
					/>
				</label>
				{#if odabraniStatus === 'završen'}
					<label class="label">
						<span class="text-sm">Izlijegljenih</span>
						<input
							class="input"
							type="number"
							bind:value={brojIzlijegljenih}
							min="0"
							placeholder="—"
							disabled={loading}
						/>
					</label>
				{/if}
			</div>

			<label class="label">
				<span class="text-sm">Napomena (opcionalno)</span>
				<textarea
					class="textarea text-sm"
					rows="2"
					bind:value={napomena}
					placeholder="Bilješka o leglu..."
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
					class="btn variant-filled-warning flex-1"
					type="submit"
					disabled={loading}
				>
					{#if loading}
						<span class="animate-spin mr-2">↻</span>
					{/if}
					Završi ciklus
				</button>
			</div>
		</form>
	</div>
</div>
