<script lang="ts">
	import { onMount } from 'svelte';
	import { user } from '$lib/stores/auth';
	import { t } from '$lib/i18n';
	import { locale } from '$lib/i18n/locale';
	import { bs } from '$lib/i18n/bs';
	import { flattenTranslations } from '$lib/i18n/flatten';
	import { supabase } from '$lib/supabase/client';
	import type { FazaCiklusa, VrstaPtica, PrijevodIzvor } from '$lib/db/schema';
	import PrijedlogModal from '$lib/components/PrijedlogModal.svelte';

	let faze: FazaCiklusa[] = [];
	let vrste: VrstaPtica[] = [];
	let loading = true;

	onMount(async () => {
		const [fazeRes, vrsteRes] = await Promise.all([
			supabase.from('faze_ciklusa').select('*').order('vrsta_ptica_id').order('redoslijed'),
			supabase.from('vrsta_ptica').select('*').order('naziv')
		]);
		faze = fazeRes.data ?? [];
		vrste = vrsteRes.data ?? [];
		loading = false;
	});

	$: bsFlat = flattenTranslations(bs as unknown as Record<string, unknown>);
	$: trenutniFlat = flattenTranslations($t as unknown as Record<string, unknown>);
	$: uiTermini = Object.keys(bsFlat)
		.sort()
		.map((kljuc) => ({
			kljuc,
			bsOriginal: bsFlat[kljuc],
			trenutni: trenutniFlat[kljuc] ?? bsFlat[kljuc]
		}));

	interface ModalStanje {
		terminKljuc: string;
		bsOriginal: string;
		trenutniPrijevod: string;
		izvor: PrijevodIzvor;
		izvorId: string | null;
	}
	let aktivniModal: ModalStanje | null = null;
</script>

<svelte:head>
	<title>{$t.prijevodi.pageTitle}</title>
</svelte:head>

<div class="container mx-auto p-4 space-y-6 max-w-4xl">
	<div>
		<h2 class="h3 font-bold">💬 {$t.prijevodi.naslov}</h2>
		<p class="text-sm text-surface-500">
			{$t.prijevodi.opis}
		</p>
	</div>

	<!-- Sekcija 1: UI termini -->
	<section class="space-y-2">
		<h3 class="h4 font-bold">{$t.prijevodi.sekcijaUiTermini} ({$locale})</h3>
		<div class="card overflow-x-auto">
			<table class="table table-compact w-full text-sm">
				<thead>
					<tr>
						<th>{$t.prijevodi.kljucTh}</th>
						<th>{$t.prijevodi.trenutniPrijevod}</th>
						<th class="w-10"></th>
					</tr>
				</thead>
				<tbody>
					{#each uiTermini as termin (termin.kljuc)}
						<tr>
							<td class="font-mono text-xs text-surface-500 break-all">{termin.kljuc}</td>
							<td>{termin.trenutni}</td>
							<td>
								<button
									class="btn-icon btn-icon-sm variant-ghost"
									title={$t.prijevodi.predloziIkonaTitle}
									on:click={() =>
										(aktivniModal = {
											terminKljuc: termin.kljuc,
											bsOriginal: termin.bsOriginal,
											trenutniPrijevod: termin.trenutni,
											izvor: 'i18n',
											izvorId: null
										})}
								>
									💬
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<!-- Sekcija 2: Faze ciklusa -->
	<section class="space-y-2">
		<h3 class="h4 font-bold">{$t.prijevodi.sekcijaFazeCiklusa}</h3>
		{#if loading}
			<p class="text-sm text-surface-400 italic px-3 py-2">{$t.common.ucitavanje}</p>
		{:else if faze.length === 0}
			<p class="text-sm text-surface-400 italic px-3 py-2">{$t.prijevodi.nemaFaza}</p>
		{:else}
			<div class="card overflow-x-auto">
				<table class="table table-compact w-full text-sm">
					<thead>
						<tr>
							<th>{$t.prijevodi.nazivBsTh}</th>
							<th>{$t.prijevodi.prijevodTh} ({$locale})</th>
							<th class="w-10"></th>
						</tr>
					</thead>
					<tbody>
						{#each faze as faza (faza.id)}
							{@const trenutniNaziv = faza.nazivi_jezicima?.[$locale] ?? faza.naziv}
							<tr>
								<td>{faza.naziv}</td>
								<td>{trenutniNaziv}</td>
								<td>
									<button
										class="btn-icon btn-icon-sm variant-ghost"
										title={$t.prijevodi.predloziIkonaTitle}
										on:click={() =>
											(aktivniModal = {
												terminKljuc: faza.naziv,
												bsOriginal: faza.naziv,
												trenutniPrijevod: trenutniNaziv,
												izvor: 'faza_ciklusa',
												izvorId: faza.id
											})}
									>
										💬
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>

	<!-- Sekcija 3: Vrste ptica -->
	<section class="space-y-2">
		<h3 class="h4 font-bold">{$t.prijevodi.sekcijaVrstePtica}</h3>
		{#if loading}
			<p class="text-sm text-surface-400 italic px-3 py-2">{$t.common.ucitavanje}</p>
		{:else if vrste.length === 0}
			<p class="text-sm text-surface-400 italic px-3 py-2">{$t.prijevodi.nemaVrsta}</p>
		{:else}
			<div class="card overflow-x-auto">
				<table class="table table-compact w-full text-sm">
					<thead>
						<tr>
							<th>{$t.prijevodi.nazivBsTh}</th>
							<th>{$t.prijevodi.prijevodTh} ({$locale})</th>
							<th class="w-10"></th>
						</tr>
					</thead>
					<tbody>
						{#each vrste as vrsta (vrsta.id)}
							{@const trenutniNaziv = vrsta.nazivi_jezicima?.[$locale] ?? vrsta.naziv}
							<tr>
								<td>{vrsta.naziv}</td>
								<td>{trenutniNaziv}</td>
								<td>
									<button
										class="btn-icon btn-icon-sm variant-ghost"
										title={$t.prijevodi.predloziIkonaTitle}
										on:click={() =>
											(aktivniModal = {
												terminKljuc: vrsta.naziv,
												bsOriginal: vrsta.naziv,
												trenutniPrijevod: trenutniNaziv,
												izvor: 'vrsta_ptica',
												izvorId: vrsta.id
											})}
									>
										💬
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>
</div>

{#if aktivniModal && $user}
	<PrijedlogModal
		terminKljuc={aktivniModal.terminKljuc}
		bsOriginal={aktivniModal.bsOriginal}
		trenutniPrijevod={aktivniModal.trenutniPrijevod}
		jezik={$locale}
		izvor={aktivniModal.izvor}
		izvorId={aktivniModal.izvorId}
		userId={$user.id}
		onClose={() => (aktivniModal = null)}
	/>
{/if}
