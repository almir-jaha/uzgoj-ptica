<script>
    import { onMount } from 'svelte';
    import { kavezi, akcije } from '$lib/birdStore.js';

    let odabraniDatum = new Date().toISOString().split('T')[0];

    onMount(() => {
        akcije.azurirajAlarme();
    });
</script>

<header>
    <h1>Moja Uzgajivačnica 🐦</h1>
</header>

<main class="stalaža">
    {#each $kavezi as kavez}
        <div class="kavez-kartica {kavez.status}">
            <div class="header-kartice">
                <h3>Kavez {kavez.oznaka}</h3>
                {#if kavez.status !== 'prazno'}<span>🪺</span>{/if}
            </div>

            <div class="info">
                {#if kavez.status === 'prazno'}
                    <label>Datum prvog jajeta:</label>
                    <input type="date" bind:value={odabraniDatum} />
                {:else}
                    <p>🥚 Provjera: <b>{kavez.ciklus.provjeraJaja}</b></p>
                    <p>🐥 Izlijeganje: <b>{kavez.ciklus.izlijeganje}</b></p>
                    <p class={kavez.status === 'alarm' ? 'hitno' : ''}>
                        💍 Prsten: <b>{kavez.ciklus.prstenovanje}</b>
                    </p>
                {/if}
            </div>

            <div class="akcije">
                {#if kavez.status === 'prazno'}
                    <button on:click={() => akcije.zapocniCiklus(kavez.id, odabraniDatum)}>
                        Započni ciklus
                    </button>
                {:else}
                    <button class="secondary" on:click={() => akcije.isprazniKavez(kavez.id)}>
                        Isprazni / Kraj
                    </button>
                {/if}
            </div>
        </div>
    {/each}
</main>

<style>
    /* Ovdje ubaci onaj CSS što sam ti poslao u prethodnom koraku */
    .hitno { color: #e74c3c; font-weight: bold; text-decoration: underline; }
    .header-kartice { display: flex; justify-content: space-between; align-items: center; }
</style>
