<script lang="ts">
	import { generirajRodovnikPDF } from '$lib/utils/rodovnik-pdf';
	import type { Ptica } from '$lib/db/schema';

	export let ptica: Ptica;
	export let onClose: () => void;

	let loading = false;
	let error = '';

	function spolSimbol(spol: string) {
		return spol === 'M' ? '♂' : spol === 'Ž' ? '♀' : '?';
	}

	function prstenLabel(p: Ptica): string {
		if (p.prstena_oznaka && p.prsten_redni_broj != null) return `${p.prstena_oznaka}-${p.prsten_redni_broj}`;
		if (p.prstena_oznaka) return p.prstena_oznaka;
		if (p.prsten_redni_broj != null) return `#${p.prsten_redni_broj}`;
		return '';
	}

	async function generiraj() {
		loading = true;
		error = '';
		try {
			await generirajRodovnikPDF(ptica.id);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Greška pri generiranju rodovnika';
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
	<div class="card w-full max-w-sm p-6 space-y-4">
		<header class="flex items-center justify-between">
			<h3 class="h4 font-bold">Rodovnik PDF</h3>
			<button class="btn-icon btn-icon-sm variant-ghost" on:click={onClose} disabled={loading}>✕</button>
		</header>

		<!-- Info o ptici -->
		<div class="card variant-soft p-3 space-y-1">
			<div class="flex items-center gap-2">
				<span class="badge variant-filled-surface">{spolSimbol(ptica.spol)}</span>
				<p class="font-semibold">{ptica.naziv || prstenLabel(ptica) || '—'}</p>
			</div>
			{#if prstenLabel(ptica) && ptica.naziv}
				<p class="text-sm text-surface-500">📍 {prstenLabel(ptica)}</p>
			{/if}
			{#if ptica.godina}
				<p class="text-sm text-surface-500">📅 {ptica.godina}</p>
			{/if}
		</div>

		<!-- Format info -->
		<div class="space-y-1 text-sm text-surface-500">
			<p>Format: <span class="font-medium text-surface-700-200-token">A4 Portrait · 4 generacije</span></p>
			<p class="text-xs">Slike: ptica + roditelji. Rodovnik se generira iz lokalnih podataka.</p>
		</div>

		{#if error}
			<aside class="alert variant-filled-error py-2 px-3 text-sm">
				<p>{error}</p>
			</aside>
		{/if}

		<div class="flex gap-3 pt-1">
			<button class="btn variant-ghost flex-1" on:click={onClose} disabled={loading}>
				Odustani
			</button>
			<button class="btn variant-filled-primary flex-1" on:click={generiraj} disabled={loading}>
				{#if loading}
					<span class="animate-spin mr-2">↻</span> Generiranje...
				{:else}
					Generiraj PDF
				{/if}
			</button>
		</div>
	</div>
</div>
