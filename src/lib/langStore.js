import { writable, derived } from 'svelte/store';
import { translations } from './translations.js';

// 1. Detekcija jezika
const getInitialLang = () => {
    if (typeof window === 'undefined') return 'en';
    
    // Prvo gledamo da li je korisnik već ranije sam izabrao jezik
    const saved = localStorage.getItem('app_lang');
    if (saved && translations[saved]) return saved;

    // Ako nije, gledamo jezik telefona/browsera
    const browserLang = navigator.language.split('-')[0]; // Uzima npr. 'es' iz 'es-ES'
    return translations[browserLang] ? browserLang : 'en'; // Ako imamo taj jezik - super, ako ne - engleski
};

export const currentLang = writable(getInitialLang());

// 2. Automatsko spašavanje izbora
currentLang.subscribe(val => {
    if (typeof window !== 'undefined') localStorage.setItem('app_lang', val);
});

// 3. Optimizovana t-funkcija (automatski se osvježava)
export const t = derived(currentLang, ($currentLang) => {
    return (key) => translations[$currentLang][key] || key;
});
