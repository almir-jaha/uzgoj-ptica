<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';
	import { initializeStores, AppShell, AppBar, Toast, getToastStore } from '@skeletonlabs/skeleton';
	import { session, isAuthenticated, auth, user } from '$lib/stores/auth';
	import { getCurrentUser } from '$lib/supabase/auth';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { isOnline } from '$lib/stores/network';
	import { isAdmin } from '$lib/stores/admin';
	import { t } from '$lib/i18n';
	import { uzgajivacnice, aktivnaUzgajivacnica, loadUzgajivacnice, setAktivnaUzgajivacnica } from '$lib/stores/uzgajivacnica';

	initializeStores();
	const toastStore = getToastStore();

	let authLoading = true;

	onMount(async () => {
		const currentSession = await getCurrentUser();
		session.set(currentSession);
		authLoading = false;
		if (currentSession?.user?.id) {
			loadUzgajivacnice(currentSession.user.id);
		}

		// Registracija Service Workera
		if ('serviceWorker' in navigator) {
			let reloadPending = false;
			navigator.serviceWorker.addEventListener('controllerchange', () => {
				if (reloadPending) return;
				reloadPending = true;
				window.location.reload();
			});

			try {
				const { registerSW } = await import('virtual:pwa-register');
				registerSW({
					onOfflineReady() {
						toastStore.trigger({
							message: t.app.offlineReady,
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
		goto('/');
	}

	const navLinks = [
		{ href: '/uzgajivacnica', icon: '🏡', label: 'Uzgajivač.' },
		{ href: '/sezone',        icon: '📅', label: 'Sezone' },
		{ href: '/ptice',         icon: '🐦', label: 'Ptice' },
		{ href: '/aktivnosti',    icon: '📋', label: 'Akt.' },
		{ href: '/statistike',    icon: '📊', label: 'Stat.' }
	];
</script>

<Toast position="br" />

{#if authLoading}
	<div class="flex min-h-screen items-center justify-center bg-surface-50-900-token">
		<div class="text-center space-y-3">
			<span class="text-6xl">🐦</span>
			<p class="text-surface-500 animate-pulse">{t.app.loading}</p>
		</div>
	</div>
{:else if $isAuthenticated}
	<AppShell slotPageContent="pb-20 sm:pb-0">
		<svelte:fragment slot="header">
			<AppBar padding="px-4 py-2" background="bg-surface-100-800-token">
				<svelte:fragment slot="lead">
					<span class="text-lg font-bold tracking-tight">{t.app.nameShort}</span>
					{#if !$isOnline}
						<span class="badge variant-filled-warning text-xs ml-2" title={t.app.offlineTitle}>
							{t.app.offlineBadge}
						</span>
					{/if}
					{#if $uzgajivacnice.length > 1}
						<select
							class="select text-xs py-0.5 px-2 h-7 ml-2 max-w-[130px] truncate"
							value={$aktivnaUzgajivacnica?.id ?? ''}
							on:change={(e) => setAktivnaUzgajivacnica(e.currentTarget.value)}
						>
							{#each $uzgajivacnice as uz}
								<option value={uz.id}>{uz.naziv}</option>
							{/each}
						</select>
					{:else if $aktivnaUzgajivacnica}
						<span class="text-xs text-surface-400 ml-2 hidden sm:inline truncate max-w-[120px]">
							{$aktivnaUzgajivacnica.naziv}
						</span>
					{/if}
				</svelte:fragment>
				<svelte:fragment slot="trail">
					<!-- Desktop nav -->
					<nav class="hidden sm:flex items-center gap-1">
						<a href="/uzgajivacnica" class="btn btn-sm {$page.url.pathname.startsWith('/uzgajivacnica') ? 'variant-filled-primary' : 'variant-ghost-surface'}">{t.nav.uzgajivacnica}</a>
						<a href="/sezone"        class="btn btn-sm {$page.url.pathname.startsWith('/sezone') ? 'variant-filled-primary' : 'variant-ghost-surface'}">{t.nav.sezone}</a>
						<a href="/ptice"         class="btn btn-sm {$page.url.pathname.startsWith('/ptice') ? 'variant-filled-primary' : 'variant-ghost-surface'}">{t.nav.ptice}</a>
						<a href="/aktivnosti"    class="btn btn-sm {$page.url.pathname.startsWith('/aktivnosti') ? 'variant-filled-primary' : 'variant-ghost-surface'}">{t.nav.aktivnosti}</a>
						<a href="/statistike"    class="btn btn-sm {$page.url.pathname.startsWith('/statistike') ? 'variant-filled-primary' : 'variant-ghost-surface'}">{t.nav.statistike}</a>
						{#if isAdmin($user?.email)}
							<a href="/admin" class="btn btn-sm {$page.url.pathname.startsWith('/admin') ? 'variant-filled-warning' : 'variant-ghost-warning'}" title="Administracija">🔧</a>
						{/if}
						<button class="btn btn-sm variant-ghost-surface ml-1" on:click={auth.signOut} title={t.nav.odjavaTitle}>⎋</button>
					</nav>

					<!-- Mobile: samo sign out i eventualno admin -->
					<div class="flex sm:hidden items-center gap-1">
						{#if isAdmin($user?.email)}
							<a
								href="/admin"
								class="btn btn-sm {$page.url.pathname.startsWith('/admin')
									? 'variant-filled-warning'
									: 'variant-ghost-warning'}"
								title="Administracija"
							>
								🔧
							</a>
						{/if}
						<button
							class="btn btn-sm variant-ghost-surface"
							on:click={auth.signOut}
							title={t.nav.odjavaTitle}
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
{:else}
	<slot />
{/if}
