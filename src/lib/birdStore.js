import { writable } from 'svelte/store';

// 1. POMOĆNE FUNKCIJE
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

// 2. INICIJALIZACIJA PODATAKA
const ISSERVER = typeof window === 'undefined';

const kreirajPocetneKaveze = () => {
    let kavezi = [];
    for (let i = 1; i <= 20; i++) {
        kavezi.push({ 
            id: i, 
            oznaka: i.toString(), 
            status: 'prazno', 
            tura: 1, 
            ciklus: null, 
            vrsta: '', 
            tempVrsta: '' 
        });
    }
    return kavezi;
};

let pocetnoStanje = { kavezi: kreirajPocetneKaveze(), istorija: [] };

if (!ISSERVER) {
    const snimljeno = localStorage.getItem('bird_app_v2');
    if (snimljeno) {
        try {
            const parsirano = JSON.parse(snimljeno);
            if (parsirano && parsirano.kavezi && parsirano.kavezi.length > 0) {
                pocetnoStanje = parsirano;
            }
        } catch (e) {
            console.error("Greška pri učitavanju podataka:", e);
        }
    }
}

// 3. KREIRANJE STORE-A
export const store = writable(pocetnoStanje);

// Automatsko spašavanje pri svakoj promjeni (samo na klijentu)
if (!ISSERVER) {
    store.subscribe(v => {
        localStorage.setItem('bird_app_v2', JSON.stringify(v));
    });
}

// 4. AKCIJE (LOGIKA BIZNISA)
export const akcije = {
    zapocniCiklus: (id, datum, vrsta) => {
        store.update(s => {
            s.kavezi = s.kavezi.map(k => {
                if (k.id === id) {
                    return { 
                        ...k, 
                        status: 'jaja', 
                        vrsta: vrsta || k.tempVrsta || '', 
                        ciklus: izracunajTermine(datum) 
                    };
                }
                return k;
            });
            return s;
        });
        akcije.azurirajAlarme();
    },

    zavrsiTuru: (id) => {
        if (!confirm("Završiti trenutnu turu i arhivirati podatke?")) return;
        store.update(s => {
            const kavezIndex = s.kavezi.findIndex(k => k.id === id);
            if (kavezIndex !== -1) {
                const kavez = s.kavezi[kavezIndex];
                // Dodaj u istoriju
                s.istorija.push({ 
                    ...kavez, 
                    datum_arhiva: new Date().toISOString() 
                });
                // Resetuj kavez za novu turu
                s.kavezi[kavezIndex] = { 
                    ...kavez, 
                    status: 'prazno', 
                    tura: kavez.tura + 1, 
                    ciklus: null,
                    tempVrsta: kavez.vrsta // Zadrži vrstu kao prijedlog za sljedeću turu
                };
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
                const hitno = k.ciklus.provjeraJaja === danas || 
                             k.ciklus.izlijeganje === danas || 
                             k.ciklus.prstenovanje === danas;
                return { ...k, status: hitno ? 'alarm' : 'jaja' };
            });
            return s;
        });
    },

    exportPodataka: () => {
        let trenutniPodaci;
        store.subscribe(v => trenutniPodaci = v)();
        const blob = new Blob([JSON.stringify(trenutniPodaci)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `uzgoj_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    },

    importPodataka: (event) => {
        const fajl = event.target.files[0];
        if (!fajl) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const uvezeniPodaci = JSON.parse(e.target.result);
                if (uvezeniPodaci.kavezi && Array.isArray(uvezeniPodaci.kavezi)) {
                    store.set(uvezeniPodaci);
                    alert("✅ Podaci su uspješno uvezeni!");
                } else {
                    alert("❌ Greška: Neispravan format backup fajla.");
                }
            } catch (err) {
                alert("❌ Greška pri čitanju fajla.");
            }
        };
        reader.readAsText(fajl);
    }
};
