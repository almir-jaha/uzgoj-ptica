import fs from 'node:fs';
import path from 'node:path';

// Samo server-side (SvelteKit blokira import ovog fajla iz klijentskog koda jer je u $lib/server).

const I18N_DIR = path.resolve('src/lib/i18n');

/**
 * Pronađe indeks zatvarajuće vitičaste zagrade koja odgovara otvarajućoj na `openIndex`,
 * preskačući sadržaj string literala (da placeholderi poput '{godina}' ne pokvare brojanje).
 */
function findMatchingBrace(source: string, openIndex: number): number {
	let depth = 0;
	let inString: string | null = null;

	for (let i = openIndex; i < source.length; i++) {
		const ch = source[i];

		if (inString) {
			if (ch === '\\') { i++; continue; }
			if (ch === inString) inString = null;
			continue;
		}

		if (ch === '"' || ch === "'" || ch === '`') { inString = ch; continue; }

		if (ch === '{') depth++;
		else if (ch === '}') {
			depth--;
			if (depth === 0) return i;
		}
	}

	throw new Error('Nepodudarajuće vitičaste zagrade u i18n fajlu');
}

/** Suzi opseg pretrage na tijelo objekta koji odgovara `key: { ... }` unutar zadanog opsega. */
function narrowToKeyBlock(
	source: string,
	key: string,
	rangeStart: number,
	rangeEnd: number
): { start: number; end: number } {
	const re = new RegExp(`\\b${key}\\s*:\\s*\\{`);
	const slice = source.slice(rangeStart, rangeEnd);
	const match = re.exec(slice);
	if (!match) throw new Error(`Ključ "${key}" nije pronađen u i18n fajlu`);

	const openBraceIndex = rangeStart + match.index + match[0].length - 1;
	const closeBraceIndex = findMatchingBrace(source, openBraceIndex);

	return { start: openBraceIndex + 1, end: closeBraceIndex };
}

function escapeForQuote(value: string, quote: string): string {
	return value
		.replaceAll('\\', '\\\\')
		.replaceAll(quote, `\\${quote}`)
		.replaceAll('\n', '\\n');
}

/** Zamijeni vrijednost `key: '...'` (string literal) unutar zadanog opsega, čuvajući stil navodnika. */
function replaceLeafValue(
	source: string,
	key: string,
	rangeStart: number,
	rangeEnd: number,
	newValue: string
): string {
	const re = new RegExp(`(\\b${key}\\s*:\\s*)(['"\`])((?:\\\\.|(?!\\2).)*)(\\2)`);
	const slice = source.slice(rangeStart, rangeEnd);
	const match = re.exec(slice);
	if (!match) throw new Error(`Ključ "${key}" nije pronađen kao tekstualna vrijednost`);

	const quote = match[2];
	const replacement = `${match[1]}${quote}${escapeForQuote(newValue, quote)}${quote}`;
	const absStart = rangeStart + match.index;
	const absEnd = absStart + match[0].length;

	return source.slice(0, absStart) + replacement + source.slice(absEnd);
}

/**
 * Ažurira prijevod za dot-path ključ (npr. "nav.sezone" ili "genetikaPolja.polja.stav")
 * u src/lib/i18n/<jezik>.ts fajlu, direktnim upisom u source fajl.
 *
 * NAPOMENA: Ovo mijenja fajl na disku — radi samo kad Node ima pisati pristup
 * (lokalni `npm run dev`). Na Vercel produkciji je fajl-sistem read-only/efemeran,
 * pa poziv treba biti blokiran prije nego stigne ovdje (vidi +server.ts).
 */
export function updateTranslationInFile(jezik: string, terminKljuc: string, noviPrijevod: string): void {
	const filePath = path.join(I18N_DIR, `${jezik}.ts`);
	if (!fs.existsSync(filePath)) {
		throw new Error(`i18n fajl za jezik "${jezik}" ne postoji`);
	}

	const segments = terminKljuc.split('.').filter(Boolean);
	if (segments.length === 0) {
		throw new Error('Prazan termin_kljuc');
	}

	let source = fs.readFileSync(filePath, 'utf-8');

	let rangeStart = 0;
	let rangeEnd = source.length;
	for (let i = 0; i < segments.length - 1; i++) {
		const block = narrowToKeyBlock(source, segments[i], rangeStart, rangeEnd);
		rangeStart = block.start;
		rangeEnd = block.end;
	}

	const leafKey = segments[segments.length - 1];
	source = replaceLeafValue(source, leafKey, rangeStart, rangeEnd, noviPrijevod);

	fs.writeFileSync(filePath, source, 'utf-8');
}
