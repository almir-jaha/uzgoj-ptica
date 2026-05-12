<script>
    import { onMount } from 'svelte';
    import { fade } from 'svelte/transition';
    import { store, akcije } from '$lib/birdStore.js';
    import { currentLang, t } from '$lib/langStore.js';
    import { translations } from '$lib/translations.js';

    let settingsOpen = false;
    let darkMode = false;
    let odabraniDatum = new Date().toISOString().split('T')[0];
    const popularneVrste = ["Kanarinac boja", "Kanarinac stasa", "Štiglić", "Zeba"];

    onMount(() => { akcije.azurirajAlarme(); });
</script>

<main class={darkMode ? 'dark' : ''}>
    <header>
        <h1>{$t('title')} 🐦</h1>
        <button class="icon-btn" on:click={() => settingsOpen = true}>⚙️</button>
    </header>

    <div class="mreza">
        {#each $store.kavezi as kavez (kavez.id)}
            <div class="kartica {kavez.status}">
                <div class="k-head">
                    <span class="broj">{kavez.oznaka}</span>
                    <span class="tura">{$t('tour')} {kavez.tura}</span>
                </div>
                <div class="sadrzaj">
                    {#if kavez.status === 'prazno'}
                        <div class="input-polje">
                            <label>{$t('bird_type')}</label>
                            <input list="v-list" bind:value={kavez.tempVrsta} placeholder="..." />
                            <datalist id="v-list">
                                {#each popularneVrste as v}<option value={v} />{/each}
                            </datalist>
                            <label>{$t('first_egg')}</label>
                            <input type="date" bind:value={odabraniDatum} />
                        </div>
                    {:else}
                        <div class="podaci">
                            <p>🏷️ <b>{kavez.vrsta || '---'}</b></p>
                            <p>🥚 {$t('check_eggs')}: {kavez.ciklus.provjeraJaja}</p>
                            <p>💍 {$t('ringing')}: {kavez.ciklus.prstenovanje}</p>
                        </div>
                    {/if}
                </div>
                <div class="footer">
                    {#if kavez.status === 'prazno'}
                        <button class="btn-go" on:click={() => akcije.zapocniCiklus(kavez.id, odabraniDatum, kavez.tempVrsta)}>
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
        <div class="overlay" on:click={() => settingsOpen = false} transition:fade>
            <div class="modal" on:click|stopPropagation>
                <h3>{$t('settings')}</h3>
                <div class="red">
                    <label>Language:</label>
                    <select bind:value={$currentLang}>
                        {#each Object.entries(translations) as [kod, s]}
                            <option value={kod}>{s.flag} {kod.toUpperCase()}</option>
                        {/each}
                    </select>
                </div>
                <div class="red">
                    <label>Dark Mode:</label>
                    <input type="checkbox" bind:checked={darkMode} />
                </div>
                <hr />
                <button class="btn-b" on:click={akcije.exportPodataka}>📥 Backup</button>
                <label class="btn-r">
                    📤 Restore
                    <input type="file" accept=".json" on:change={akcije.importPodataka} hidden />
                </label>
                <button class="btn-c" on:click={() => settingsOpen = false}>OK</button>
            </div>
        </div>
    {/if}
</main>

<style>
    :global(body) { margin: 0; font-family: sans-serif; background: #f4f4f4; }
    main.dark { background: #121212; color: white; min-height: 100vh; }
    header { display: flex; justify-content: space-between; padding: 15px; background: white; }
    main.dark header { background: #1a1a1a; }
    .mreza { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; padding: 10px; }
    .kartica { background: white; border-radius: 10px; padding: 12px; border-top: 5px solid #ccc; }
    main.dark .kartica { background: #222; }
    .kartica.jaja { border-top-color: #f1c40f; }
    .kartica.alarm { border-top-color: #e74c3c; }
    .input-polje { display: flex; flex-direction: column; gap: 5px; }
    input { padding: 8px; border-radius: 5px; border: 1px solid #ddd; }
    .btn-go { background: #2ecc71; color: white; border: none; padding: 10px; border-radius: 5px; width: 100%; cursor: pointer; }
    .btn-off { background: #eee; border: none; padding: 5px; border-radius: 5px; width: 100%; font-size: 0.7rem; }
    .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: grid; place-items: center; }
    .modal { background: white; padding: 20px; border-radius: 10px; width: 80%; max-width: 300px; color: #333; }
    .btn-b { background: #3498db; color: white; width: 100%; margin-bottom: 10px; border: none; padding: 10px; border-radius: 5px; }
    .btn-r { display: block; background: #95a5a6; color: white; padding: 10px; border-radius: 5px; text-align: center; cursor: pointer; }
    .icon-btn { background: none; border: none; font-size: 1.5rem; }
</style>
