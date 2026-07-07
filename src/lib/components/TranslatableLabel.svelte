<script lang="ts">
	import { user } from '$lib/stores/auth';
	import { locale } from '$lib/i18n/locale';
	import PrijedlogModal from './PrijedlogModal.svelte';

	// key = dot-path ključ iz i18n strukture (npr. "nav.sezone" ili "genetikaPolja.polja.stav")
	export let key: string;
	export let value: string;

	let modalOtvoren = false;
</script>

<span class="group inline-flex items-center gap-1">
	<span>{value}</span>
	{#if $user}
		<button
			type="button"
			class="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-xs leading-none text-surface-400 hover:text-primary-500"
			title="Predloži bolji prijevod"
			on:click={() => (modalOtvoren = true)}
		>
			💬
		</button>
	{/if}
</span>

{#if modalOtvoren && $user}
	<PrijedlogModal
		terminKljuc={key}
		trenutniPrijevod={value}
		jezik={$locale}
		userId={$user.id}
		onClose={() => (modalOtvoren = false)}
	/>
{/if}
