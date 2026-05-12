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
let snimljeno = { kavezi: [], istorija: [] };

if (!ISSERVER) {
    const data = localStorage.getItem('bird_app_v2');
    if (data) {
        snimljeno = JSON.parse(data);
    } else {
        // Početno stanje ako je memorija prazna
        for (let i = 1; i <= 20; i++) {
            snimljeno.kavezi.push({ id: i, oznaka: i.toString(), status: 'prazno', tura: 1, ciklus: null });
        }
    }
}

export const store = writable(snimljeno);

if (!ISSERVER) {
    store.subscribe(v => localStorage.setItem('bird_app_v2', JSON.stringify(v)));
}

export const akcije = {
    zapocniCiklus: (id, datum) => {
        store.update(s => {
            s.kavezi = s.kavezi.map(k => k.id === id ? { ...k, status: 'jaja', ciklus: izracunajTermine(datum) } : k);
            return s;
        });
    },
    zavrsiTuru: (id) => {
        if (!confirm("Završiti turu?")) return;
        store.update(s => {
            const kavez = s.kavezi.find(k => k.id === id);
            // Arhiviranje
            s.istorija.push({ ...kavez, datum_arhiva: new Date().toISOString() });
            // Reset kaveza za novu turu
            s.kavezi = s.kavezi.map(k => k.id === id ? { ...k, status: 'prazno', tura: k.tura + 1, ciklus: null } : k);
            return s;
        });
    },
    azurirajAlarme: () => {
        const danas = new Date().toISOString().split('T')[0];
        store.update(s => {
            s.kavezi = s.kavezi.map(k => {
                if (!k.ciklus) return k;
                const hitno = k.ciklus.provjeraJaja === danas || k.ciklus.izlijeganje === danas || k.ciklus.prstenovanje === danas;
                return { ...k, status: hitno ? 'alarm' : 'jaja' };
            });
            return s;
        });
    }
};
