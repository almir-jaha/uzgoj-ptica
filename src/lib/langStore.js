import { writable } from 'svelte/store';
import { translations } from './translations.js';

// Učitaj jezik iz memorije ili postavi defaultni (bs)
const initialLang = (typeof window !== 'undefined' && localStorage.getItem('app_lang')) || 'bs';

export const currentLang = writable(initialLang);

// Funkcija za prevod (t-funkcija)
export const t = writable((key) => {
    let lang;
    currentLang.subscribe(val => lang = val)();
    return translations[lang][key] || key;
});

// Snimi jezik u telefon kad god se promijeni
currentLang.subscribe(val => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('app_lang', val);
    }
});
