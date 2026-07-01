<script lang="ts">
	import { isAuthenticated, session } from '$lib/stores/auth';
	import { signIn, signUp } from '$lib/supabase/auth';
	import { supabase } from '$lib/supabase/client';
	import { t } from '$lib/i18n';

	let email = '';
	let password = '';
	let isRegistering = false;
	let loading = false;
	let errorMsg = '';
	let successMsg = '';
	let emailNijePotvrdjen = false;
	let resendLoading = false;
	let showPassword = false;
	let passwordInput: HTMLInputElement;

	function togglePassword() {
		showPassword = !showPassword;
		if (passwordInput) passwordInput.type = showPassword ? 'text' : 'password';
	}

	async function resendConfirmation() {
		if (!email) return;
		resendLoading = true;
		errorMsg = '';
		try {
			const { error } = await supabase.auth.resend({ type: 'signup', email });
			if (error) throw error;
			successMsg = 'Novi mail je poslan. Provjerite inbox (i spam folder).';
			emailNijePotvrdjen = false;
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Greška pri slanju maila';
		} finally {
			resendLoading = false;
		}
	}

	async function handleSubmit() {
		loading = true;
		errorMsg = '';
		successMsg = '';
		emailNijePotvrdjen = false;

		try {
			if (isRegistering) {
				const { data, error } = await signUp(email, password);
				if (error) throw error;
				// Supabase šalje verification email - obavijesti korisnika
				if (data?.user && !data?.session) {
					successMsg = $t.auth.provjeriEmail;
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
					errorMsg = $t.auth.pogresanEmailLozinka;
				} else if (err.message.includes('Email not confirmed')) {
					errorMsg = $t.auth.emailNijePotvrdjen;
					emailNijePotvrdjen = true;
				} else {
					errorMsg = err.message;
				}
			} else {
				errorMsg = $t.auth.greskaPrivPrijavi;
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
	<title>{$t.auth.pageTitle}</title>
</svelte:head>

{#if $isAuthenticated}
	<div class="flex min-h-screen items-center justify-center bg-surface-50-900-token">
		<div class="card p-8 text-center space-y-3">
			<span class="text-5xl">✅</span>
			<p class="h4">{$t.auth.prijavljeni}</p>
			<p class="text-surface-500 text-sm">{$t.auth.preusmjeravanje}</p>
		</div>
	</div>
{:else}
	<div class="min-h-screen flex items-center justify-center bg-surface-50-900-token p-4">
		<div class="card p-8 w-full max-w-sm shadow-xl space-y-6">

			<!-- Logo + naslov -->
			<div class="text-center space-y-1">
				<p class="text-6xl leading-none">🐦</p>
				<h1 class="h2 font-bold">{$t.app.nameShort}</h1>
				<p class="text-surface-500 text-sm">
					{isRegistering ? $t.auth.kreirajRacun : $t.auth.prijaviteSeNaRacun}
				</p>
			</div>

			<!-- Forma -->
			<form class="space-y-4" on:submit|preventDefault={handleSubmit} novalidate>
				<label class="label">
					<span class="text-sm font-medium">{$t.auth.email}</span>
					<input
						class="input px-4"
						type="email"
						bind:value={email}
						placeholder={$t.auth.emailPlaceholder}
						autocomplete="email"
						required
						disabled={loading}
					/>
				</label>

				<label class="label">
					<span class="text-sm font-medium">{$t.auth.lozinka}</span>
					<div class="relative">
						<input
							class="input px-4 pr-11"
							type="password"
							bind:this={passwordInput}
							bind:value={password}
							placeholder="••••••••"
							autocomplete={isRegistering ? 'new-password' : 'current-password'}
							minlength="6"
							required
							disabled={loading}
						/>
						<button
							type="button"
							class="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 transition-colors"
							tabindex="-1"
							on:click={togglePassword}
							aria-label={showPassword ? 'Sakrij lozinku' : 'Prikaži lozinku'}
						>
							{#if showPassword}
								<!-- oko-zatvoreno -->
								<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
									<path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
								</svg>
							{:else}
								<!-- oko-otvoreno -->
								<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
									<path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
									<path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
								</svg>
							{/if}
						</button>
					</div>
					{#if isRegistering}
						<span class="text-xs text-surface-400">{$t.auth.minKaraktera}</span>
					{/if}
				</label>

				<!-- Greška -->
				{#if errorMsg}
					<aside class="alert variant-filled-error py-2 px-3 text-sm">
						<span>⚠</span>
						<div class="alert-message">
							{errorMsg}
							{#if emailNijePotvrdjen}
								<button
									type="button"
									class="block mt-2 underline text-white font-medium"
									disabled={resendLoading || !email}
									on:click={resendConfirmation}
								>
									{resendLoading ? '↻ Šalje se...' : '→ Pošalji novi mail za potvrdu'}
								</button>
							{/if}
						</div>
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
					{isRegistering ? $t.auth.registracija : $t.auth.prijava}
				</button>
			</form>

			<hr class="border-surface-300-600-token" />

			<!-- Prebaci mod -->
			<p class="text-center text-sm text-surface-500">
				{isRegistering ? $t.auth.vecImateRacun : $t.auth.nemateRacun}
				<button class="anchor font-medium" type="button" on:click={switchMode}>
					{isRegistering ? $t.auth.prijaviteSe : $t.auth.registrujteSe}
				</button>
			</p>
		</div>
	</div>
{/if}
