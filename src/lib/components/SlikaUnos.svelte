<script lang="ts">
	import { uploadImage } from '$lib/utils/storage';

	export let slika_url: string | undefined = undefined;
	export let bucket: 'ptice' | 'uzgajivaci';
	export let userId: string;
	export let disabled = false;
	export let label = 'Slika';
	export let roundedFull = false;

	let file: File | undefined;
	let preview: string | undefined = slika_url;
	let uploading = false;
	export let error = '';

	function handleSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		file = input.files?.[0];
		if (!file) return;
		preview = URL.createObjectURL(file);
	}

	export async function saveImage(): Promise<string | undefined> {
		if (!file) return slika_url;
		uploading = true;
		error = '';
		try {
			slika_url = await uploadImage(bucket, userId, file);
			file = undefined;
			return slika_url;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Greška pri uploadu slike';
			return slika_url;
		} finally {
			uploading = false;
		}
	}

	function ukloniSliku() {
		preview = undefined;
		slika_url = undefined;
		file = undefined;
	}
</script>

<div class="space-y-2">
	<p class="text-sm font-medium">{label}</p>

	{#if preview}
		<div class="relative inline-block">
			<img
				src={preview}
				alt={label}
				class="w-24 h-24 object-cover {roundedFull ? 'rounded-full' : 'rounded-lg'} border border-surface-300-600-token"
			/>
			{#if !disabled}
				<button
					type="button"
					class="absolute -top-1 -right-1 btn-icon btn-icon-sm variant-filled-error w-5 h-5 text-xs"
					on:click={ukloniSliku}
				>✕</button>
			{/if}
		</div>
	{/if}

	{#if !disabled}
		<label class="btn btn-sm variant-soft cursor-pointer inline-flex gap-2">
			{#if uploading}<span class="animate-spin">↻</span>{/if}
			<span>📷 {preview ? 'Zamijeni' : 'Odaberi sliku'}</span>
			<input
				type="file"
				accept="image/*"
				class="hidden"
				on:change={handleSelect}
				disabled={uploading}
			/>
		</label>
	{/if}

	{#if error}
		<p class="text-xs text-error-500">{error}</p>
	{/if}
</div>
