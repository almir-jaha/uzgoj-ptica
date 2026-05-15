<script lang="ts">
	import { onMount } from 'svelte';
	import { ciklusi, createCiklus, getFazeZaVrstu, loadFaze } from '$lib/stores/ciklus';
	import { ptice, loadPtice } from '$lib/stores/ptice';
	import { user } from '$lib/stores/auth';
	import { get } from 'svelte/store';
	import { updateKavezStatus } from '$lib/stores/sezona';
	import { supabase } from '$lib/supabase/client';
	import { db } from '$lib/db/dexie';
	import type { Par } from '$lib/db/schema';

	export let kavezId: string;
	export let sezonaId: string;
	export let onClose: () => void;
	export let onSuccess: () => void;

	let modalLoading = true;
	let parOviSezona: Par[] = [];

	onMount(async () => {
		try {
			const currentUser = get(user);
			if (currentUser && $ptice.length === 0) await loadPtice(currentUser.id);
			// Svježe faze iz Supabase — briše zastarjele Dexie faze koje bi uzrokovale FK grešku
			await loadFaze();

			// Svježi load iz Supabase — parovi ove sezone
			const { data } = await supabase
				.from('parovi')
				.select('*')
				.eq('sezona_id', sezonaId)
				.eq('status', 'aktivan');

			if (data?.length) {
				await db.parovi.bulkPut(data);
				parOviSezona = data;
			} else {
				// Fallback: Dexie
				parOviSezona = await db.parovi
					.where('sezona_id')
					.equals(sezonaId)
					.filter((p) => p.status === 'aktivan')
					.toArray();
			}
		} catch {
			parOviSezona = await db.parovi
				.where('sezona_id')
				.equals(sezonaId)
				.filter((p) => p.status === 'aktivan')
				.toArray();
		}
		modalLoading = false;
	});

	// Parovi koji nisu u aktivnom ciklusu ove sezone
	$: zauzetiParIds = $ciklusi
		.filter((c) => c.status === 'aktivan' && c.sezona_id === sezonaId)
		.map((c) => c.par_id);

	$: slobodniParovi = parOviSezona.filter((p) => !zauzetiParIds.includes(p.id));

	function parLabel(par: Par): string {
		const p1 = $ptice.find((p) => p.id === par.ptica1_id);
		const p2 = $ptice.find((p) => p.id === par.ptica2_id);
		const l1 = p1?.naziv || p1?.prstena_oznaka || '?';
		const l2 = p2?.naziv || p2?.prstena_oznaka || '?';
		return `${l1} / ${l2}`;
	}

	let odabraniParId = '';
	let datumPrvogJajeta = new Date().toISOString().split('T')[0];
	let loading = false;
	let errorMsg = '';

	async function handleSubmit() {
		if (!odabraniParId) return;
		loading = true;
		errorMsg = '';

		try {
			const par = parOviSezona.find((p) => p.id === odabraniParId);
			if (!par) throw new Error('Par nije pronađen');

			const ptica1 = $ptice.find((p) => p.id === par.ptica1_id);
			if (!ptica1) throw new Error('Ptica nije pronađena — provjerite ptice');

			const vrstaId = ptica1.vrsta_ptica_id;

			await createCiklus({
				par_id: odabraniParId,
				kavez_id: kavezId,
				sezona_id: sezonaId,
				vrsta_ptica_id: vrstaId,
				datum_prvog_jajeta: datumPrvogJajeta,
				status: 'aktivan'
			});

			const fazeZaVrstu = await getFazeZaVrstu(vrstaId);
			const prvaFaza = fazeZaVrstu[0];
			await updateKavezStatus(kavezId, 'aktivan', prvaFaza?.id);
			onSuccess();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Greška pri pokretanju ciklusa';
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
			<h3 class="h4 font-bold">Pokreni ciklus</h3>
			<button class="btn-icon btn-icon-sm variant-ghost" on:click={onClose} disabled={loading}>
				✕
			</button>
		</header>

		{#if modalLoading}
			<div class="flex items-center justify-center py-6">
				<span class="animate-spin text-2xl">↻</span>
			</div>

		{:else if slobodniParovi.length === 0}
			<aside class="alert variant-soft-warning">
				<div class="alert-message space-y-1">
					<p class="font-semibold">Nema slobodnih parova za ovu sezonu</p>
					<p class="text-sm">
						Parovi se kreiraju posebno za svaku sezonu. Idite na stranicu
						<strong>Parovi</strong> i kreirajte parove za ovu sezonu.
					</p>
				</div>
			</aside>
			<div class="flex gap-3">
				<button class="btn variant-ghost flex-1" on:click={onClose}>Zatvori</button>
				<a class="btn variant-filled-primary flex-1" href="/parovi">Idi na Parove</a>
			</div>

		{:else}
			<form class="space-y-4" on:submit|preventDefault={handleSubmit}>
				<label class="label">
					<span class="text-sm font-medium">Odaberite par</span>
					<select class="select" bind:value={odabraniParId} required disabled={loading}>
						<option value="" disabled>— Odaberite par —</option>
						{#each slobodniParovi as par (par.id)}
							<option value={par.id}>{parLabel(par)}</option>
						{/each}
					</select>
				</label>

				<label class="label">
					<span class="text-sm font-medium">Datum prvog jajeta</span>
					<input
						class="input"
						type="date"
						bind:value={datumPrvogJajeta}
						required
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
						disabled={loading || !odabraniParId}
					>
						{#if loading}<span class="animate-spin mr-2">↻</span>{/if}
						Pokreni
					</button>
				</div>
			</form>
		{/if}
	</div>
</div>
