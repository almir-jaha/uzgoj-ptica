<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import '../app.css';
	import { initializeStores, AppShell, AppBar, Toast, getToastStore } from '@skeletonlabs/skeleton';
	import { session, isAuthenticated, auth, user } from '$lib/stores/auth';
	import { getCurrentUser } from '$lib/supabase/auth';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { isOnline } from '$lib/stores/network';
	import { isAdmin } from '$lib/stores/admin';
	import { t } from '$lib/i18n';
	import JezikSelector from '$lib/components/JezikSelector.svelte';
	import HelpMenu from '$lib/components/HelpMenu.svelte';
	import { uzgajivacnice, aktivnaUzgajivacnica, loadUzgajivacnice, setAktivnaUzgajivacnica, clearUzgajivacniceStore } from '$lib/stores/uzgajivacnica';
	import { loadUserTier, userTier } from '$lib/stores/userTier';
	import { ptice } from '$lib/stores/ptice';
	import { sezone } from '$lib/stores/sezona';
	import { loadGenetikaPolja } from '$lib/stores/genetikaI18n';
	import OnboardingTour from '$lib/components/OnboardingTour.svelte';

	initializeStores();
	const toastStore = getToastStore();

	let authLoading = true;
	// Preskoči splash ako je već prikazan u ovoj sesiji (refresh) ili je ovo SW-triggered reload
	let showSplash = browser
		? !sessionStorage.getItem('splash-shown') && !sessionStorage.getItem('sw-reloaded')
		: true;
	let splashFading = false;
	let lastLoadedUserId: string | null = null;

	// Reaktivno učitaj podatke svaki put kad se user promijeni (login, switch)
	$: if (!authLoading && $user?.id && $user.id !== lastLoadedUserId) {
		lastLoadedUserId = $user.id;
		loadUzgajivacnice($user.id);
		loadUserTier($user.id, $user.email ?? '');
		loadGenetikaPolja();
	}

	onMount(async () => {
		const SPLASH_MIN_MS = 1500; // minimalno trajanje splash screena
		const splashStart = Date.now();

		const currentSession = await getCurrentUser();
		session.set(currentSession);
		authLoading = false;
		// Učitavanje podataka se sada radi reaktivno ($: if !authLoading && $user...)

		// Sačekaj ostatak minimalnog trajanja splash screena
		const elapsed = Date.now() - splashStart;
		const remaining = Math.max(0, SPLASH_MIN_MS - elapsed);
		await new Promise(r => setTimeout(r, remaining));

		// Fade out animacija pa sakrij
		splashFading = true;
		await new Promise(r => setTimeout(r, 400));
		showSplash = false;
		splashFading = false;
		// Zapamti da je splash već prikazan — refresh neće ponovo pokazati splash
		sessionStorage.setItem('splash-shown', '1');

		// Registracija Service Workera
		if ('serviceWorker' in navigator) {
			let reloadPending = false;
			navigator.serviceWorker.addEventListener('controllerchange', () => {
				if (reloadPending) return;
				// Spriječi dupli reload — sessionStorage se briše kada korisnik zatvori tab
				if (sessionStorage.getItem('sw-reloaded')) return;
				reloadPending = true;
				sessionStorage.setItem('sw-reloaded', '1');
				window.location.reload();
			});

			try {
				const { registerSW } = await import('virtual:pwa-register');
				registerSW({
					onOfflineReady() {
						toastStore.trigger({
							message: $t.app.offlineReady,
							background: 'variant-filled-success',
							timeout: 4000
						});
					}
				});
			} catch {
				// SW nije dostupan (dev bez HTTPS)
			}
		}
	});

	$: if (!authLoading && $isAuthenticated && $page.url.pathname === '/') {
		goto('/uzgajivacnica');
	}

	$: if (!authLoading && !$isAuthenticated && $page.url.pathname !== '/' && !$page.url.pathname.startsWith('/ptica/')) {
		// Očisti sve store-ove i localStorage pri logout-u
		lastLoadedUserId = null;
		clearUzgajivacniceStore();
		ptice.set([]);
		sezone.set([]);
		userTier.set('free');
		if (typeof localStorage !== 'undefined') {
			localStorage.removeItem('aktivna_uzgajivacnica_id');
			localStorage.removeItem('pregled_sezona_id');
		}
		goto('/');
	}

	const navLinks = [
		{ href: '/uzgajivacnica', icon: '🏡', label: 'Uzgajivač.' },
		{ href: '/sezone',        icon: '📅', label: 'Sezone' },
		{ href: '/parovi',        icon: '💑', label: 'Parovi' },
		{ href: '/ptice',         icon: '🐦', label: 'Ptice' },
		{ href: '/aktivnosti',    icon: '📋', label: 'Akt.' }
	];
</script>

<Toast position="br" />

{#if showSplash}
	<div
		class="flex min-h-screen items-center justify-center"
		style="background:#ffffff; transition: opacity 0.4s ease; opacity: {splashFading ? 0 : 1};"
	>
		<div class="text-center space-y-5">
			<img src="/app-logo.png" alt="HatchPlan" class="w-52 h-52 mx-auto" />
			<p style="color:#94a3b8; font-size:0.85rem; letter-spacing:0.08em; font-weight:500">HatchPlan</p>
		</div>
	</div>
{:else if $isAuthenticated && !$page.url.pathname.startsWith('/ptica/')}
	<AppShell slotPageContent="pb-20 sm:pb-0">
		<svelte:fragment slot="header">
			<AppBar padding="px-4 py-2" background="bg-surface-100-800-token">
				<svelte:fragment slot="lead">
					<img src="/app-logo.png" alt="HatchPlan" class="h-10 w-auto" data-onboarding="sync-status" />
					<span class="hidden sm:block text-xl font-bold tracking-tight ml-1">HatchPlan</span>
					{#if !$isOnline}
						<span class="badge variant-filled-warning text-xs ml-2" title={$t.app.offlineTitle}>
							{$t.app.offlineBadge}
						</span>
					{/if}
				</svelte:fragment>
				<svelte:fragment slot="trail">
					<!-- Desktop nav -->
					<nav class="hidden sm:flex items-center gap-1">
						{#if $uzgajivacnice.length > 1}
							<select
								class="select text-xs py-0.5 px-2 h-7 max-w-[140px] truncate mr-1"
								value={$aktivnaUzgajivacnica?.id ?? ''}
								on:change={(e) => setAktivnaUzgajivacnica(e.currentTarget.value)}
							>
								{#each $uzgajivacnice as uz}
									<option value={uz.id}>{uz.naziv}</option>
								{/each}
							</select>
						{:else if $aktivnaUzgajivacnica}
							<span class="text-xs text-surface-400 mr-1 truncate max-w-[120px]">
								{$aktivnaUzgajivacnica.naziv}
							</span>
						{/if}
						<a href="/uzgajivacnica" class="btn btn-sm {$page.url.pathname.startsWith('/uzgajivacnica') ? 'variant-filled-primary' : 'variant-ghost-surface'}">{$t.nav.uzgajivacnica}</a>
						<a href="/sezone"        class="btn btn-sm {$page.url.pathname.startsWith('/sezone') ? 'variant-filled-primary' : 'variant-ghost-surface'}">{$t.nav.sezone}</a>
						<a href="/parovi"        class="btn btn-sm {$page.url.pathname.startsWith('/parovi') ? 'variant-filled-primary' : 'variant-ghost-surface'}">{$t.nav.parovi}</a>
						<a href="/ptice"         class="btn btn-sm {$page.url.pathname.startsWith('/ptice') ? 'variant-filled-primary' : 'variant-ghost-surface'}">{$t.nav.ptice}</a>
						<a href="/aktivnosti"    class="btn btn-sm {$page.url.pathname.startsWith('/aktivnosti') ? 'variant-filled-primary' : 'variant-ghost-surface'}">{$t.nav.aktivnosti}</a>
						<a href="/statistike"    class="btn btn-sm {$page.url.pathname.startsWith('/statistike') ? 'variant-filled-primary' : 'variant-ghost-surface'}">{$t.nav.statistike}</a>
						<a href="/prijevodi" class="btn btn-sm {$page.url.pathname.startsWith('/prijevodi') ? 'variant-filled-primary' : 'variant-ghost-surface'}" title={$t.prijevodi.naslov}>💬</a>
						{#if isAdmin($user?.email)}
							<a href="/admin" class="btn btn-sm {$page.url.pathname.startsWith('/admin') ? 'variant-filled-warning' : 'variant-ghost-warning'}" title={$t.nav.administracija}>🔧</a>
						{/if}
						<HelpMenu />
						<JezikSelector />
						<button class="btn btn-sm variant-ghost-surface ml-1" on:click={auth.signOut} title={$t.nav.odjavaTitle}>⎋</button>
					</nav>

					<!-- Mobile: uzgajivačnica switcher + izlaz, admin, sign out -->
					<div class="flex sm:hidden items-center gap-1">
						<HelpMenu />
						<JezikSelector />
						{#if $uzgajivacnice.length > 1}
							<select
								class="select text-xs py-0.5 px-1.5 h-7 max-w-[110px] truncate"
								value={$aktivnaUzgajivacnica?.id ?? ''}
								on:change={(e) => setAktivnaUzgajivacnica(e.currentTarget.value)}
							>
								{#each $uzgajivacnice as uz}
									<option value={uz.id}>{uz.naziv}</option>
								{/each}
							</select>
						{/if}
						{#if isAdmin($user?.email)}
							<a
								href="/admin"
								class="btn btn-sm {$page.url.pathname.startsWith('/admin')
									? 'variant-filled-warning'
									: 'variant-ghost-warning'}"
								title={$t.nav.administracija}
							>
								🔧
							</a>
						{/if}
						<a href="/prijevodi" class="btn btn-sm {$page.url.pathname.startsWith('/prijevodi') ? 'variant-filled-primary' : 'variant-ghost-surface'}" title={$t.prijevodi.naslov}>💬</a>
						<button
							class="btn btn-sm variant-ghost-surface"
							title={$t.nav.pritisniBackZaIzlaz}
							on:click={() => {
								// Android PWA ne dozvoljava direktan izlaz via JS.
								// Vraćamo se na prvu stranicu historije — jedan Back tada izlazi iz app.
								if (history.length > 1) history.go(-(history.length - 1));
							}}
						>
							✕
						</button>
						<button
							class="btn btn-sm variant-ghost-surface"
							on:click={auth.signOut}
							title={$t.nav.odjavaTitle}
						>
							<span>⎋</span>
						</button>
					</div>
				</svelte:fragment>
			</AppBar>
		</svelte:fragment>

		<slot />
	</AppShell>

	<!-- Mobile bottom navigation -->
	<nav
		class="fixed bottom-0 left-0 right-0 z-30 flex sm:hidden bg-surface-100-800-token border-t border-surface-300-600-token"
		style="padding-bottom: env(safe-area-inset-bottom, 0px)"
	>
		{#each navLinks as link}
			<a
				href={link.href}
				class="flex-1 flex flex-col items-center pt-2 pb-1 gap-0.5 text-[10px] font-medium transition-colors
					{$page.url.pathname.startsWith(link.href)
						? 'text-primary-500'
						: 'text-surface-400 dark:text-surface-500'}"
			>
				<span class="text-2xl leading-none">{link.icon}</span>
				<span>{link.label}</span>
			</a>
		{/each}
	</nav>

	<OnboardingTour />
{:else}
	<slot />
{/if}
