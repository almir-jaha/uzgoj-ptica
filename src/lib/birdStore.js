// Pomoćna funkcija za poređenje sa današnjim datumom
const jeLiDanas = (datumString) => {
    if (!datumString) return false;
    const danas = new Date().toISOString().split('T')[0];
    return datumString === danas;
};

export const akcije = {
    // ... tvoje postojeće akcije (zapocniCiklus, isprazniKavez)

    // Funkcija koja osvježava statuse kaveza na osnovu datuma
    azurirajAlarme: () => {
        kavezi.update(lista => {
            return lista.map(k => {
                if (!k.ciklus) return k;

                // Ako je danas dan za prstenovanje ili provjeru jaja, dodaj 'alarm'
                const hitno = jeLiDanas(k.ciklus.prstenovanje) || jeLiDanas(k.ciklus.provjeraJaja);
                
                return {
                    ...k,
                    status: hitno ? 'alarm' : (k.status === 'alarm' ? 'jaja' : k.status)
                };
            });
        });
    }
};
