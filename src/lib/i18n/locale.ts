import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import type { Translations } from './bs';

import { bs } from './bs';
import { hr } from './hr';
import { sr } from './sr';
import { sl } from './sl';
import { en } from './en';
import { de } from './de';
import { fr } from './fr';
import { it } from './it';
import { es } from './es';
import { nl } from './nl';
import { pl } from './pl';
import { tr } from './tr';
import { zh } from './zh';
import { bg } from './bg';
import { hu } from './hu';
import { ro } from './ro';
import { pt } from './pt';

export type LangCode =
  | 'bs' | 'hr' | 'sr' | 'sl'
  | 'en' | 'de' | 'fr' | 'it' | 'es' | 'nl' | 'pl'
  | 'tr' | 'zh' | 'bg' | 'hu' | 'ro' | 'pt';

export interface LangMeta {
  naziv: string;
  flag: string;
  dir: 'ltr' | 'rtl';
}

export const LANGUAGES: Record<LangCode, LangMeta> = {
  bs: { naziv: 'Bosanski',    flag: '🇧🇦', dir: 'ltr' },
  hr: { naziv: 'Hrvatski',    flag: '🇭🇷', dir: 'ltr' },
  sr: { naziv: 'Srpski',      flag: '🇷🇸', dir: 'ltr' },
  sl: { naziv: 'Slovenščina', flag: '🇸🇮', dir: 'ltr' },
  en: { naziv: 'English',     flag: '🇬🇧', dir: 'ltr' },
  de: { naziv: 'Deutsch',     flag: '🇩🇪', dir: 'ltr' },
  fr: { naziv: 'Français',    flag: '🇫🇷', dir: 'ltr' },
  it: { naziv: 'Italiano',    flag: '🇮🇹', dir: 'ltr' },
  es: { naziv: 'Español',     flag: '🇪🇸', dir: 'ltr' },
  nl: { naziv: 'Nederlands',  flag: '🇳🇱', dir: 'ltr' },
  pl: { naziv: 'Polski',      flag: '🇵🇱', dir: 'ltr' },
  tr: { naziv: 'Türkçe',      flag: '🇹🇷', dir: 'ltr' },
  zh: { naziv: '中文',         flag: '🇨🇳', dir: 'ltr' },
  bg: { naziv: 'Български',   flag: '🇧🇬', dir: 'ltr' },
  hu: { naziv: 'Magyar',      flag: '🇭🇺', dir: 'ltr' },
  ro: { naziv: 'Română',      flag: '🇷🇴', dir: 'ltr' },
  pt: { naziv: 'Português',   flag: '🇵🇹', dir: 'ltr' },
};

const TRANSLATIONS: Record<LangCode, Translations> = {
  bs, hr, sr, sl, en, de, fr, it, es, nl, pl, tr, zh, bg, hu, ro, pt
};

function detectLang(): LangCode {
  if (!browser) return 'bs';
  const stored = localStorage.getItem('lang') as LangCode | null;
  if (stored && stored in TRANSLATIONS) return stored;
  // Browser language detection
  const browserLang = navigator.language.split('-')[0] as LangCode;
  if (browserLang in TRANSLATIONS) return browserLang;
  return 'bs';
}

export const locale = writable<LangCode>(detectLang());

if (browser) {
  locale.subscribe((lang) => {
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = LANGUAGES[lang].dir;
  });
}

export const t = derived(locale, ($locale) => TRANSLATIONS[$locale]);
