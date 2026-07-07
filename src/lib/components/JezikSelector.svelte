<script lang="ts">
	import { locale, LANGUAGES, t } from '$lib/i18n';
	import type { LangCode } from '$lib/i18n';

	let otvoren = false;

	function odaberi(lang: string) {
		locale.set(lang as LangCode);
		otvoren = false;
	}
</script>

<div class="relative">
	<button
		class="btn btn-sm variant-ghost-surface flex items-center gap-1.5 px-2"
		on:click={() => (otvoren = !otvoren)}
		title={$t.common.promijeniJezikTitle}
	>
		<span class="text-base leading-none">{LANGUAGES[$locale].flag}</span>
		<span class="text-xs hidden sm:inline">{LANGUAGES[$locale].naziv}</span>
		<span class="text-xs opacity-60">{otvoren ? '▲' : '▼'}</span>
	</button>

	{#if otvoren}
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<div
			class="fixed inset-0 z-40"
			role="presentation"
			on:click={() => (otvoren = false)}
		></div>
		<div class="absolute right-0 top-full mt-1 z-50 card shadow-xl p-1 w-max max-h-[400px] overflow-y-auto">
			{#each Object.entries(LANGUAGES) as [code, meta]}
				<button
					class="w-full flex items-center gap-2 px-3 py-1.5 rounded text-sm text-left
						{$locale === code ? 'bg-primary-500/20 font-semibold' : 'hover:bg-surface-200-700-token'}"
					on:click={() => odaberi(code)}
				>
					<span class="text-base">{meta.flag}</span>
					<span>{meta.naziv}</span>
				</button>
			{/each}
		</div>
	{/if}
</div>
