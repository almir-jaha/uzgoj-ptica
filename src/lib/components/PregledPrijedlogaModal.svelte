<script lang="ts">
	import type { PrijevodPrijedlog } from '$lib/db/schema';

	export let prijedlog: PrijevodPrijedlog;
	export let bsOriginal: string;
	export let loading = false;
	export let onPrihvati: () => void;
	export let onOdbij: () => void;
	export let onClose: () => void;
</script>

<div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
	<div class="card w-full max-w-md p-5 space-y-4">
		<header class="flex items-center justify-between">
			<h3 class="h4 font-bold">💬 Pregled prijedloga</h3>
			<button class="btn-icon btn-icon-sm variant-ghost" on:click={onClose} disabled={loading}>✕</button>
		</header>

		<div class="flex items-center justify-between gap-2">
			<span class="font-mono text-xs text-surface-500 break-all">{prijedlog.termin_kljuc}</span>
			<div class="flex gap-1 shrink-0">
				<span class="badge variant-soft-secondary text-xs">{prijedlog.izvor}</span>
				<span class="badge variant-soft text-xs">{prijedlog.jezik}</span>
			</div>
		</div>

		<div class="space-y-3">
			<div>
				<p class="text-xs font-medium text-surface-500">Bosanski original</p>
				<p class="text-sm">{bsOriginal}</p>
			</div>
			<div>
				<p class="text-xs font-medium text-surface-500">Trenutni prijevod ({prijedlog.jezik})</p>
				<p class="text-sm">{prijedlog.trenutni_prijevod}</p>
			</div>
			<div>
				<p class="text-xs font-medium text-surface-500">Predloženi prijevod</p>
				<p class="text-sm font-medium">{prijedlog.prijedlog}</p>
			</div>
			<div>
				<p class="text-xs font-medium text-surface-500">Razlog / komentar korisnika</p>
				{#if prijedlog.komentar}
					<p class="text-sm italic">"{prijedlog.komentar}"</p>
				{:else}
					<p class="text-sm text-surface-400 italic">— nije naveden —</p>
				{/if}
			</div>
		</div>

		<div class="flex gap-2 pt-2">
			<button
				class="btn variant-filled-success flex-1"
				disabled={loading}
				on:click={onPrihvati}
			>
				{loading ? '...' : '✓ Prihvati'}
			</button>
			<button
				class="btn variant-ghost-error flex-1"
				disabled={loading}
				on:click={onOdbij}
			>
				✕ Odbij
			</button>
		</div>
	</div>
</div>
