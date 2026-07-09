<script lang="ts">
	import PedigreeNode from '$lib/components/PedigreeNode.svelte';
	import { getToastStore } from '@skeletonlabs/skeleton';
	import { t } from '$lib/i18n';

	const toastStore = getToastStore();

	interface BirdNode {
		id: string;
		user_id: string;
		spol: string;
		prstena_oznaka?: string;
		prsten_redni_broj?: number;
		naziv?: string;
		datum_rodjenja?: string;
		godina?: number;
		boja?: string;
		status_ptica?: string;
		rezultati?: string;
		napomena_rodovnik?: string;
		slika_url?: string;
		created_at: string;
		vrsta_naziv?: string;
		otac?: BirdNode | null;
		majka?: BirdNode | null;
	}

	interface BreederInfo {
		naziv?: string;
		ime_prezime?: string;
		adresa?: string;
		telefon?: string;
		slika_url?: string;
	}

	export let data: { tree: BirdNode | null; breeder: BreederInfo | null; error: string | null };

	$: tree = data.tree;
	$: breeder = data.breeder;
	$: error = data.error;

	$: isMale = tree?.spol === 'M';
	$: isFemale = tree?.spol === 'Ž';
	$: spolColor = isMale ? 'text-blue-500' : isFemale ? 'text-pink-500' : 'text-gray-400';
	$: topBand = isMale ? 'bg-blue-400' : isFemale ? 'bg-pink-400' : 'bg-gray-300';
	$: photoBorder = isMale ? 'border-blue-200' : isFemale ? 'border-pink-200' : 'border-gray-200';
	$: photoBg = isMale ? 'bg-blue-50' : isFemale ? 'bg-pink-50' : 'bg-gray-50';

	function prstenStr(p: BirdNode): string {
		if (p.prstena_oznaka && p.prsten_redni_broj != null) return `${p.prstena_oznaka}-${p.prsten_redni_broj}`;
		if (p.prstena_oznaka) return p.prstena_oznaka;
		if (p.prsten_redni_broj != null) return `#${p.prsten_redni_broj}`;
		return '';
	}

	function displayName(p: BirdNode): string {
		return p.naziv || prstenStr(p) || p.id.slice(0, 8);
	}

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('hr-BA', { day: '2-digit', month: '2-digit', year: 'numeric' });
	}

	function countKnownAncestors(node: BirdNode | null | undefined, depth: number): { known: number; total: number } {
		if (depth > 4) return { known: 0, total: 0 };
		const slots = Math.pow(2, depth - 1);
		if (!node) return { known: 0, total: slots };
		const oRes = countKnownAncestors(node.otac, depth + 1);
		const mRes = countKnownAncestors(node.majka, depth + 1);
		return { known: 1 + oRes.known + mRes.known, total: 1 + oRes.total + mRes.total };
	}

	$: pedigreeStats = tree ? (() => {
		const oRes = countKnownAncestors(tree.otac, 2);
		const mRes = countKnownAncestors(tree.majka, 2);
		return { known: oRes.known + mRes.known, total: 14 };
	})() : null;

	$: pageTitle = tree ? `${displayName(tree)} — HatchPlan` : 'HatchPlan';
	$: pageDesc = tree
		? `${tree.vrsta_naziv || 'Ptica'} · ${isMale ? 'Mužjak' : isFemale ? 'Ženka' : '?'} · ${prstenStr(tree) || 'bez prstena'}`
		: 'Profil ptice';

	async function podijeli(): Promise<void> {
		const url = window.location.href;

		if (navigator.share) {
			try {
				await navigator.share({ title: pageTitle, text: pageDesc, url });
			} catch (err) {
				if (err instanceof Error && err.name === 'AbortError') return;
			}
			return;
		}

		try {
			await navigator.clipboard.writeText(url);
			toastStore.trigger({
				message: $t.pticaJavno.linkKopiran,
				background: 'variant-filled-success',
				timeout: 3000
			});
		} catch {
			toastStore.trigger({
				message: $t.pticaJavno.greskaKopiranja,
				background: 'variant-filled-error',
				timeout: 3000
			});
		}
	}
</script>

<svelte:head>
	<title>{pageTitle}</title>
	<meta name="description" content={pageDesc} />
	<meta property="og:title" content={pageTitle} />
	<meta property="og:description" content={pageDesc} />
	{#if tree?.slika_url}
	<meta property="og:image" content={tree.slika_url} />
	{/if}
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-50">
	<!-- Header -->
	<header class="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-indigo-100">
		<div class="max-w-2xl mx-auto px-4 py-2.5 flex items-center gap-2.5">
			<img src="/app-logo.png" alt="HatchPlan" class="w-7 h-7 rounded-md" />
			<span class="font-bold text-indigo-900 text-sm tracking-tight">HatchPlan</span>
			<span class="text-xs text-gray-400 hidden sm:block mr-auto">Registar uzgojnih ptica</span>
			{#if tree}
			<button
				type="button"
				class="btn btn-sm variant-soft-primary ml-auto sm:ml-0"
				on:click={podijeli}
			>
				📤 <span class="hidden sm:inline">{$t.pticaJavno.podijeliBtn}</span>
			</button>
			{/if}
			<a href="/" class="sm:ml-2 text-xs text-indigo-600 font-medium hover:text-indigo-800 transition-colors border border-indigo-200 rounded-full px-3 py-1 hover:bg-indigo-50">
				Otvori app →
			</a>
		</div>
	</header>

	<main class="max-w-2xl mx-auto px-4 py-6 space-y-4">

		<!-- Error state -->
		{#if error && !tree}
		<div class="bg-white rounded-2xl shadow-sm border border-red-100 p-8 text-center">
			<div class="text-5xl mb-3">🔍</div>
			<h1 class="text-lg font-bold text-gray-800 mb-1">Ptica nije pronađena</h1>
			<p class="text-sm text-gray-500">{error}</p>
			<p class="text-xs text-gray-400 mt-3">Provjerite QR kod ili se obratite uzgajivaču.</p>
		</div>

		<!-- Bird hero card -->
		{:else if tree}
		<div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
			<div class="h-1.5 {topBand}"></div>
			<div class="p-5">
				<div class="flex gap-4 items-start">
					<!-- Photo -->
					{#if tree.slika_url}
					<img
						src={tree.slika_url}
						alt={displayName(tree)}
						class="w-24 h-24 rounded-xl object-cover shrink-0 border-2 {photoBorder}"
					/>
					{:else}
					<div class="w-24 h-24 rounded-xl shrink-0 {photoBg} flex items-center justify-center border-2 {photoBorder}">
						<span class="text-4xl">🐦</span>
					</div>
					{/if}

					<!-- Info -->
					<div class="flex-1 min-w-0">
						<div class="flex items-start justify-between gap-2 mb-1">
							<h1 class="text-xl font-bold text-gray-900 leading-tight flex items-baseline gap-1.5">
								<span class="text-lg {spolColor}">{isMale ? '♂' : isFemale ? '♀' : '?'}</span>
								<span class="break-words">{displayName(tree)}</span>
							</h1>
							<!-- Verified badge -->
							<div class="shrink-0 flex items-center gap-1 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
								<span class="text-emerald-600 text-xs font-black">✓</span>
								<span class="text-emerald-700 text-[11px] font-semibold">Verified</span>
							</div>
						</div>

						{#if tree.naziv && prstenStr(tree)}
						<p class="text-sm text-indigo-600 font-medium mb-1">{prstenStr(tree)}</p>
						{/if}

						<p class="text-sm text-gray-600 font-medium">{tree.vrsta_naziv || '—'}</p>

						<div class="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
							{#if tree.boja}
							<span class="text-sm text-gray-500">{tree.boja}</span>
							{/if}
							{#if tree.godina}
							<span class="text-sm text-gray-400">Godište {tree.godina}</span>
							{/if}
							{#if tree.status_ptica}
							<span class="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">{tree.status_ptica}</span>
							{/if}
						</div>
					</div>
				</div>

				{#if tree.rezultati}
				<div class="mt-4 rounded-xl bg-amber-50 border border-amber-100 p-3">
					<p class="text-[11px] font-bold uppercase tracking-widest text-amber-600 mb-1">Rezultati / Nagrade</p>
					<p class="text-sm text-amber-900">{tree.rezultati}</p>
				</div>
				{/if}

				{#if tree.napomena_rodovnik}
				<div class="mt-3 rounded-xl bg-gray-50 border border-gray-100 p-3">
					<p class="text-sm text-gray-600 italic">{tree.napomena_rodovnik}</p>
				</div>
				{/if}

				<!-- Stats row -->
				<div class="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-4 text-center">
					<div>
						<p class="text-lg font-bold text-indigo-700">{pedigreeStats?.known ?? 0}</p>
						<p class="text-[11px] text-gray-400">Poznati preci</p>
					</div>
					{#if tree.otac || tree.majka}
					<div>
						<p class="text-lg font-bold text-indigo-700">
							{[tree.otac, tree.majka].filter(Boolean).length}/2
						</p>
						<p class="text-[11px] text-gray-400">Roditelja</p>
					</div>
					{/if}
					<div>
						<p class="text-lg font-bold text-indigo-700">{tree.godina ?? '—'}</p>
						<p class="text-[11px] text-gray-400">Godište</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Breeder card -->
		{#if breeder && (breeder.naziv || breeder.ime_prezime)}
		<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
			<p class="text-[11px] font-bold uppercase tracking-widest text-indigo-400 mb-3">Uzgajivač</p>
			<div class="flex gap-3 items-start">
				{#if breeder.slika_url}
				<img
					src={breeder.slika_url}
					alt="Uzgajivačnica"
					class="w-14 h-14 rounded-xl object-cover border border-gray-100 shrink-0"
				/>
				{:else}
				<div class="w-14 h-14 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
					<span class="text-2xl">🏡</span>
				</div>
				{/if}

				<div class="flex-1 min-w-0">
					{#if breeder.naziv}
					<p class="font-bold text-gray-900 text-base">{breeder.naziv}</p>
					{/if}
					{#if breeder.ime_prezime}
					<p class="text-sm text-gray-600 mt-0.5">{breeder.ime_prezime}</p>
					{/if}
					{#if breeder.adresa}
					<p class="text-sm text-gray-400 mt-1">📍 {breeder.adresa}</p>
					{/if}
					{#if breeder.telefon}
					<a
						href="tel:{breeder.telefon}"
						class="text-sm text-indigo-600 hover:text-indigo-800 hover:underline mt-0.5 flex items-center gap-1"
					>
						📞 {breeder.telefon}
					</a>
					{/if}
				</div>
			</div>
		</div>
		{/if}

		<!-- Pedigree section -->
		{#if tree.otac || tree.majka}
		<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
			<div class="flex items-center justify-between mb-4">
				<p class="text-[11px] font-bold uppercase tracking-widest text-indigo-400">Rodovnik</p>
				<p class="text-xs text-gray-400">Tapni za više generacija</p>
			</div>
			<div class="space-y-2">
				<PedigreeNode node={tree.otac} level={1} roleLabel="Otac" />
				<PedigreeNode node={tree.majka} level={1} roleLabel="Majka" />
			</div>
		</div>
		{:else}
		<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
			<p class="text-[11px] font-bold uppercase tracking-widest text-indigo-400 mb-2">Rodovnik</p>
			<p class="text-sm text-gray-400 italic text-center py-4">Podaci o porijeklu nisu uneseni.</p>
		</div>
		{/if}

		<!-- Certificate footer -->
		<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
					<span class="text-xl">✅</span>
				</div>
				<div>
					<p class="font-semibold text-gray-800 text-sm">Registrirana ptica</p>
					<p class="text-xs text-gray-500 mt-0.5">
						Ova ptica je registrirana u sistemu HatchPlan.
						Datum registracije: {formatDate(tree.created_at)}.
					</p>
				</div>
			</div>
		</div>

		<!-- App footer -->
		<div class="text-center py-4 space-y-2">
			<div class="flex items-center justify-center gap-2">
				<img src="/app-logo.png" alt="" class="w-5 h-5 rounded opacity-50" />
				<p class="text-xs text-gray-400 font-medium">HatchPlan</p>
			</div>
			<p class="text-xs text-gray-300">Aplikacija za upravljanje uzgojem ptica</p>
		</div>

		{/if}
	</main>
</div>
