<script>
    import { fade } from 'svelte/transition';
    import { currentLang, t } from '$lib/langStore.js';
    import { kavezi, akcije } from '$lib/birdStore.js';
    import { translations } from '$lib/translations.js';
    import { onMount } from 'svelte';

    let settingsOpen = false;
    let odabraniDatum = new Date().toISOString().split('T')[0];
    let darkMode = false;

    // Pomoćna funkcija za vizuelni alarm u HTML-u
    const jeLiDanas = (d) => d === new Date().toISOString().split('T')[0];

     const postaviDanas = () => {
        odabraniDatum = new Date().toISOString().split('T')[0];
    };


    onMount(() => {
        akcije.azurirajAlarme();
    });
</script>

<main class={darkMode ? 'dark-mode' : ''}>
    <header>
        <h1>{$t('title')} 🐦</h1>
        <button class="settings-btn" on:click={() => settingsOpen = true}>⚙️</button>
    </header>

    <div class="stalaža">
        {#each $kavezi as kavez}
            <div class="kavez-kartica {kavez.status}">
                <h3>{kavez.oznaka}</h3>
                <div class="info">
                    {#if kavez.status === 'prazno'}
                        <div class="input-grupa">
                            <input type="date" bind:value={odabraniDatum} />
                            <button class="today-btn" on:click={postaviDanas}>📅 {$t('today') || 'Danas'}</button>
                        </div>
                    {:else}
                        <!-- Info o ciklusu kao i ranije -->
                        <p>🐥 {$t('hatching')}: <b>{kavez.ciklus.izlijeganje}</b></p>
                        <p>💍 {$t('ringing')}: <b>{kavez.ciklus.prstenovanje}</b></p>
                    {/if}
                </div>
                <div class="akcije">
                    {#if kavez.status === 'prazno'}
                        <button class="glavni-btn" on:click={() => akcije.zapocniCiklus(kavez.id, odabraniDatum)}>
                            {$t('start_cycle')}
                        </button>
                    {:else}
                        <button class="secondary-btn" on:click={() => akcije.isprazniKavez(kavez.id)}>
                            {$t('finish')}
                        </button>
                    {/if}
                </div>
            </div>
        {/each}
    </div>

    <!-- SETTINGS MODAL -->
    {#if settingsOpen}
        <div class="overlay" on:click={() => settingsOpen = false}>
            <div class="modal" on:click|stopPropagation>
                <h3>{$t('settings')}</h3>
                
                <div class="setting-item">
                    <label>Jezik / Language:</label>
                    <select bind:value={$currentLang}>
                        {#each Object.entries(translations) as [kod, sadrzaj]}
                            <option value={kod}>{sadrzaj.flag} {kod.toUpperCase()}</option>
                        {/each}
                    </select>
                </div>

                <div class="setting-item">
                    <label>Dark Mode 🌙</label>
                    <input type="checkbox" bind:checked={darkMode} />
                </div>

                <button class="close-btn" on:click={() => settingsOpen = false}>OK</button>
            </div>
        </div>
    {/if}
</main>


<style>

/* DARK MODE STILOV */
    .dark-mode {
        background-color: #121212;
        color: white;
        min-height: 100vh;
    }
    .dark-mode .kavez-kartica {
        background: #1e1e1e;
        color: #eee;
    }
    .dark-mode header { background: #1a1a1a; border-bottom: 1px solid #333; }
    .dark-mode h1 { color: #fff; }

    /* DANAS DUGME STIL */
     .input-grupa { 
        display: flex; 
        gap: 8px; 
        margin-bottom: 10px;
        align-items: center; /* Poravnava ih po visini */
    }

    input[type="date"] {
        flex: 1; /* Datum zauzima sav preostali prostor */
        min-width: 0; /* Sprečava 'virenje' van kartice na jako malim ekranima */
        padding: 8px;
        font-size: 0.9rem;
    }

    .today-btn { 
        background: #e67e22; 
        color: white;
        padding: 8px 12px; 
        font-size: 0.8rem; 
        white-space: nowrap; /* Sprečava da tekst ode u dva reda */
        flex-shrink: 0; /* Ne dopušta dugmetu da se smanji i nestane */
        width: auto;
        border-radius: 6px;
        border: none;
    }

    /* MODAL STIL */
    .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: grid; place-items: center; z-index: 100; }
    .modal { background: white; padding: 20px; border-radius: 15px; width: 85%; max-width: 320px; color: #333; }
    .setting-item { display: flex; justify-content: space-between; align-items: center; margin: 15px 0; }
    select { padding: 8px; border-radius: 5px; font-size: 1rem; }

    
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

     header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 20px;
        background: #fff;
        border-bottom: 1px solid #eee;
    }

    .settings-btn {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
    }

    /* Stilovi za Settings prozor koji "iskače" */
    .settings-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }

    .settings-content {
        background: white;
        padding: 20px;
        border-radius: 15px;
        width: 80%;
        max-width: 300px;
        text-align: center;
    }

    .lang-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
        margin: 20px 0;
    }

    .lang-select {
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 8px;
        background: #f9f9f9;
        font-weight: bold;
    }

    .lang-select.active {
        background: #3498db;
        color: white;
        border-color: #2980b9;
    }

    .close-btn {
        background: #eee;
        color: #333;
        margin-top: 10px;
    }



</style>
