<script lang="ts">
	import type { GenetikaPolje } from '$lib/utils/genetika-schema';
	import { t } from '$lib/i18n';
	import { genetikaLabels } from '$lib/stores/genetikaI18n';

	export let polje: GenetikaPolje;
	export let genetika: Record<string, unknown>;
	export let disabled = false;

	export let onSetVal: (kljuc: string, val: unknown) => void;
	export let onSetStars: (kljuc: string, n: number) => void;

	// Tags — lokalni input state, ne treba prolaziti kroz parenta
	let tagInputVal = '';

	function getTags(): string[] {
		const v = genetika[polje.kljuc];
		if (Array.isArray(v)) return v as string[];
		if (typeof v === 'string' && v) return [v];
		return [];
	}

	function addTag() {
		const input = tagInputVal.trim();
		if (!input) return;
		const current = getTags();
		if (!current.includes(input)) onSetVal(polje.kljuc, [...current, input]);
		tagInputVal = '';
	}

	function removeTag(tag: string) {
		onSetVal(polje.kljuc, getTags().filter(t => t !== tag));
	}

	function handleTagKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') { e.preventDefault(); addTag(); }
	}

	$: starValue = Number(genetika[polje.kljuc] || 0);
</script>

{#if polje.tip === 'select'}
	<label class="label">
		<span class="text-sm">{$genetikaLabels[polje.kljuc] ?? $t.genetikaPolja.polja[polje.kljuc] ?? polje.naziv}</span>
		<select
			class="select select-sm"
			value={String(genetika[polje.kljuc] ?? '')}
			on:change={(e) => onSetVal(polje.kljuc, e.currentTarget.value)}
			{disabled}
		>
			{#each (polje.opcije ?? []) as opt}
				<option value={opt}>{opt || '— nije odabrano —'}</option>
			{/each}
		</select>
	</label>

{:else if polje.tip === 'text'}
	<label class="label">
		<span class="text-sm">{$genetikaLabels[polje.kljuc] ?? $t.genetikaPolja.polja[polje.kljuc] ?? polje.naziv}</span>
		<input
			class="input input-sm"
			type="text"
			list="dl-{polje.kljuc}"
			value={String(genetika[polje.kljuc] ?? '')}
			on:input={(e) => onSetVal(polje.kljuc, e.currentTarget.value)}
			placeholder={polje.placeholder ?? ''}
			{disabled}
		/>
		{#if polje.opcije?.length}
			<datalist id="dl-{polje.kljuc}">
				{#each polje.opcije as opt}<option value={opt} />{/each}
			</datalist>
		{/if}
	</label>

{:else if polje.tip === 'tags'}
	<div class="space-y-1.5">
		<span class="text-sm">{$genetikaLabels[polje.kljuc] ?? $t.genetikaPolja.polja[polje.kljuc] ?? polje.naziv}</span>
		{#if getTags().length > 0}
			<div class="flex flex-wrap gap-1">
				{#each getTags() as tag}
					<span class="badge variant-filled-secondary text-xs">
						{tag}
						{#if !disabled}
							<button type="button" class="ml-1 opacity-70 hover:opacity-100"
								on:click={() => removeTag(tag)}>×</button>
						{/if}
					</span>
				{/each}
			</div>
		{/if}
		{#if !disabled}
			<div class="flex gap-1">
				<input
					class="input input-sm flex-1"
					type="text"
					list="dl-tags-{polje.kljuc}"
					bind:value={tagInputVal}
					placeholder="Dodaj..."
					on:keydown={handleTagKeydown}
				/>
				{#if polje.opcije?.length}
					<datalist id="dl-tags-{polje.kljuc}">
						{#each polje.opcije as opt}<option value={opt} />{/each}
					</datalist>
				{/if}
				<button type="button" class="btn btn-sm variant-soft"
					on:click={addTag}>+</button>
			</div>
		{/if}
	</div>

{:else if polje.tip === 'number'}
	<label class="label">
		<span class="text-sm">{$genetikaLabels[polje.kljuc] ?? $t.genetikaPolja.polja[polje.kljuc] ?? polje.naziv}</span>
		<input
			class="input input-sm"
			type="number"
			min={polje.min ?? 0}
			max={polje.max ?? 999}
			value={genetika[polje.kljuc] || ''}
			on:input={(e) => onSetVal(polje.kljuc, e.currentTarget.valueAsNumber || undefined)}
			placeholder={polje.placeholder ?? ''}
			{disabled}
		/>
	</label>

{:else if polje.tip === 'stars'}
	<div class="space-y-1">
		<span class="text-sm">{$genetikaLabels[polje.kljuc] ?? $t.genetikaPolja.polja[polje.kljuc] ?? polje.naziv}</span>
		<div class="flex gap-1 items-center">
			{#each [1, 2, 3, 4, 5] as n}
				<button
					type="button"
					class="text-xl leading-none transition-colors
						{n <= starValue ? 'text-warning-500' : 'text-surface-300'}
						{disabled ? 'cursor-default' : 'hover:text-warning-400 cursor-pointer'}"
					on:click={() => !disabled && onSetStars(polje.kljuc, n)}
					title="{n}/5"
				>★</button>
			{/each}
			{#if starValue > 0}
				<span class="text-xs text-surface-500 ml-1">{starValue}/5</span>
			{/if}
		</div>
	</div>
{/if}
