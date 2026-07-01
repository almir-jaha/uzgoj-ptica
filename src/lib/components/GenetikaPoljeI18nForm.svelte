<script lang="ts">
	import { LANGUAGES, type LangCode } from '$lib/i18n/locale';
	import type { GenetikaPoljaI18n } from '$lib/db/schema';

	export let polje: Partial<GenetikaPoljaI18n> | null = null;
	export let loading = false;

	let nazivi: Record<LangCode, string> = {};
	let opisi: Record<LangCode, string> = {};
	let placeholderi: Record<LangCode, string> = {};

	$: {
		if (!polje) {
			const allLangs = Object.keys(LANGUAGES) as LangCode[];
			nazivi = Object.fromEntries(
				allLangs.map((l) => [l, ''])
			) as Record<LangCode, string>;
			opisi = Object.fromEntries(
				allLangs.map((l) => [l, ''])
			) as Record<LangCode, string>;
			placeholderi = Object.fromEntries(
				allLangs.map((l) => [l, ''])
			) as Record<LangCode, string>;
		} else if (polje.nazivi_jezicima) {
			nazivi = { ...polje.nazivi_jezicima } as Record<LangCode, string>;
			opisi = { ...(polje.opisi_jezicima ?? {}) } as Record<LangCode, string>;
			placeholderi = { ...(polje.placeholder_jezicima ?? {}) } as Record<
				LangCode,
				string
			>;
		}
	}

	function updateNaziv(lang: LangCode, value: string) {
		nazivi[lang] = value;
		nazivi = nazivi;
	}

	function updateOpis(lang: LangCode, value: string) {
		opisi[lang] = value;
		opisi = opisi;
	}

	function updatePlaceholder(lang: LangCode, value: string) {
		placeholderi[lang] = value;
		placeholderi = placeholderi;
	}

	export function getJSONBData() {
		return {
			nazivi_jezicima: nazivi,
			opisi_jezicima: opisi,
			placeholder_jezicima: placeholderi
		};
	}
</script>

<div class="space-y-6">
	<!-- Prevodi naziv -->
	<div class="space-y-3">
		<h4 class="text-sm font-semibold">Prevodi naziv (17 jezika)</h4>
		<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
			{#each Object.entries(LANGUAGES) as [code, meta]}
				<label class="label">
					<span class="text-xs font-medium">{meta.flag} {meta.naziv}</span>
					<input
						class="input input-sm"
						type="text"
						placeholder="Naziv na {meta.naziv}..."
						value={nazivi[code as LangCode] ?? ''}
						on:input={(e) => updateNaziv(code as LangCode, e.currentTarget.value)}
						disabled={loading}
					/>
				</label>
			{/each}
		</div>
	</div>

	<!-- Opisi (opciono) -->
	<div class="space-y-3">
		<h4 class="text-sm font-semibold">Opisi (opciono)</h4>
		<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
			{#each Object.entries(LANGUAGES) as [code, meta]}
				<label class="label">
					<span class="text-xs font-medium">{meta.flag} Opis</span>
					<input
						class="input input-sm"
						type="text"
						placeholder="Opis na {meta.naziv}..."
						value={opisi[code as LangCode] ?? ''}
						on:input={(e) => updateOpis(code as LangCode, e.currentTarget.value)}
						disabled={loading}
					/>
				</label>
			{/each}
		</div>
	</div>

	<!-- Placeholderi -->
	<div class="space-y-3">
		<h4 class="text-sm font-semibold">Placeholderi (primjeri)</h4>
		<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
			{#each Object.entries(LANGUAGES) as [code, meta]}
				<label class="label">
					<span class="text-xs font-medium">{meta.flag} Placeholder</span>
					<input
						class="input input-sm"
						type="text"
						placeholder="npr. Lutino..."
						value={placeholderi[code as LangCode] ?? ''}
						on:input={(e) =>
							updatePlaceholder(code as LangCode, e.currentTarget.value)}
						disabled={loading}
					/>
				</label>
			{/each}
		</div>
	</div>
</div>
