<script>
    import { store, akcije } from '$lib/birdStore.js';
    import { currentLang, t } from '$lib/langStore.js';
    import { translations } from '$lib/translations.js';
    import { onMount } from 'svelte';

    let settingsOpen = false;
    let darkMode = false;
    let odabraniDatum = new Date().toISOString().split('T')[0];

    onMount(() => { akcije.azurirajAlarme(); });
</script>

<main class={darkMode ? 'dark' : ''}>
    <header>
        <h1>{$t('title')}</h1>
        <button class="icon-btn" on:click={() => settingsOpen = true}>⚙️</button>
    </header>

    <div class="mreza">
        {#each $store.kavezi as kavez}
            <div class="kartica {kavez.status}">
                <div class="k-head">
                    <span class="broj">{kavez.oznaka}</span>
                    <span class="tura">{$t('tour')} {kavez.tura}</span>
                </div>

                <div class="sadrzaj">
                    {#if kavez.status === 'prazno'}
                        <div class="input-polje">
                            <label>{$t('first_egg')}</label>
                            <input type="date" bind:value={odabraniDatum} />
                        </div>
                    {:else}
                        <div class="podaci">
                            <p>🥚 {$t('check_eggs')}: <b>{kavez.ciklus.provjeraJaja}</b></p>
                            <p>🐥 {$t('hatching')}: <b>{kavez.ciklus.izlijeganje}</b></p>
                            <p>💍 {$t('ringing')}: <b>{kavez.ciklus.prstenovanje}</b></p>
                        </div>
                    {/if}
                </div>

                <div class="footer">
                    {#if kavez.status === 'prazno'}
                        <button class="btn-go" on:click={() => akcije.zapocniCiklus(kavez.id, odabraniDatum)}>
                            {$t('start_cycle')}
                        </button>
                    {:else}
                        <button class="btn-off" on:click={() => akcije.zavrsiTuru(kavez.id)}>
                            {$t('finish')}
                        </button>
                    {/if}
                </div>
            </div>
        {/each}
    </div>

    {#if settingsOpen}
        <div class="overlay" on:click={() => settingsOpen = false}>
            <div class="modal" on:click|stopPropagation>
                <h3>{$t('settings')}</h3>
                <div class="red">
                    <label>Jezik:</label>
                    <select bind:value={$currentLang}>
                        {#each Object.entries(translations) as [kod, s]}
                            <option value={kod}>{s.flag} {kod.toUpperCase()}</option>
                        {/each}
                    </select>
                </div>
                <div class="red">
                    <label>Tamni način:</label>
                    <input type="checkbox" bind:checked={darkMode} />
                </div>
                <button class="btn-close" on:click={() => settingsOpen = false}>OK</button>
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

    :global(body) { margin: 0; font-family: sans-serif; background: #f0f2f5; }
    main { min-height: 100vh; padding-bottom: 50px; }
    main.dark { background: #121212; color: white; }
    
    header { background: white; padding: 15px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
    main.dark header { background: #1a1a1a; }

    .mreza { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; padding: 12px; }
    
    .kartica { background: white; border-radius: 12px; padding: 12px; display: flex; flex-direction: column; border-top: 6px solid #ccc; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
    main.dark .kartica { background: #222; border-top-color: #444; }
    
    .kartica.jaja { border-top-color: #f1c40f; }
    .kartica.alarm { border-top-color: #e74c3c; animation: puls 2s infinite; }
    
    .k-head { display: flex; justify-content: space-between; margin-bottom: 10px; font-weight: bold; }
    .tura { font-size: 0.75rem; color: #888; }
    
    .input-polje { display: flex; flex-direction: column; gap: 5px; }
    input[type="date"] { padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem; width: 100%; box-sizing: border-box; }
    
    .podaci { font-size: 0.85rem; line-height: 1.5; }
    
    .footer { margin-top: auto; padding-top: 10px; }
    button { width: 100%; padding: 10px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; }
    .btn-go { background: #2ecc71; color: white; }
    .btn-off { background: #f3f3f3; color: #666; font-size: 0.75rem; }
    
    .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: grid; place-items: center; z-index: 100; }
    .modal { background: white; padding: 20px; border-radius: 15px; width: 80%; max-width: 300px; color: #333; }
    .red { display: flex; justify-content: space-between; margin: 15px 0; align-items: center; }

    @keyframes puls { 
        0% { transform: scale(1); } 
        50% { transform: scale(1.02); } 
        100% { transform: scale(1); } 
    }

</style>
