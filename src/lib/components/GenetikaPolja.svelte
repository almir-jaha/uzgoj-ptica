<script lang="ts">
	import type { GenetikaPolje } from '$lib/utils/genetika-schema';
	import PoljePrikaz from './PoljePrikaz.svelte';

	export let polja: GenetikaPolje[] = [];
	export let genetika: Record<string, unknown> = {};
	export let disabled = false;

	$: genetikaPolja = polja.filter(p => p.sekcija === 'genetika');
	$: ocjenaPolja   = polja.filter(p => p.sekcija === 'ocjena');

	function setVal(kljuc: string, val: unknown) {
		genetika = { ...genetika, [kljuc]: val };
	}

	function setStars(kljuc: string, n: number) {
		const current = (genetika[kljuc] || 0);
		setVal(kljuc, current === n ? 0 : n);
	}
</script>

{#if genetikaPolja.length > 0}
	<div class="space-y-3">
		<p class="text-xs font-semibold text-surface-500 uppercase tracking-wide">Genetika i izgled</p>
		{#each genetikaPolja as polje (polje.kljuc)}
			<PoljePrikaz
				{polje}
				{genetika}
				{disabled}
				onSetVal={setVal}
				onSetStars={setStars}
			/>
		{/each}
	</div>
{/if}

{#if ocjenaPolja.length > 0}
	<div class="space-y-3">
		<p class="text-xs font-semibold text-surface-500 uppercase tracking-wide">Ocjena kvaliteta</p>
		{#each ocjenaPolja as polje (polje.kljuc)}
			<PoljePrikaz
				{polje}
				{genetika}
				{disabled}
				onSetVal={setVal}
				onSetStars={setStars}
			/>
		{/each}
	</div>
{/if}
