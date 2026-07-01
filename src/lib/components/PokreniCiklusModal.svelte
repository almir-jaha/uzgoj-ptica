<script lang="ts">
	import { onMount } from 'svelte';
	import { ciklusi, createCiklus, loadFaze } from '$lib/stores/ciklus';
	import { ptice, loadPtice } from '$lib/stores/ptice';
	import { user } from '$lib/stores/auth';
	import { get } from 'svelte/store';
	import { updateKavezStatus } from '$lib/stores/sezona';
	import { supabase } from '$lib/supabase/client';
	import { db } from '$lib/db/dexie';
	import type { Par } from '$lib/db/schema';
	import { t } from '$lib/i18n';

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

			// Svježi load iz Supabase — Supabase je izvor istine
			const { data, error } = await supabase
				.from('parovi')
				.select('*')
				.eq('sezona_id', sezonaId)
				.eq('status', 'aktivan');

			if (!error && data !== null) {
				// Supabase odgovorio (čak i prazan niz) — sinhronizuj Dexie
				const supabaseIds = new Set(data.map((p) => p.id));
				const dexiePar = await db.parovi.where('sezona_id').equals(sezonaId).toArray();
				const staleIds = dexiePar.filter((p) => !supabaseIds.has(p.id)).map((p) => p.id);
				if (staleIds.length > 0) await db.parovi.bulkDelete(staleIds);
				if (data.length > 0) await db.parovi.bulkPut(data);
				parOviSezona = data;
			} else {
				// Mrežna greška — fallback Dexie
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
	let loading = false;
	let errorMsg = '';

	async function handleSubmit() {
		if (!odabraniParId) return;
		loading = true;
		errorMsg = '';

		try {
			const par = parOviSezona.find((p) => p.id === odabraniParId);
			if (!par) throw new Error($t.modali.ciklus.parNijePronadjen);

			const ptica1 = $ptice.find((p) => p.id === par.ptica1_id);
			if (!ptica1) throw new Error($t.modali.ciklus.pticaNijePronadjena);

			await createCiklus({
				par_id: odabraniParId,
				kavez_id: kavezId,
				sezona_id: sezonaId,
				vrsta_ptica_id: ptica1.vrsta_ptica_id,
				datum_prvog_jajeta: null, // unosi se naknadno na kavezu
				status: 'aktivan'
			});

			// Kavez postaje aktivan bez faze — faza se postavlja kad se unese prvo jaje
			await updateKavezStatus(kavezId, 'aktivan', undefined);
			onSuccess();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : $t.modali.ciklus.greska;
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
			<h3 class="h4 font-bold">{$t.modali.ciklus.pokreniTitle}</h3>
			<button class="btn-icon btn-icon-sm variant-ghost" on:click={onClose} disabled={loading}>
				{$t.modali.zatvoriBtnTitle}
			</button>
		</header>

		{#if modalLoading}
			<div class="flex items-center justify-center py-6">
				<span class="animate-spin text-2xl">↻</span>
			</div>

		{:else if slobodniParovi.length === 0}
			<aside class="alert variant-soft-warning">
				<div class="alert-message space-y-1">
					<p class="font-semibold">{$t.modali.ciklus.nemaParova}</p>
					<p class="text-sm">
						{$t.modali.ciklus.nemaParovaOpis}
						<strong>{$t.modali.ciklus.nemaParovaParovi}</strong> {$t.modali.ciklus.nemaParovaOpis2}
					</p>
				</div>
			</aside>
			<div class="flex gap-3">
				<button class="btn variant-ghost flex-1" on:click={onClose}>{$t.common.zatvori}</button>
				<a class="btn variant-filled-primary flex-1" href="/parovi">{$t.modali.ciklus.iditeNaParove}</a>
			</div>

		{:else}
			<form class="space-y-4" on:submit|preventDefault={handleSubmit}>
				<label class="label">
					<span class="text-sm font-medium">{$t.modali.ciklus.odaberitePar}</span>
					<select class="select" bind:value={odabraniParId} required disabled={loading}>
						<option value="" disabled>{$t.modali.ciklus.odaberiteParOpcija}</option>
						{#each slobodniParovi as par (par.id)}
							<option value={par.id}>{parLabel(par)}</option>
						{/each}
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
						{$t.common.odustani}
					</button>
					<button
						class="btn variant-filled-primary flex-1"
						type="submit"
						disabled={loading || !odabraniParId}
					>
						{#if loading}<span class="animate-spin mr-2">↻</span>{/if}
						{$t.modali.ciklus.pokreni}
					</button>
				</div>
			</form>
		{/if}
	</div>
</div>
