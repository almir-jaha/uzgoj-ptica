<script lang="ts">
	import { onMount } from 'svelte';
	import { createSezona, createKavez, aktivnaSezona } from '$lib/stores/sezona';
	import { loadSekcije } from '$lib/stores/sekcija';
	import type { Sekcija } from '$lib/db/schema';
	import { t } from '$lib/i18n';

	export let userId: string;
	export let uzgajivacnicaId: string = '';
	export let onClose: () => void;
	export let onSuccess: () => void;

	const currentYear = new Date().getFullYear();
	const today = new Date().toISOString().split('T')[0];

	let godina = currentYear;
	let datumPocetka = today;
	let naziv = '';
	let zavrsiTrenutnu = true;
	let loading = false;
	let errorMsg = '';

	// Sekcije za ovu uzgajivačnicu
	let sekcije: Sekcija[] = [];
	let sekcijeDist: { sekcija_id: string; naziv: string; broj_kaveza: number }[] = [];
	// 'kontinuirano' = 1,2,...,N ukupno | 'po_sekciji' = svaka sekcija od 1
	let numerisanje: 'kontinuirano' | 'po_sekciji' = 'kontinuirano';

	// Bez sekcija — stari jednostavni unos
	let brojKavezaBezSekcija = 10;

	$: imaSekcija = sekcije.length > 0;
	$: ukupnoKaveza = imaSekcija
		? sekcijeDist.reduce((s, r) => s + (r.broj_kaveza || 0), 0)
		: brojKavezaBezSekcija;

	// UI hint — scoped na aktivnu uzgajivačnicu via derivirani store
	$: duplikatGodina = $aktivnaSezona?.godina === godina && $aktivnaSezona?.status === 'aktiva';

	onMount(async () => {
		if (uzgajivacnicaId) {
			sekcije = await loadSekcijeLocal(uzgajivacnicaId);
			sekcijeDist = sekcije.map((s) => ({ sekcija_id: s.id, naziv: s.naziv, broj_kaveza: s.kapacitet_kaveza ?? 0 }));
		}
	});

	async function loadSekcijeLocal(uzId: string): Promise<Sekcija[]> {
		try {
			// Koristimo direktno store funkciju — vraća podatke u store, ne direktno
			// Učitamo iz Supabase direktno za modal
			const { supabase } = await import('$lib/supabase/client');
			const { data } = await supabase
				.from('sekcije')
				.select('*')
				.eq('uzgajivacnica_id', uzId)
				.order('redoslijed', { ascending: true });
			return data ?? [];
		} catch {
			return [];
		}
	}

	async function handleSubmit() {
		if (ukupnoKaveza < 1 || ukupnoKaveza > 200) return;
		loading = true;
		errorMsg = '';

		try {
			const sezona = await createSezona(
				userId,
				{
					user_id: userId,
					uzgajivacnica_id: uzgajivacnicaId || undefined,
					godina,
					naziv: naziv.trim() || $t.sezona.nazivPlaceholder.replace('{godina}', String(godina)),
					broj_kaveza: ukupnoKaveza,
					datum_pocetka: datumPocetka,
					status: 'aktiva'
				},
				zavrsiTrenutnu && $aktivnaSezona ? $aktivnaSezona.id : undefined
			);

			if (imaSekcija) {
				// Kreiraj kaveze po sekcijama
				let globalniRedni = 1;
				const promises: Promise<unknown>[] = [];

				for (const red of sekcijeDist) {
					if (!red.broj_kaveza || red.broj_kaveza < 1) continue;
					for (let i = 0; i < red.broj_kaveza; i++) {
						const oznaka = numerisanje === 'kontinuirano' ? globalniRedni : i + 1;
						promises.push(createKavez(sezona.id, userId, oznaka, undefined, red.sekcija_id));
						globalniRedni++;
					}
				}
				await Promise.all(promises);
			} else {
				// Bez sekcija — staro ponašanje
				await Promise.all(
					Array.from({ length: brojKavezaBezSekcija }, (_, i) =>
						createKavez(sezona.id, userId, i + 1)
					)
				);
			}

			onSuccess();
		} catch (err) {
			console.error('[NovaSezona] GREŠKA:', err);
			errorMsg = err instanceof Error ? err.message : $t.sezona.greska;
		} finally {
			loading = false;
		}
	}
</script>

<div
	class="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4"
	role="presentation"
	on:click|self={onClose}
	on:keydown={(e) => e.key === 'Escape' && onClose()}
>
	<div class="card w-full max-w-md p-6 space-y-5 max-h-[90vh] overflow-y-auto">
		<header class="flex items-center justify-between">
			<h3 class="h4 font-bold">{$t.sezona.novaSezona}</h3>
			<button class="btn-icon btn-icon-sm variant-ghost" on:click={onClose} disabled={loading}>
				{$t.modali.zatvoriBtnTitle}
			</button>
		</header>

		<form class="space-y-4" on:submit|preventDefault={handleSubmit}>
			<!-- Godina + datum -->
			<div class="grid grid-cols-2 gap-4">
				<label class="label">
					<span class="text-sm font-medium">{$t.sezona.godina}</span>
					<input
						class="input"
						type="number"
						bind:value={godina}
						min="2000"
						max="2099"
						required
						disabled={loading}
					/>
				</label>
				<label class="label">
					<span class="text-sm font-medium">{$t.sezona.datumPocetka}</span>
					<input class="input" type="date" bind:value={datumPocetka} required disabled={loading} />
				</label>
			</div>

			{#if duplikatGodina && !loading}
				<aside class="alert variant-filled-error py-2 px-3 text-sm">
					<p>{$t.sezona.duplikatGodina.replace('{godina}', String(godina))}</p>
				</aside>
			{/if}

			<label class="label">
				<span class="text-sm font-medium">{$t.sezona.naziv}</span>
				<input
					class="input"
					type="text"
					bind:value={naziv}
					placeholder={$t.sezona.nazivPlaceholder.replace('{godina}', String(godina))}
					disabled={loading}
				/>
			</label>

			<!-- Kavezi po sekcijama ili jednostavno -->
			{#if imaSekcija}
				<div class="space-y-3">
					<p class="text-sm font-medium">{$t.novaSezonaSekcije.kaveziPoSekcijama}</p>
					<div class="space-y-2">
						{#each sekcijeDist as red, i (red.sekcija_id)}
							<div class="flex items-center gap-3">
								<span class="text-sm flex-1 truncate">🏠 {red.naziv}</span>
								<div class="flex items-center gap-1 shrink-0">
									<input
										class="input w-20 text-center"
										type="number"
										bind:value={sekcijeDist[i].broj_kaveza}
										min="0"
										max="100"
										disabled={loading}
									/>
									<span class="text-xs text-surface-400">kaveza</span>
								</div>
							</div>
						{/each}
					</div>

					<div class="flex items-center justify-between pt-1 border-t border-surface-200-700-token">
						<span class="text-sm text-surface-500">{$t.novaSezonaSekcije.ukupno}: <strong>{ukupnoKaveza}</strong> {$t.novaSezonaSekcije.kaveza}</span>
					</div>

					<!-- Numerisanje -->
					<div class="space-y-1 pt-1">
						<p class="text-xs font-medium text-surface-500">{$t.novaSezonaSekcije.numerisanjeTitle}</p>
						<label class="flex items-start gap-2 cursor-pointer">
							<input type="radio" class="radio mt-0.5" bind:group={numerisanje} value="kontinuirano" disabled={loading} />
							<div>
								<p class="text-sm">{$t.novaSezonaSekcije.kontinuiranoLabel.replace('{ukupno}', String(ukupnoKaveza))}</p>
								<p class="text-xs text-surface-400">{$t.novaSezonaSekcije.kontinuiranoOpis}</p>
							</div>
						</label>
						<label class="flex items-start gap-2 cursor-pointer">
							<input type="radio" class="radio mt-0.5" bind:group={numerisanje} value="po_sekciji" disabled={loading} />
							<div>
								<p class="text-sm">{$t.novaSezonaSekcije.poSekcijiLabel}</p>
								<p class="text-xs text-surface-400">{$t.novaSezonaSekcije.poSekcijiOpis}</p>
							</div>
						</label>
					</div>
				</div>
			{:else}
				<!-- Bez sekcija — jednostavni unos -->
				<label class="label">
					<span class="text-sm font-medium">{$t.sezona.brojKaveza}</span>
					<input
						class="input"
						type="number"
						bind:value={brojKavezaBezSekcija}
						min="1"
						max="200"
						required
						disabled={loading}
					/>
				</label>
			{/if}

			<!-- Opcija arhiviranja -->
			{#if $aktivnaSezona && !duplikatGodina}
				<label class="flex items-center gap-2 cursor-pointer">
					<input type="checkbox" class="checkbox" bind:checked={zavrsiTrenutnu} disabled={loading} />
					<span class="text-sm">Završi sezonu {$aktivnaSezona.godina} i arhiviraj je</span>
				</label>
			{/if}

			{#if errorMsg}
				<aside class="alert variant-filled-error py-2 px-3 text-sm">
					<p>{errorMsg}</p>
				</aside>
			{/if}

			<div class="flex gap-3 pt-1">
				<button class="btn variant-ghost flex-1" type="button" on:click={onClose} disabled={loading}>
					{$t.common.odustani}
				</button>
				<button
					class="btn variant-filled-primary flex-1"
					type="submit"
					disabled={loading || ukupnoKaveza < 1 || duplikatGodina}
				>
					{#if loading}<span class="animate-spin mr-2">↻</span>{/if}
					{$t.sezona.kreirajSezonu}
				</button>
			</div>
		</form>
	</div>
</div>
