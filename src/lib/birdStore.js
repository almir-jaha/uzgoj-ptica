import { writable } from 'svelte/store';

const izracunajTermine = (datum) => {
    if (!datum) return null;
    let start = new Date(datum);
    const dodaj = (d, n) => {
        let res = new Date(d);
        res.setDate(res.getDate() + n);
        return res.toISOString().split('T')[0];
    };
    return {
        datumPrvogJajeta: datum,
        provjeraJaja: dodaj(start, 6),
        izlijeganje: dodaj(start, 13),
        prstenovanje: dodaj(start, 20),
        odvajanje: dodaj(start, 43)
    };
};

const ISSERVER = typeof window === 'undefined';

const kreirajPocetneKaveze = () => {
    let kavezi = [];
    for (let i = 1; i <= 20; i++) {
        kavezi.push({ id: i, oznaka: i.toString(), status: 'prazno', tura: 1, ciklus: null, vrsta: '', tempVrsta: '' });
    }
    return kavezi;
};

let pocetnoStanje = { kavezi: kreirajPocetneKaveze(), istorija: [] };

if (!ISSERVER) {
    const snimljeno = localStorage.getItem('bird_app_v2');
    if (snimljeno) {
        try {
            const parsirano = JSON.parse(snimljeno);
            if (parsirano && parsirano.kavezi) pocetnoStanje = parsirano;
        } catch (e) { console.error(e); }
    }
}

export const store = writable(pocetnoStanje);

if (!ISSERVER) {
    store.subscribe(v => localStorage.setItem('bird_app_v2', JSON.stringify(v)));
}

export const akcije = {
    zapocniCiklus: (id, datum, vrsta) => {
        store.update(s => {
            s.kavezi = s.kavezi.map(k => k.id === id ? { ...k, status: 'jaja', vrsta: vrsta || k.tempVrsta, ciklus: izracunajTermine(datum) } : k);
            return s;
        });
    },
    zavrsiTuru: (id) => {
        if (!confirm("Arhivirati i završiti turu?")) return;
        store.update(s => {
            const kIndex = s.kavezi.findIndex(k => k.id === id);
            if (kIndex !== -1) {
                const k = s.kavezi[kIndex];
                s.istorija.push({ ...k, datum_arhiva: new Date().toISOString() });
                s.kavezi[kIndex] = { ...k, status: 'prazno', tura: k.tura + 1, ciklus: null, tempVrsta: k.vrsta };
            }
            return s;
        });
    },
    azurirajAlarme: () => {
        if (ISSERVER) return;
        const danas = new Date().toISOString().split('T')[0];
        store.update(s => {
            s.kavezi = s.kavezi.map(k => {
                if (!k.ciklus) return k;
                const hitno = [k.ciklus.provjeraJaja, k.ciklus.izlijeganje, k.ciklus.prstenovanje].includes(danas);
                return { ...k, status: hitno ? 'alarm' : 'jaja' };
            });
            return s;
        });
    },
    exportPodataka: () => {
        let podaci; store.subscribe(v => podaci = v)();
        const blob = new Blob([JSON.stringify(podaci)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `backup_ptica.json`;
        a.click();
    },
    importPodataka: (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const p = JSON.parse(ev.target.result);
                if (p.kavezi) store.set(p);
            } catch (err) { alert("Greška!"); }
        };
        reader.readAsText(file);
    }
};
