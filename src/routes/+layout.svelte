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

	initializeStores();
	const toastStore = getToastStore();

	let authLoading = true;

	onMount(async () => {
		const currentSession = await getCurrentUser();
		session.set(currentSession);
		authLoading = false;

		// Registracija Service Workera
		if ('serviceWorker' in navigator) {
			// Kad novi SW preuzme kontrolu — reload da se učita nova index.html
			// Bez ovoga stari JS hashevi postaju 404 i app se ruši
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

	// Preusmjeri prijavljenog korisnika sa login stranice
	$: if (!authLoading && $isAuthenticated && $page.url.pathname === '/') {
		goto('/kavezi');
	}

	// Preusmjeri neprijavljenog korisnika sa zaštićenih ruta
	$: if (!authLoading && !$isAuthenticated && $page.url.pathname !== '/') {
		goto('/');
	}
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
	<AppShell>
		<svelte:fragment slot="header">
			<AppBar padding="px-4 py-2" background="bg-surface-100-800-token">
				<svelte:fragment slot="lead">
					<span class="text-lg font-bold tracking-tight">{t.app.name}</span>
					{#if !$isOnline}
						<span class="badge variant-filled-warning text-xs ml-2" title={t.app.offlineTitle}>
							{t.app.offlineBadge}
						</span>
					{/if}
				</svelte:fragment>
				<svelte:fragment slot="trail">
					<nav class="flex items-center gap-1">
						<a
							href="/kavezi"
							class="btn btn-sm {$page.url.pathname.startsWith('/kavezi')
								? 'variant-filled-primary'
								: 'variant-ghost-surface'}"
						>
							{t.nav.kavezi}
						</a>
						<a
							href="/parovi"
							class="btn btn-sm {$page.url.pathname.startsWith('/parovi')
								? 'variant-filled-primary'
								: 'variant-ghost-surface'}"
						>
							{t.nav.parovi}
						</a>
						<a
							href="/ptice"
							class="btn btn-sm {$page.url.pathname.startsWith('/ptice')
								? 'variant-filled-primary'
								: 'variant-ghost-surface'}"
						>
							{t.nav.ptice}
						</a>
						<a
							href="/aktivnosti"
							class="btn btn-sm {$page.url.pathname.startsWith('/aktivnosti')
								? 'variant-filled-primary'
								: 'variant-ghost-surface'}"
						>
							{t.nav.aktivnosti}
						</a>
						<a
							href="/statistike"
							class="btn btn-sm {$page.url.pathname.startsWith('/statistike')
								? 'variant-filled-primary'
								: 'variant-ghost-surface'}"
						>
							{t.nav.statistike}
						</a>
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
							class="btn btn-sm variant-ghost-surface ml-1"
							on:click={auth.signOut}
							title={t.nav.odjavaTitle}
						>
							<span>⎋</span>
						</button>
					</nav>
				</svelte:fragment>
			</AppBar>
		</svelte:fragment>

		<slot />
	</AppShell>
{:else}
	<slot />
{/if}
