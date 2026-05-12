import { writable } from 'svelte/store';

// 1. POMOĆNE FUNKCIJE
const jeLiDanas = (datumString) => {
    if (!datumString) return false;
    const danas = new Date().toISOString().split('T')[0];
    return datumString === danas;
};

const izracunajTermine = (datumPrvogJajeta) => {
    if (!datumPrvogJajeta) return null;
    let start = new Date(datumPrvogJajeta);
    
    const dodajDane = (date, days) => {
        let d = new Date(date);
        d.setDate(d.getDate() + days);
        return d.toISOString().split('T')[0];
    };

    return {
        datumPrvogJajeta: datumPrvogJajeta,
        provjeraJaja: dodajDane(start, 6),
        izlijeganje: dodajDane(start, 13),
        prstenovanje: dodajDane(start, 20), // 13 + 7 dana
        odvajanje: dodajDane(start, 43)     // 13 + 30 dana
    };
};

// 2. INICIJALIZACIJA (Učitavanje iz memorije telefona)
const ISSERVER = typeof window === 'undefined';
let snimljeniPodaci = [];

if (!ISSERVER) {
    const data = localStorage.getItem('uzgoj_podaci');
    snimljeniPodaci = data ? JSON.parse(data) : [
        { id: 1, oznaka: '1A', status: 'prazno', ciklus: null },
        { id: 2, oznaka: '1B', status: 'prazno', ciklus: null },
        { id: 3, oznaka: '2A', status: 'prazno', ciklus: null },
        { id: 4, oznaka: '2B', status: 'prazno', ciklus: null },
        { id: 5, oznaka: '3A', status: 'prazno', ciklus: null },
        { id: 6, oznaka: '3B', status: 'prazno', ciklus: null }
    ];
}

// 3. EXPORT STORE-A (Mora imati "export")
export const kavezi = writable(snimljeniPodaci);

// Automatsko spašavanje pri svakoj promjeni
if (!ISSERVER) {
    kavezi.subscribe(vrijednost => {
        localStorage.setItem('uzgoj_podaci', JSON.stringify(vrijednost));
    });
}

// 4. EXPORT AKCIJA (Mora imati "export")
export const akcije = {
    zapocniCiklus: (idKaveza, datumJajeta) => {
        kavezi.update(lista => {
            return lista.map(k => {
                if (k.id === idKaveza) {
                    const termini = izracunajTermine(datumJajeta);
                    return {
                        ...k,
                        status: 'jaja',
                        ciklus: termini
                    };
                }
                return k;
            });
        });
        // Odmah osvježi alarme nakon unosa
        akcije.azurirajAlarme();
    },

    isprazniKavez: (idKaveza) => {
        if(confirm("Da li ste sigurni da želite obrisati podatke za ovaj kavez?")) {
            kavezi.update(lista => {
                return lista.map(k => k.id === idKaveza ? { ...k, status: 'prazno', ciklus: null } : k);
            });
        }
    },

    azurirajAlarme: () => {
        kavezi.update(lista => {
            return lista.map(k => {
                if (!k.ciklus) return k;

                const danasPrstenovanje = jeLiDanas(k.ciklus.prstenovanje);
                const danasProvjera = jeLiDanas(k.ciklus.provjeraJaja);
                const danasIzlijeganje = jeLiDanas(k.ciklus.izlijeganje);

                if (danasPrstenovanje || danasProvjera || danasIzlijeganje) {
                    return { ...k, status: 'alarm' };
                } else if (k.status === 'alarm') {
                    // Vrati na 'jaja' ako više nije kritičan datum
                    return { ...k, status: 'jaja' };
                }
                return k;
            });
        });
    }
};
