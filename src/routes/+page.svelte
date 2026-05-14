<script lang="ts">
	import { isAuthenticated, session } from '$lib/stores/auth';
	import { signIn, signUp } from '$lib/supabase/auth';

	let email = '';
	let password = '';
	let isRegistering = false;
	let loading = false;
	let errorMsg = '';
	let successMsg = '';

	async function handleSubmit() {
		loading = true;
		errorMsg = '';
		successMsg = '';

		try {
			if (isRegistering) {
				const { data, error } = await signUp(email, password);
				if (error) throw error;
				// Supabase šalje verification email - obavijesti korisnika
				if (data?.user && !data?.session) {
					successMsg = 'Provjeri email za potvrdu registracije!';
				} else if (data?.session) {
					session.set(data.session);
				}
			} else {
				const { data, error } = await signIn(email, password);
				if (error) throw error;
				if (data?.session) session.set(data.session);
			}
		} catch (err) {
			if (err instanceof Error) {
				if (err.message.includes('Invalid login credentials')) {
					errorMsg = 'Pogrešan email ili lozinka.';
				} else if (err.message.includes('Email not confirmed')) {
					errorMsg = 'Email nije potvrđen. Provjeri inbox.';
				} else {
					errorMsg = err.message;
				}
			} else {
				errorMsg = 'Greška pri prijavi. Pokušaj ponovo.';
			}
		} finally {
			loading = false;
		}
	}

	function switchMode() {
		isRegistering = !isRegistering;
		errorMsg = '';
		successMsg = '';
	}
</script>

<svelte:head>
	<title>Prijava – Uzgoj ptica</title>
</svelte:head>

{#if $isAuthenticated}
	<div class="flex min-h-screen items-center justify-center bg-surface-50-900-token">
		<div class="card p-8 text-center space-y-3">
			<span class="text-5xl">✅</span>
			<p class="h4">Prijavljeni ste!</p>
			<p class="text-surface-500 text-sm">Preusmjeravanje...</p>
		</div>
	</div>
{:else}
	<div class="min-h-screen flex items-center justify-center bg-surface-50-900-token p-4">
		<div class="card p-8 w-full max-w-sm shadow-xl space-y-6">

			<!-- Logo + naslov -->
			<div class="text-center space-y-1">
				<p class="text-6xl leading-none">🐦</p>
				<h1 class="h2 font-bold">Uzgoj ptica</h1>
				<p class="text-surface-500 text-sm">
					{isRegistering ? 'Kreirajte novi račun' : 'Prijavite se na vaš račun'}
				</p>
			</div>

			<!-- Forma -->
			<form class="space-y-4" on:submit|preventDefault={handleSubmit} novalidate>
				<label class="label">
					<span class="text-sm font-medium">E-mail</span>
					<input
						class="input"
						type="email"
						bind:value={email}
						placeholder="vas@email.com"
						autocomplete="email"
						required
						disabled={loading}
					/>
				</label>

				<label class="label">
					<span class="text-sm font-medium">Lozinka</span>
					<input
						class="input"
						type="password"
						bind:value={password}
						placeholder="••••••••"
						autocomplete={isRegistering ? 'new-password' : 'current-password'}
						minlength="6"
						required
						disabled={loading}
					/>
					{#if isRegistering}
						<span class="text-xs text-surface-400">Minimalno 6 karaktera</span>
					{/if}
				</label>

				<!-- Greška -->
				{#if errorMsg}
					<aside class="alert variant-filled-error py-2 px-3 text-sm">
						<span>⚠</span>
						<div class="alert-message">{errorMsg}</div>
					</aside>
				{/if}

				<!-- Uspjeh (registracija) -->
				{#if successMsg}
					<aside class="alert variant-filled-success py-2 px-3 text-sm">
						<span>✉</span>
						<div class="alert-message">{successMsg}</div>
					</aside>
				{/if}

				<button
					class="btn variant-filled-primary w-full font-semibold"
					type="submit"
					disabled={loading || !email || !password}
				>
					{#if loading}
						<span class="inline-block animate-spin mr-2">↻</span>
					{/if}
					{isRegistering ? 'Registracija' : 'Prijava'}
				</button>
			</form>

			<hr class="border-surface-300-600-token" />

			<!-- Prebaci mod -->
			<p class="text-center text-sm text-surface-500">
				{isRegistering ? 'Već imate račun?' : 'Nemate račun?'}
				<button class="anchor font-medium" type="button" on:click={switchMode}>
					{isRegistering ? 'Prijavite se' : 'Registrujte se'}
				</button>
			</p>
		</div>
	</div>
{/if}
