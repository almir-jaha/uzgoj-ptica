<script lang="ts">
	import type { GenetikaPolje } from '$lib/utils/genetika-schema';

	export let polja: GenetikaPolje[] = [];
	export let genetika: Record<string, unknown> = {};
	export let disabled = false;

	// Sekcije
	$: genetikaPolja = polja.filter(p => p.sekcija === 'genetika');
	$: ocjenaPolja = polja.filter(p => p.sekcija === 'ocjena');

	// Tags input state
	let tagInputi: Record<string, string> = {};

	function getStr(kljuc: string): string {
		return (genetika[kljuc] as string) ?? '';
	}

	function getNum(kljuc: string): number {
		return (genetika[kljuc] as number) ?? 0;
	}

	function getTags(kljuc: string): string[] {
		const v = genetika[kljuc];
		if (Array.isArray(v)) return v as string[];
		if (typeof v === 'string' && v) return [v];
		return [];
	}

	function setVal(kljuc: string, val: unknown) {
		genetika = { ...genetika, [kljuc]: val };
	}

	function addTag(kljuc: string) {
		const input = (tagInputi[kljuc] ?? '').trim();
		if (!input) return;
		const current = getTags(kljuc);
		if (!current.includes(input)) setVal(kljuc, [...current, input]);
		tagInputi = { ...tagInputi, [kljuc]: '' };
	}

	function removeTag(kljuc: string, tag: string) {
		setVal(kljuc, getTags(kljuc).filter(t => t !== tag));
	}

	function handleTagKeydown(e: KeyboardEvent, kljuc: string) {
		if (e.key === 'Enter') { e.preventDefault(); addTag(kljuc); }
	}

	function setStars(kljuc: string, val: number) {
		// Klik na istu zvjezdicu = briše ocjenu
		if (getNum(kljuc) === val) setVal(kljuc, 0);
		else setVal(kljuc, val);
	}
</script>

{#if genetikaPolja.length > 0}
	<div class="space-y-3">
		<p class="text-xs font-semibold text-surface-500 uppercase tracking-wide">Genetika i izgled</p>

		{#each genetikaPolja as polje (polje.kljuc)}
			{#if polje.tip === 'select'}
				<label class="label">
					<span class="text-sm">{polje.naziv}</span>
					<select
						class="select select-sm"
						value={getStr(polje.kljuc)}
						on:change={(e) => setVal(polje.kljuc, e.currentTarget.value)}
						{disabled}
					>
						{#each (polje.opcije ?? []) as opt}
							<option value={opt}>{opt || '— nije odabrano —'}</option>
						{/each}
					</select>
				</label>

			{:else if polje.tip === 'text'}
				<label class="label">
					<span class="text-sm">{polje.naziv}</span>
					<input
						class="input input-sm"
						type="text"
						list="dl-{polje.kljuc}"
						value={getStr(polje.kljuc)}
						on:input={(e) => setVal(polje.kljuc, e.currentTarget.value)}
						placeholder={polje.placeholder ?? ''}
						{disabled}
					/>
					{#if polje.opcije?.length}
						<datalist id="dl-{polje.kljuc}">
							{#each polje.opcije as opt}
								<option value={opt} />
							{/each}
						</datalist>
					{/if}
				</label>

			{:else if polje.tip === 'tags'}
				<div class="space-y-1.5">
					<span class="text-sm">{polje.naziv}</span>
					<!-- Prikaz tagova -->
					{#if getTags(polje.kljuc).length > 0}
						<div class="flex flex-wrap gap-1">
							{#each getTags(polje.kljuc) as tag}
								<span class="badge variant-filled-secondary text-xs">
									{tag}
									{#if !disabled}
										<button
											type="button"
											class="ml-1 opacity-70 hover:opacity-100"
											on:click={() => removeTag(polje.kljuc, tag)}
										>×</button>
									{/if}
								</span>
							{/each}
						</div>
					{/if}
					<!-- Unos novog taga -->
					{#if !disabled}
						<div class="flex gap-1">
							<input
								class="input input-sm flex-1"
								type="text"
								list="dl-tags-{polje.kljuc}"
								bind:value={tagInputi[polje.kljuc]}
								placeholder="Dodaj mutaciju..."
								on:keydown={(e) => handleTagKeydown(e, polje.kljuc)}
							/>
							{#if polje.opcije?.length}
								<datalist id="dl-tags-{polje.kljuc}">
									{#each polje.opcije as opt}
										<option value={opt} />
									{/each}
								</datalist>
							{/if}
							<button
								type="button"
								class="btn btn-sm variant-soft"
								on:click={() => addTag(polje.kljuc)}
							>+</button>
						</div>
					{/if}
				</div>

			{:else if polje.tip === 'number'}
				<label class="label">
					<span class="text-sm">{polje.naziv}</span>
					<input
						class="input input-sm"
						type="number"
						min={polje.min ?? 0}
						max={polje.max ?? 999}
						value={getNum(polje.kljuc) || ''}
						on:input={(e) => setVal(polje.kljuc, e.currentTarget.valueAsNumber || undefined)}
						placeholder={polje.placeholder ?? ''}
						{disabled}
					/>
				</label>
			{/if}
		{/each}
	</div>
{/if}

{#if ocjenaPolja.length > 0}
	<div class="space-y-3">
		<p class="text-xs font-semibold text-surface-500 uppercase tracking-wide">Ocjena kvaliteta</p>

		{#each ocjenaPolja as polje (polje.kljuc)}
			<div class="space-y-1">
				<span class="text-sm">{polje.naziv}</span>
				<div class="flex gap-1">
					{#each [1, 2, 3, 4, 5] as n}
						<button
							type="button"
							class="text-xl leading-none transition-all {n <= getNum(polje.kljuc) ? 'text-warning-500' : 'text-surface-300'} {disabled ? 'cursor-default' : 'hover:text-warning-400 cursor-pointer'}"
							on:click={() => !disabled && setStars(polje.kljuc, n)}
							title="{n}/5"
						>★</button>
					{/each}
					{#if getNum(polje.kljuc) > 0}
						<span class="text-xs text-surface-500 self-center ml-1">{getNum(polje.kljuc)}/5</span>
					{/if}
				</div>
			</div>
		{/each}
	</div>
{/if}
