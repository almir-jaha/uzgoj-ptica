<script lang="ts">
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	export let node: any; // BirdNode
	export let level: number = 1; // 1=otac/majka, 2=djed/baka, 3=pradjed/prabaka
	export let roleLabel: string = '';

	let expanded = level === 1;

	$: hasParents = !!(node?.otac || node?.majka);
	$: isMale = node?.spol === 'M';
	$: isFemale = node?.spol === 'Ž';

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function prstenStr(p: any): string {
		if (p.prstena_oznaka && p.prsten_redni_broj != null) return `${p.prstena_oznaka}-${p.prsten_redni_broj}`;
		if (p.prstena_oznaka) return p.prstena_oznaka;
		if (p.prsten_redni_broj != null) return `#${p.prsten_redni_broj}`;
		return '';
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function displayName(p: any): string {
		return p.naziv || prstenStr(p) || p.id?.slice(0, 8) || '?';
	}

	function childRoles(level: number): [string, string] {
		if (level === 1) return ['Djed', 'Baka'];
		return ['Pradjed', 'Prabaka'];
	}
</script>

{#if node}
<div>
	<div
		class="rounded-xl border-l-[3px] bg-white shadow-sm overflow-hidden"
		class:border-blue-400={isMale}
		class:border-pink-400={isFemale}
		class:border-gray-300={!isMale && !isFemale}
	>
		<button
			class="w-full text-left p-3 flex items-start gap-2 hover:bg-gray-50 transition-colors"
			on:click={() => { if (hasParents && level < 3) expanded = !expanded; }}
			disabled={!hasParents || level >= 3}
		>
			<span
				class="text-lg leading-none mt-0.5 shrink-0"
				class:text-blue-500={isMale}
				class:text-pink-500={isFemale}
				class:text-gray-400={!isMale && !isFemale}
			>
				{isMale ? '♂' : isFemale ? '♀' : '?'}
			</span>

			<div class="flex-1 min-w-0">
				{#if roleLabel}
				<p class="text-[10px] font-bold uppercase tracking-widest mb-0.5"
					class:text-blue-400={isMale}
					class:text-pink-400={isFemale}
					class:text-gray-400={!isMale && !isFemale}
				>{roleLabel}</p>
				{/if}
				<p class="font-semibold text-gray-900 text-sm truncate">{displayName(node)}</p>
				{#if node.naziv && prstenStr(node)}
				<p class="text-xs text-gray-500 truncate">{prstenStr(node)}</p>
				{/if}
				<div class="flex flex-wrap items-center gap-x-2 mt-0.5">
					{#if node.vrsta_naziv}
					<span class="text-xs text-gray-500">{node.vrsta_naziv}</span>
					{/if}
					{#if node.boja}
					<span class="text-xs text-gray-600 font-medium">· {node.boja}</span>
					{/if}
					{#if node.godina}
					<span class="text-xs text-gray-400">· {node.godina}</span>
					{/if}
				</div>
			</div>

			{#if hasParents && level < 3}
			<span class="shrink-0 text-gray-400 text-sm font-bold mt-1">{expanded ? '−' : '+'}</span>
			{/if}
		</button>
	</div>

	{#if expanded && hasParents && level < 3}
	{@const [roleOtac, roleMajka] = childRoles(level)}
	<div class="mt-1.5 ml-5 pl-3 border-l-2 border-gray-100 space-y-1.5">
		{#if node.otac}
		<svelte:self node={node.otac} level={level + 1} roleLabel={roleOtac} />
		{/if}
		{#if node.majka}
		<svelte:self node={node.majka} level={level + 1} roleLabel={roleMajka} />
		{/if}
	</div>
	{/if}
</div>
{:else}
<div class="rounded-xl border-l-[3px] border-gray-200 bg-gray-50 p-3">
	{#if roleLabel}
	<p class="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">{roleLabel}</p>
	{/if}
	<p class="text-sm text-gray-400 italic">Nepoznato porijeklo</p>
</div>
{/if}
