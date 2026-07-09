<script lang="ts">
	import { generirajRodovnikPDF } from '$lib/utils/rodovnik-pdf';
	import { generirajLandscapeRodovnikPDF } from '$lib/utils/rodovnik-landscape-pdf';
	import { generirajA5RodovnikPDF } from '$lib/utils/rodovnik-a5-pdf';
	import { generirajShowRodovnikPDF } from '$lib/utils/rodovnik-show-pdf';
	import { generirajBwRodovnikPDF } from '$lib/utils/rodovnik-bw-pdf';
	import { appLangToRodovnikLang, type RodovnikLang } from '$lib/utils/rodovnik-i18n';
	import { currentLang } from '$lib/langStore.js';
	import { get } from 'svelte/store';
	import type { Ptica } from '$lib/db/schema';

	export let ptica: Ptica;
	export let onClose: () => void;

	let loading = false;
	let error = '';
	let selectedId: string = 'portrait';

	interface Template {
		id: string;
		name: string;
		desc: string;
		size: string;
		orientation: 'portrait' | 'landscape';
		gen: string;
		style: string;
		styleColor: string;
		fn: (id: string, lang: RodovnikLang) => Promise<void>;
	}

	const templates: Template[] = [
		{
			id: 'portrait',
			name: 'Standardni',
			desc: '4 generacije · boje · QR kod · potpis',
			size: 'A4',
			orientation: 'portrait',
			gen: '4 gen',
			style: 'Standardni',
			styleColor: '#3b82f6',
			fn: generirajRodovnikPDF
		},
		{
			id: 'landscape',
			name: 'Landscape',
			desc: '4 generacije · horizontalni · info panel',
			size: 'A4',
			orientation: 'landscape',
			gen: '4 gen',
			style: 'Standardni',
			styleColor: '#10b981',
			fn: generirajLandscapeRodovnikPDF
		},
		{
			id: 'a5',
			name: 'Kompaktni',
			desc: '3 generacije · manji format · za brzu štampu',
			size: 'A5',
			orientation: 'portrait',
			gen: '3 gen',
			style: 'Kompaktni',
			styleColor: '#f59e0b',
			fn: generirajA5RodovnikPDF
		},
		{
			id: 'show',
			name: 'Show / Izložbeni',
			desc: '4 generacije · dekorativni border · zlatni naslov',
			size: 'A4',
			orientation: 'portrait',
			gen: '4 gen',
			style: 'Izložbeni',
			styleColor: '#8b5cf6',
			fn: generirajShowRodovnikPDF
		},
		{
			id: 'bw',
			name: 'Crno-bijeli',
			desc: '4 generacije · bez boja · za svaki printer',
			size: 'A4',
			orientation: 'landscape',
			gen: '4 gen',
			style: 'B&W',
			styleColor: '#6b7280',
			fn: generirajBwRodovnikPDF
		}
	];

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
		const tpl = templates.find(t => t.id === selectedId);
		if (!tpl) return;
		loading = true;
		error = '';
		const lang: RodovnikLang = appLangToRodovnikLang(get(currentLang));
		try {
			await tpl.fn(ptica.id, lang);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Greška pri generiranju rodovnika';
		} finally {
			loading = false;
		}
	}
</script>

<div
	class="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-3"
	role="presentation"
	on:click|self={onClose}
	on:keydown={(e) => e.key === 'Escape' && onClose()}
>
	<div class="card w-full max-w-sm p-5 space-y-4 max-h-[92vh] overflow-y-auto">
		<header class="flex items-center justify-between">
			<h3 class="h4 font-bold">Rodovnik PDF</h3>
			<button class="btn-icon btn-icon-sm variant-ghost" on:click={onClose} disabled={loading}>✕</button>
		</header>

		<!-- Info o ptici -->
		<div class="card variant-soft p-3 space-y-0.5">
			<div class="flex items-center gap-2">
				<span class="badge variant-filled-surface">{spolSimbol(ptica.spol)}</span>
				<p class="font-semibold text-sm">{ptica.naziv || prstenLabel(ptica) || '—'}</p>
			</div>
			{#if prstenLabel(ptica) && ptica.naziv}
				<p class="text-xs text-surface-500">{prstenLabel(ptica)}</p>
			{/if}
			{#if ptica.godina}
				<p class="text-xs text-surface-500">{ptica.godina}</p>
			{/if}
		</div>

		<!-- Odabir templata -->
		<div class="space-y-1.5">
			<p class="text-xs font-semibold text-surface-500 uppercase tracking-wide">Predložak</p>
			<div class="grid grid-cols-2 gap-2">
				{#each templates as tpl}
					{@const isSelected = selectedId === tpl.id}
					<button
						class="relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all text-center
							{isSelected ? 'border-primary-500 bg-primary-500/10' : 'border-surface-300/50 bg-surface-100/50 hover:border-surface-400'}"
						on:click={() => selectedId = tpl.id}
						disabled={loading}
					>
						<!-- Minijaturni prikaz stranice -->
						<div class="flex items-center justify-center" style="min-height: 40px">
							<div
								class="relative rounded-sm flex flex-col items-stretch overflow-hidden border border-surface-400"
								style="
									width: {tpl.orientation === 'portrait' ? '24px' : '34px'};
									height: {tpl.orientation === 'portrait' ? '34px' : '24px'};
									background: {tpl.id === 'bw' ? '#f5f5f5' : '#eef2ff'};
									border-color: {isSelected ? tpl.styleColor : '#9ca3af'};
								"
							>
								<!-- Kolone unutar minijature -->
								<div class="absolute inset-0 flex {tpl.orientation === 'portrait' ? 'flex-row' : 'flex-row'}" style="gap: 1px; padding: 1px">
									<div class="rounded-[1px]" style="width: 35%; background: {tpl.id === 'bw' ? '#d1d5db' : tpl.styleColor}33"></div>
									<div class="flex flex-col flex-1" style="gap: 1px">
										<div class="flex-1 rounded-[1px]" style="background: {tpl.id === 'bw' ? '#e5e7eb' : tpl.styleColor}22"></div>
										<div class="flex-1 rounded-[1px]" style="background: {tpl.id === 'bw' ? '#e5e7eb' : tpl.styleColor}22"></div>
									</div>
								</div>
								<!-- Outer border za Show -->
								{#if tpl.id === 'show'}
									<div class="absolute inset-0 rounded-sm" style="border: 1.5px solid #1a237e; pointer-events: none"></div>
								{/if}
							</div>
						</div>

						<!-- Ime i opis -->
						<div class="w-full">
							<p class="text-xs font-bold leading-tight" style="color: {isSelected ? tpl.styleColor : 'inherit'}">{tpl.name}</p>
							<p class="text-[10px] text-surface-500 leading-tight mt-0.5">{tpl.size} · {tpl.gen}</p>
						</div>

						<!-- Checkmark ako odabran -->
						{#if isSelected}
							<div class="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center" style="background: {tpl.styleColor}">
								<span class="text-white text-[8px] font-bold">✓</span>
							</div>
						{/if}
					</button>
				{/each}
			</div>

			<!-- Opis odabranog templata -->
			{#if templates.find(t => t.id === selectedId)}
				{@const sel = templates.find(t => t.id === selectedId)}
				<p class="text-xs text-surface-400 text-center px-1">{sel?.desc}</p>
			{/if}
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
			<button class="btn variant-filled-primary flex-1" on:click={generiraj} disabled={loading} data-tour="rodovnik-generiraj-btn">
				{#if loading}
					<span class="animate-spin mr-2">↻</span> Generiranje...
				{:else}
					Generiraj PDF
				{/if}
			</button>
		</div>
	</div>
</div>
