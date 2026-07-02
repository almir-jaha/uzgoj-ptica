<script lang="ts">
	import { LANGUAGES, type LangCode } from '$lib/i18n/locale';
	import type { GenetikaPoljaI18n } from '$lib/db/schema';

	export let polje: Partial<GenetikaPoljaI18n> | null = null;
	export let opcijeBs: string[] = []; // BS opcije (za prikaz broja i primjera)
	export let hasOpcije = false;       // true za select/tags tipove
	export let loading = false;

	let nazivi: Record<LangCode, string> = {} as Record<LangCode, string>;
	let opisi: Record<LangCode, string> = {} as Record<LangCode, string>;
	let placeholderi: Record<LangCode, string> = {} as Record<LangCode, string>;
	// Opcije po jeziku kao comma-separated string (radi lakšeg unosa)
	let opcijeStr: Record<LangCode, string> = {} as Record<LangCode, string>;

	$: {
		const allLangs = Object.keys(LANGUAGES) as LangCode[];
		if (!polje) {
			nazivi = Object.fromEntries(allLangs.map((l) => [l, ''])) as Record<LangCode, string>;
			opisi = Object.fromEntries(allLangs.map((l) => [l, ''])) as Record<LangCode, string>;
			placeholderi = Object.fromEntries(allLangs.map((l) => [l, ''])) as Record<LangCode, string>;
			opcijeStr = Object.fromEntries(allLangs.map((l) => [l, ''])) as Record<LangCode, string>;
		} else if (polje.nazivi_jezicima) {
			nazivi = { ...polje.nazivi_jezicima } as Record<LangCode, string>;
			opisi = { ...(polje.opisi_jezicima ?? {}) } as Record<LangCode, string>;
			placeholderi = { ...(polje.placeholder_jezicima ?? {}) } as Record<LangCode, string>;
			// Konvertuj postojeće opcije_jezicima (string[]) u comma-separated stringove
			const existingOpcije = polje.opcije_jezicima as Record<string, string[]> | undefined;
			opcijeStr = Object.fromEntries(
				allLangs.map((l) => [l, (existingOpcije?.[l] ?? []).join(', ')])
			) as Record<LangCode, string>;
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

	function updateOpcijeStr(lang: LangCode, value: string) {
		opcijeStr[lang] = value;
		opcijeStr = opcijeStr;
	}

	function lc(code: string): LangCode {
		return code as LangCode;
	}

	export function getJSONBData() {
		// Konvertuj comma-separated stringove u string[] i filtriraj prazne
		const opcije_jezicima: Record<string, string[]> = {};
		for (const [lang, str] of Object.entries(opcijeStr)) {
			const arr = str.split(',').map((s) => s.trim()).filter(Boolean);
			if (arr.length > 0) opcije_jezicima[lang] = arr;
		}
		return {
			nazivi_jezicima: nazivi,
			opisi_jezicima: opisi,
			placeholder_jezicima: placeholderi,
			...(hasOpcije ? { opcije_jezicima } : {})
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
						value={nazivi[lc(code)] ?? ''}
						on:input={(e) => updateNaziv(lc(code), e.currentTarget.value)}
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
						value={opisi[lc(code)] ?? ''}
						on:input={(e) => updateOpis(lc(code), e.currentTarget.value)}
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
						value={placeholderi[lc(code)] ?? ''}
						on:input={(e) => updatePlaceholder(lc(code), e.currentTarget.value)}
						disabled={loading}
					/>
				</label>
			{/each}
		</div>
	</div>

	<!-- Prevodi opcija (samo za select/tags tipove) -->
	{#if hasOpcije}
		<div class="space-y-3">
			<div>
				<h4 class="text-sm font-semibold">Prevodi opcija</h4>
				{#if opcijeBs.length > 0}
					<p class="text-xs text-surface-500 mt-1">
						BS opcije: <span class="font-mono">{opcijeBs.join(', ')}</span>
					</p>
					<p class="text-xs text-surface-400">Unesi iste opcije prevedene, istim redoslijedom, odvojene zarezom.</p>
				{/if}
			</div>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
				{#each Object.entries(LANGUAGES) as [code, meta]}
					{#if code !== 'bs'}
						<label class="label">
							<span class="text-xs font-medium">{meta.flag} {meta.naziv}</span>
							<input
								class="input input-sm"
								type="text"
								placeholder="{opcijeBs.join(', ') || 'Opcija1, Opcija2, ...'}"
								value={opcijeStr[lc(code)] ?? ''}
								on:input={(e) => updateOpcijeStr(lc(code), e.currentTarget.value)}
								disabled={loading}
							/>
						</label>
					{/if}
				{/each}
			</div>
		</div>
	{/if}
</div>
