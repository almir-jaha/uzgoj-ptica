<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';
	import { initializeStores, AppShell, AppBar, Toast } from '@skeletonlabs/skeleton';
	import { session, isAuthenticated, auth } from '$lib/stores/auth';
	import { getCurrentUser } from '$lib/supabase/auth';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	initializeStores();

	let authLoading = true;

	onMount(async () => {
		const currentSession = await getCurrentUser();
		session.set(currentSession);
		authLoading = false;
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
			<p class="text-surface-500 animate-pulse">Učitavanje...</p>
		</div>
	</div>
{:else if $isAuthenticated}
	<AppShell>
		<svelte:fragment slot="header">
			<AppBar padding="px-4 py-2" background="bg-surface-100-800-token">
				<svelte:fragment slot="lead">
					<span class="text-lg font-bold tracking-tight">🐦 Uzgoj ptica</span>
				</svelte:fragment>
				<svelte:fragment slot="trail">
					<nav class="flex items-center gap-1">
						<a
							href="/kavezi"
							class="btn btn-sm {$page.url.pathname.startsWith('/kavezi')
								? 'variant-filled-primary'
								: 'variant-ghost-surface'}"
						>
							🏠 Kavezi
						</a>
						<a
							href="/parovi"
							class="btn btn-sm {$page.url.pathname.startsWith('/parovi')
								? 'variant-filled-primary'
								: 'variant-ghost-surface'}"
						>
							🫂 Parovi
						</a>
						<a
							href="/ptice"
							class="btn btn-sm {$page.url.pathname.startsWith('/ptice')
								? 'variant-filled-primary'
								: 'variant-ghost-surface'}"
						>
							🐦 Ptice
						</a>
						<a
							href="/aktivnosti"
							class="btn btn-sm {$page.url.pathname.startsWith('/aktivnosti')
								? 'variant-filled-primary'
								: 'variant-ghost-surface'}"
						>
							📋 Aktivnosti
						</a>
						<button
							class="btn btn-sm variant-ghost-surface ml-1"
							on:click={auth.signOut}
							title="Odjava"
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
