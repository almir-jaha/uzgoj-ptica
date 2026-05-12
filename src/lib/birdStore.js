import { writable } from 'svelte/store';

// Pomoćne funkcije ostaju iste (izracunajTermine)...

const ISSERVER = typeof window === 'undefined';
let snimljeno = { kavezi: [], istorija: [] };

if (!ISSERVER) {
    const data = localStorage.getItem('bird_app_v2');
    if (data) snimljeno = JSON.parse(data);
    else {
        for (let i = 1; i <= 20; i++) {
            snimljeno.kavezi.push({ id: i, oznaka: i.toString(), status: 'prazno', tura: 1, ciklus: null, vrsta: '' });
        }
    }
}

export const store = writable(snimljeno);
if (!ISSERVER) store.subscribe(v => localStorage.setItem('bird_app_v2', JSON.stringify(v)));

export const akcije = {
    zapocniCiklus: (id, datum, vrsta) => {
        store.update(s => {
            s.kavezi = s.kavezi.map(k => k.id === id ? { ...k, status: 'jaja', vrsta: vrsta, ciklus: izracunajTermine(datum) } : k);
            return s;
        });
    },
    // ... (zavrsiTuru i azurirajAlarme ostaju isti)

    exportPodataka: () => {
        let podaci;
        store.subscribe(v => podaci = v)();
        const blob = new Blob([JSON.stringify(podaci)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `uzgoj_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    },

    importPodataka: (e) => {
        const fajl = e.target.files[0];
        if (!fajl) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const podaci = JSON.parse(event.target.result);
                if (podaci.kavezi) {
                    store.set(podaci);
                    alert("✅ Podaci su uspješno učitani!");
                }
            } catch (err) { alert("❌ Greška: Fajl nije ispravan."); }
        };
        reader.readAsText(fajl);
    }
};
