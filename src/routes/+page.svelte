<script>
    import { onMount } from 'svelte';
    import { currentLang, t } from '$lib/langStore.js';
    import { kavezi, akcije } from '$lib/birdStore.js';

    let odabraniDatum = new Date().toISOString().split('T')[0];

    onMount(() => {
        akcije.azurirajAlarme();
    });

     function promijeniJezik(noviLang) {
        $currentLang = noviLang;
    }

</script>

<header>
    <h1>{$t('title')} 🐦</h1>
    <div class="lang-switcher">
        <button on:click={() => promijeniJezik('bs')}>BS</button>
        <button on:click={() => promijeniJezik('en')}>EN</button>
        <button on:click={() => promijeniJezik('it')}>IT</button>
    </div>
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
    /* Kontejner koji pravi dvije kolone na mobitelu */
    .stalaža {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 12px;
        padding: 12px;
        background-color: #f4f7f6;
    }

    /* Osnovni izgled kartice kaveza */
    .kavez-kartica {
        background: white;
        border-radius: 12px;
        padding: 15px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        min-height: 180px;
        border-left: 8px solid #ccc; /* Siva za prazne kaveze */
        transition: transform 0.2s;
    }

    /* Boje prema statusu - ključno za brz pregled */
    .kavez-kartica.jaja {
        border-left-color: #f1c40f; /* Žuta */
        background-color: #fffdf2;
    }

    .kavez-kartica.mladi {
        border-left-color: #2ecc71; /* Zelena */
        background-color: #f2fff7;
    }

    .kavez-kartica.alarm {
        border-left-color: #e74c3c; /* Crvena */
        animation: pulse 2s infinite;
    }

    h3 {
        margin: 0;
        font-size: 1.2rem;
        color: #333;
        display: flex;
        justify-content: space-between;
    }

    .info {
        font-size: 0.85rem;
        color: #666;
        margin: 10px 0;
    }

    .datum-bitno {
        font-weight: bold;
        color: #2c3e50;
        display: block;
        margin-top: 4px;
    }

    /* Dugmići prilagođeni palcu */
    button {
        width: 100%;
        padding: 10px;
        border: none;
        border-radius: 8px;
        background-color: #3498db;
        color: white;
        font-weight: bold;
        cursor: pointer;
        margin-top: 5px;
    }

    button.secondary {
        background-color: #ecf0f1;
        color: #7f8c8d;
        font-size: 0.75rem;
    }

    input[type="date"] {
        width: 100%;
        padding: 8px;
        margin-bottom: 5px;
        border: 1px solid #ddd;
        border-radius: 6px;
    }

    @keyframes pulse {
        0% { box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.4); }
        70% { box-shadow: 0 0 0 10px rgba(231, 76, 60, 0); }
        100% { box-shadow: 0 0 0 0 rgba(231, 76, 60, 0); }
    }
    .hitno { color: #e74c3c; font-weight: bold; text-decoration: underline; }
    .header-kartice { display: flex; justify-content: space-between; align-items: center; }
</style>
