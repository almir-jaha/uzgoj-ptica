<script lang="ts">
	import { supabase } from '$lib/supabase/client';
	import { createZdravlje, tipOpcije } from '$lib/stores/zdravlje';
	import type { Ptica, Sekcija, ZdravljeTip } from '$lib/db/schema';
	import { t } from '$lib/i18n';

	export let userId: string;
	export let uzgajivacnicaId: string;
	export let sekcije: Sekcija[] = [];
	export let svePtice: Ptica[] = [];
	export let aktivnaSezonaId: string | undefined = undefined;
	export let onClose: () => void;
	export let onSuccess: () => void;

	const today = new Date().toISOString().split('T')[0];

	let sekcijaId = sekcije[0]?.id ?? '';
	let tip: ZdravljeTip = 'preventiva';
	let naziv = '';
	let datum = today;
	let opis = '';
	let lijek = '';
	let trajanje: number | '' = '';
	let saving = false;
	let errorMsg = '';

	// Ptice u sekciji
	let pticaUSekciji: Ptica[] = [];
	let loadingPtice = false;
	let ucitanoPtice = false;

	$: odabranaSekcija = sekcije.find((s) => s.id === sekcijaId);

	// Automatski učitaj ptice kad se promijeni sekcija
	$: if (sekcijaId) {
		ucitajPticeSekcije(sekcijaId);
	}

	async function ucitajPticeSekcije(sid: string) {
		loadingPtice = true;
		ucitanoPtice = false;
		pticaUSekciji = [];
		try {
			// Kavezi u ovoj sekciji
			const { data: kavezi } = await supabase
				.from('kavezi')
				.select('id')
				.eq('sekcija_id', sid);

			if (!kavezi?.length) { ucitanoPtice = true; return; }

			const kavezIds = kavezi.map((k: { id: string }) => k.id);

			// Aktivni ciklusi u tim kavezima
			const { data: ciklusi } = await supabase
				.from('ciklusi')
				.select('par_id')
				.in('kavez_id', kavezIds)
				.eq('status', 'aktivan');

			if (!ciklusi?.length) { ucitanoPtice = true; return; }

			const parIds = [...new Set(ciklusi.map((c: { par_id: string }) => c.par_id))];

			// Parovi → IDs ptica
			const { data: parovi } = await supabase
				.from('parovi')
				.select('ptica1_id, ptica2_id')
				.in('id', parIds);

			const pticaIds = new Set<string>();
			parovi?.forEach((p: { ptica1_id: string; ptica2_id: string }) => {
				if (p.ptica1_id) pticaIds.add(p.ptica1_id);
				if (p.ptica2_id) pticaIds.add(p.ptica2_id);
			});

			pticaUSekciji = svePtice.filter((p) => pticaIds.has(p.id));
		} catch {
			pticaUSekciji = [];
		} finally {
			loadingPtice = false;
			ucitanoPtice = true;
		}
	}

	function pticaLabel(p: Ptica): string {
		const prsten = p.prstena_oznaka
			? `${p.prstena_oznaka}${p.prsten_redni_broj != null ? `-${p.prsten_redni_broj}` : ''}`
			: null;
		return p.naziv || prsten || p.id.slice(0, 8);
	}

	async function handleSubmit() {
		if (!naziv.trim() || !sekcijaId || pticaUSekciji.length === 0) return;
		saving = true;
		errorMsg = '';
		try {
			// Jedan zapis po ptici — sa sekcija_id kao referenca i ptica_id za svaku pticu
			await Promise.all(
				pticaUSekciji.map((ptica) =>
					createZdravlje({
						user_id: userId,
						uzgajivacnica_id: uzgajivacnicaId || undefined,
						sezona_id: aktivnaSezonaId,
						sekcija_id: sekcijaId,
						ptica_id: ptica.id,
						datum,
						tip,
						naziv: naziv.trim(),
						opis: opis.trim() || undefined,
						lijek: lijek.trim() || undefined,
						trajanje_dana: trajanje !== '' ? Number(trajanje) : undefined
					})
				)
			);
			onSuccess();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : $t.masovniTretman.greska;
		} finally {
			saving = false;
		}
	}
</script>

<div
	class="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4"
	role="presentation"
	on:click|self={onClose}
	on:keydown={(e) => e.key === 'Escape' && onClose()}
>
	<div class="card w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
		<header class="flex items-center justify-between">
			<div>
				<h3 class="h4 font-bold">{$t.masovniTretman.title}</h3>
				<p class="text-xs text-surface-400 mt-0.5">{$t.masovniTretman.subtitle}</p>
			</div>
			<button class="btn-icon btn-icon-sm variant-ghost" on:click={onClose} disabled={saving}>✕</button>
		</header>

		<form class="space-y-4" on:submit|preventDefault={handleSubmit}>

			<!-- Sekcija -->
			{#if sekcije.length === 0}
				<aside class="alert variant-filled-warning py-2 px-3 text-sm">
					<p>{$t.masovniTretman.nemaSekcijaUpozorenje}</p>
				</aside>
			{:else}
				<label class="label">
					<span class="text-sm font-medium">🏠 {$t.masovniTretman.sekcijaLabel}</span>
					<select class="select" bind:value={sekcijaId} disabled={saving || loadingPtice}>
						{#each sekcije as s (s.id)}
							<option value={s.id}>{s.naziv}{s.opis ? ` — ${s.opis}` : ''}</option>
						{/each}
					</select>
				</label>

				<!-- Ptice u sekciji -->
				<div class="card p-3 space-y-2 variant-soft">
					<div class="flex items-center gap-2">
						<span class="text-sm font-medium">{$t.masovniTretman.pticePrimaju}</span>
						{#if loadingPtice}
							<span class="animate-spin text-xs">↻</span>
						{:else if ucitanoPtice}
							<span class="badge {pticaUSekciji.length > 0 ? 'variant-filled-success' : 'variant-soft-warning'} text-xs">
								{pticaUSekciji.length} {$t.masovniTretman.ptica}
							</span>
						{/if}
					</div>

					{#if ucitanoPtice && pticaUSekciji.length === 0}
						<p class="text-xs text-surface-400">{$t.masovniTretman.nemaPticaUSekciji}</p>
					{:else if pticaUSekciji.length > 0}
						<div class="flex flex-wrap gap-1">
							{#each pticaUSekciji as p (p.id)}
								<span class="badge variant-soft text-xs">
									{p.spol === 'M' ? '♂' : p.spol === 'Ž' ? '♀' : '?'}
									{pticaLabel(p)}
								</span>
							{/each}
						</div>
					{/if}
				</div>
			{/if}

			<!-- Tip tretmana -->
			<div class="space-y-1">
				<span class="text-sm font-medium">{$t.masovniTretman.tipTretmana}</span>
				<div class="flex flex-wrap gap-2">
					{#each $tipOpcije as opt (opt.value)}
						<button
							type="button"
							class="btn btn-sm {tip === opt.value ? 'variant-filled-primary' : 'variant-ghost-surface'}"
							on:click={() => (tip = opt.value)}
							disabled={saving}
						>
							{opt.ikona} {opt.label}
						</button>
					{/each}
				</div>
			</div>

			<!-- Naziv + datum -->
			<div class="grid grid-cols-2 gap-3">
				<label class="label col-span-2 sm:col-span-1">
					<span class="text-sm font-medium">{$t.masovniTretman.nazivLabel}</span>
					<input class="input" type="text" bind:value={naziv} placeholder={$t.masovniTretman.nazivPlaceholder} disabled={saving} />
				</label>
				<label class="label">
					<span class="text-sm font-medium">{$t.masovniTretman.datumLabel}</span>
					<input class="input" type="date" bind:value={datum} disabled={saving} />
				</label>
			</div>

			<!-- Lijek + trajanje -->
			<div class="grid grid-cols-2 gap-3">
				<label class="label">
					<span class="text-sm font-medium">{$t.masovniTretman.lijekLabel}</span>
					<input class="input" type="text" bind:value={lijek} placeholder={$t.masovniTretman.lijekPlaceholder} disabled={saving} />
				</label>
				<label class="label">
					<span class="text-sm font-medium">{$t.masovniTretman.trajanjeLabel}</span>
					<input class="input" type="number" bind:value={trajanje} min="1" max="365" disabled={saving} />
				</label>
			</div>

			<!-- Opis -->
			<label class="label">
				<span class="text-sm font-medium">{$t.masovniTretman.opisLabel}</span>
				<textarea class="textarea text-sm" rows="2" bind:value={opis} placeholder={$t.masovniTretman.opisPlaceholder} disabled={saving}></textarea>
			</label>

			{#if errorMsg}
				<aside class="alert variant-filled-error py-2 px-3 text-sm"><p>{errorMsg}</p></aside>
			{/if}

			<div class="flex gap-3 pt-1">
				<button class="btn variant-ghost flex-1" type="button" on:click={onClose} disabled={saving}>
					{$t.common.odustani}
				</button>
				<button
					class="btn variant-filled-primary flex-1"
					type="submit"
					disabled={saving || !naziv.trim() || !sekcijaId || pticaUSekciji.length === 0 || sekcije.length === 0}
				>
					{#if saving}<span class="animate-spin mr-2">↻</span>{/if}
					{$t.masovniTretman.snimiZa} {pticaUSekciji.length} {$t.masovniTretman.ptica}
				</button>
			</div>
		</form>
	</div>
</div>
