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
					successMsg = t.auth.provjeriEmail;
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
					errorMsg = t.auth.pogresanEmailLozinka;
				} else if (err.message.includes('Email not confirmed')) {
					errorMsg = t.auth.emailNijePotvrdjen;
					emailNijePotvrdjen = true;
				} else {
					errorMsg = err.message;
				}
			} else {
				errorMsg = t.auth.greskaPrivPrijavi;
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
	<title>{t.auth.pageTitle}</title>
</svelte:head>

{#if $isAuthenticated}
	<div class="flex min-h-screen items-center justify-center bg-surface-50-900-token">
		<div class="card p-8 text-center space-y-3">
			<span class="text-5xl">✅</span>
			<p class="h4">{t.auth.prijavljeni}</p>
			<p class="text-surface-500 text-sm">{t.auth.preusmjeravanje}</p>
		</div>
	</div>
{:else}
	<div class="min-h-screen flex items-center justify-center bg-surface-50-900-token p-4">
		<div class="card p-8 w-full max-w-sm shadow-xl space-y-6">

			<!-- Logo + naslov -->
			<div class="text-center space-y-1">
				<p class="text-6xl leading-none">🐦</p>
				<h1 class="h2 font-bold">{t.app.nameShort}</h1>
				<p class="text-surface-500 text-sm">
					{isRegistering ? t.auth.kreirajRacun : t.auth.prijaviteSeNaRacun}
				</p>
			</div>

			<!-- Forma -->
			<form class="space-y-4" on:submit|preventDefault={handleSubmit} novalidate>
				<label class="label">
					<span class="text-sm font-medium">{t.auth.email}</span>
					<input
						class="input"
						type="email"
						bind:value={email}
						placeholder={t.auth.emailPlaceholder}
						autocomplete="email"
						required
						disabled={loading}
					/>
				</label>

				<label class="label">
					<span class="text-sm font-medium">{t.auth.lozinka}</span>
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
						<span class="text-xs text-surface-400">{t.auth.minKaraktera}</span>
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
					{isRegistering ? t.auth.registracija : t.auth.prijava}
				</button>
			</form>

			<hr class="border-surface-300-600-token" />

			<!-- Prebaci mod -->
			<p class="text-center text-sm text-surface-500">
				{isRegistering ? t.auth.vecImateRacun : t.auth.nemateRacun}
				<button class="anchor font-medium" type="button" on:click={switchMode}>
					{isRegistering ? t.auth.prijaviteSe : t.auth.registrujteSe}
				</button>
			</p>
		</div>
	</div>
{/if}
