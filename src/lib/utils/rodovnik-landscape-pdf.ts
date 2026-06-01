import type { Ptica } from '$lib/db/schema';
import { db } from '$lib/db/dexie';
import { get } from 'svelte/store';
import { aktivnaUzgajivacnica } from '$lib/stores/uzgajivacnica';

interface RodovnikNode {
	ptica: Ptica;
	vrstaLabel: string;
	slika: string | null;
	otac: RodovnikNode | null;
	majka: RodovnikNode | null;
}

const ROW_H = 63;
const LINE_W = 2;
const GEN1_TOTAL_H = 8 * ROW_H;   // 504pt
const QR_ROW_H = 63;
const INFO_ROW_H = GEN1_TOTAL_H - QR_ROW_H; // 441pt
const CELL_BG = '#EEF2FF';

async function pngToJpeg(dataUrl: string | null, bgColor = '#ffffff'): Promise<string | null> {
	if (!dataUrl || typeof document === 'undefined') return dataUrl;
	return new Promise((resolve) => {
		const img = new Image();
		img.onload = () => {
			const canvas = document.createElement('canvas');
			canvas.width = 256; canvas.height = 256;
			const ctx = canvas.getContext('2d');
			if (!ctx) { resolve(dataUrl); return; }
			ctx.fillStyle = bgColor;
			ctx.fillRect(0, 0, 256, 256);
			ctx.drawImage(img, 0, 0, 256, 256);
			resolve(canvas.toDataURL('image/jpeg', 0.92));
		};
		img.onerror = () => resolve(dataUrl);
		img.src = dataUrl;
	});
}

async function urlToBase64(url: string): Promise<string | null> {
	try {
		const resp = await fetch(url);
		if (!resp.ok) return null;
		const blob = await resp.blob();
		return new Promise<string>((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result as string);
			reader.onerror = () => reject(new Error('Greška pri čitanju slike'));
			reader.readAsDataURL(blob);
		});
	} catch {
		return null;
	}
}

async function buildTree(pticaId: string | undefined, genLevel: number): Promise<RodovnikNode | null> {
	if (!pticaId || genLevel > 4) return null;
	const ptica = await db.ptice.get(pticaId);
	if (!ptica) return null;
	const vrsta = await db.vrsta_ptica.get(ptica.vrsta_ptica_id);
	let slika: string | null = null;
	if (genLevel <= 2 && ptica.slika_url) slika = await urlToBase64(ptica.slika_url);
	const [otac, majka] = await Promise.all([
		buildTree(ptica.otac_id, genLevel + 1),
		buildTree(ptica.majka_id, genLevel + 1)
	]);
	return { ptica, vrstaLabel: vrsta?.naziv ?? '—', slika, otac, majka };
}

// Oznake pola — promijeniti ovdje za drugi jezik (npr. 'M'/'F' za engleski)
const POL_OZNAKE: Record<string, string> = { 'M': 'M', 'Ž': 'Ž' };

function spolTekst(spol?: string): string {
	return POL_OZNAKE[spol ?? ''] ?? '';
}

function prstenStr(p: Ptica): string {
	if (p.prstena_oznaka && p.prsten_redni_broj != null) return `${p.prstena_oznaka}-${p.prsten_redni_broj}`;
	if (p.prstena_oznaka) return p.prstena_oznaka;
	if (p.prsten_redni_broj != null) return `#${p.prsten_redni_broj}`;
	return '';
}

function buildBirdCard(node: RodovnikNode, genLevel: number): object[] {
	const p = node.ptica;
	const fs = genLevel === 1 ? 10 : genLevel === 2 ? 9 : genLevel === 3 ? 7.5 : 7;
	const naam = p.naziv || prstenStr(p) || p.id.slice(0, 8);
	const prsten = prstenStr(p);
	const spolColor = p.spol === 'M' ? '#1565c0' : p.spol === 'Ž' ? '#c2185b' : '#444';
	const stack: object[] = [];

	// Pol: plain tekst M/Ž u boji (Unicode simboli ♂/♀ nisu u Roboto fontu)
	const spolStr = spolTekst(p.spol);
	stack.push({
		columns: [
			{ text: prsten || naam, fontSize: fs, bold: true, color: '#111' },
			...(spolStr ? [{ text: spolStr, fontSize: fs, bold: true, color: spolColor, alignment: 'right', width: 'auto' }] : [])
		],
		margin: [0, 0, 0, 2]
	});

	if (p.naziv && prsten) {
		stack.push({ text: p.naziv, fontSize: fs, color: '#2a9d8f', bold: true, margin: [0, 0, 0, 1] });
	}

	if (node.slika && genLevel <= 2) {
		stack.push({ image: node.slika, width: genLevel === 1 ? 90 : 62, alignment: 'center', margin: [0, 2, 0, 3] });
	}

	if (genLevel <= 3) {
		stack.push({ text: node.vrstaLabel, fontSize: fs - 1.5, color: '#888', margin: [0, 0, 0, 1] });
	}

	if (p.boja && genLevel <= 3) {
		stack.push({ text: p.boja, fontSize: fs - 0.5, bold: true, color: '#444', margin: [0, 0, 0, 1] });
	}

	if (p.rezultati && genLevel <= 2) {
		stack.push({ text: p.rezultati, fontSize: fs - 1, color: '#555', italics: true, margin: [0, 0, 0, 1] });
	}

	if (p.napomena_rodovnik && genLevel === 1) {
		stack.push({ text: p.napomena_rodovnik, fontSize: 7.5, color: '#777', italics: true, margin: [0, 2, 0, 0] });
	}

	return stack;
}

function makeCell(node: RodovnikNode | null, rowSpan: number, genLevel: number): object {
	if (!node) {
		return {
			rowSpan,
			text: '—',
			fontSize: 7,
			color: '#ccc',
			alignment: 'center',
			fillColor: '#f9f9f9',
			margin: [2, 2, 2, 2]
		};
	}
	const fillColor = genLevel === 2
		? (node.ptica.spol === 'M' ? '#F0F6FF' : '#FFF0F6')
		: '#ffffff';

	return {
		rowSpan,
		stack: buildBirdCard(node, genLevel),
		fillColor,
		margin: [4, 4, 4, 4]
	};
}

export async function generirajLandscapeRodovnikPDF(pticaId: string): Promise<void> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const pdfMakeModule = await import('pdfmake/build/pdfmake') as any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const vfsFontsModule = await import('pdfmake/build/vfs_fonts') as any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const QRCodeModule = await import('qrcode') as any;

	const pdfMake = pdfMakeModule.default ?? pdfMakeModule;
	const vfsFonts = vfsFontsModule.default ?? vfsFontsModule;
	const QRCode = QRCodeModule.default ?? QRCodeModule;

	if (typeof pdfMake.addVirtualFileSystem === 'function') {
		pdfMake.addVirtualFileSystem(vfsFonts);
	} else {
		pdfMake.vfs = vfsFonts;
	}

	const tree = await buildTree(pticaId, 1);
	if (!tree) throw new Error('Ptica nije pronađena');

	const info = get(aktivnaUzgajivacnica);

	const [logoBase64, appLogoRaw, qrBase64] = await Promise.all([
		info?.slika_url ? urlToBase64(info.slika_url) : Promise.resolve(null),
		urlToBase64('/app-logo.png'),
		QRCode.toDataURL(
			`${info?.app_url?.trim() || (typeof window !== 'undefined' ? window.location.origin : '')}/ptica/${pticaId}`,
			{ width: 140, margin: 1, errorCorrectionLevel: 'M' }
		) as Promise<string>
	]);

	// App logo s pozadinom koja se podudara s bojom ćelije — nema bijelog pravokutnika
	const appLogoBase64 = await pngToJpeg(appLogoRaw, CELL_BG);

	const g2_otac = tree.otac;
	const g2_majka = tree.majka;
	const g3 = [
		g2_otac?.otac ?? null, g2_otac?.majka ?? null,
		g2_majka?.otac ?? null, g2_majka?.majka ?? null
	];
	const g4 = [
		g3[0]?.otac ?? null, g3[0]?.majka ?? null,
		g3[1]?.otac ?? null, g3[1]?.majka ?? null,
		g3[2]?.otac ?? null, g3[2]?.majka ?? null,
		g3[3]?.otac ?? null, g3[3]?.majka ?? null
	];

	// ── Gornji dio gen1 ćelije: info uzgajivačnice (lijevo) + app logo (desno) ──
	const infoStack: object[] = [];
	if (logoBase64) {
		infoStack.push({ image: logoBase64, fit: [115, 115], margin: [0, 0, 0, 4] });
	}
	infoStack.push({ text: info?.naziv || 'Uzgajivacnica', fontSize: 10.5, bold: true, color: '#222', margin: [0, 0, 0, 1] });
	if (info?.ime_prezime) infoStack.push({ text: info.ime_prezime, fontSize: 8.5, color: '#555' });
	if (info?.adresa) infoStack.push({ text: info.adresa, fontSize: 8, color: '#777' });
	if (info?.telefon) infoStack.push({ text: `Tel: ${info.telefon}`, fontSize: 8, color: '#777' });

	const appLogoCell = appLogoBase64
		? {
			table: {
				body: [[{ image: appLogoBase64, width: 36, height: 36, margin: [2, 2, 2, 2] }]],
				widths: [40]
			},
			layout: {
				hLineWidth: () => 2,
				vLineWidth: () => 2,
				hLineColor: () => '#333333',
				vLineColor: () => '#333333',
				paddingLeft: () => 0,
				paddingRight: () => 0,
				paddingTop: () => 0,
				paddingBottom: () => 0
			},
			width: 'auto',
			margin: [4, 0, 0, 0]
		  }
		: null;

	const headerRow: object = {
		columns: [
			{ stack: infoStack, width: '*' },
			...(appLogoCell ? [appLogoCell] : [])
		],
		margin: [0, 0, 0, 6]
	};

	// Separator + bird card
	const birdContent: object[] = [
		headerRow,
		{ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 165, y2: 0, lineWidth: 0.5, lineColor: '#aaaaaa' }], margin: [0, 0, 0, 6] },
		...buildBirdCard(tree, 1)
	];

	// ── Donji dio gen1 ćelije: QR kod ──
	const datumStr = new Date().toLocaleDateString('hr-BA', { day: '2-digit', month: '2-digit', year: 'numeric' });
	const qrSection = {
		columns: [
			{
				table: {
					body: [[{ image: qrBase64, width: 46, margin: [3, 3, 3, 3] }]],
					widths: [52]
				},
				layout: {
					hLineWidth: () => 2,
					vLineWidth: () => 2,
					hLineColor: () => '#333333',
					vLineColor: () => '#333333',
					paddingLeft: () => 0,
					paddingRight: () => 0,
					paddingTop: () => 0,
					paddingBottom: () => 0
				},
				width: 'auto'
			},
			{
				stack: [
					{ text: 'SKENIRAJ', fontSize: 7.5, bold: true, color: '#333' },
					{ text: 'QR KOD', fontSize: 7.5, bold: true, color: '#333' },
					{ text: 'za više', fontSize: 7, color: '#555' },
					{ text: 'informacija', fontSize: 7, color: '#555' },
					{ text: `Datum: ${datumStr}`, fontSize: 6.5, color: '#888', margin: [0, 4, 0, 0] }
				],
				margin: [6, 4, 0, 0]
			}
		]
	};

	// ── Gen1 ćelija: nested tablica koja prikvačuje QR na dno ──
	const gen1Cell = {
		rowSpan: 8,
		fillColor: CELL_BG,
		margin: [0, 0, 0, 0],
		stack: [{
			table: {
				widths: ['*'],
				heights: [INFO_ROW_H, QR_ROW_H],
				body: [
					[{ stack: birdContent, margin: [6, 6, 6, 4] }],
					[{ ...qrSection, margin: [6, 4, 6, 4] }]
				]
			},
			layout: {
				hLineWidth: () => 0,
				vLineWidth: () => 0,
				paddingLeft: () => 0,
				paddingRight: () => 0,
				paddingTop: () => 0,
				paddingBottom: () => 0
			}
		}]
	};

	const WIDTHS = [195, 178, 158, '*'];

	const tableBody = [
		[gen1Cell, makeCell(g2_otac, 4, 2), makeCell(g3[0], 2, 3), makeCell(g4[0], 1, 4)],
		[{}, {}, {}, makeCell(g4[1], 1, 4)],
		[{}, {}, makeCell(g3[1], 2, 3), makeCell(g4[2], 1, 4)],
		[{}, {}, {}, makeCell(g4[3], 1, 4)],
		[{}, makeCell(g2_majka, 4, 2), makeCell(g3[2], 2, 3), makeCell(g4[4], 1, 4)],
		[{}, {}, {}, makeCell(g4[5], 1, 4)],
		[{}, {}, makeCell(g3[3], 2, 3), makeCell(g4[6], 1, 4)],
		[{}, {}, {}, makeCell(g4[7], 1, 4)]
	];

	const fileName = `Rodovnik_L_${(tree.ptica.naziv || prstenStr(tree.ptica) || pticaId.slice(0, 8)).replace(/[^a-zA-Z0-9_\-]/g, '_')}_${new Date().getFullYear()}.pdf`;

	const docDefinition = {
		pageSize: 'A4',
		pageOrientation: 'landscape',
		pageMargins: [20, 20, 20, 20],

		content: [
			{
				table: {
					widths: WIDTHS,
					heights: Array(8).fill(ROW_H),
					body: tableBody
				},
				layout: {
					hLineWidth: () => LINE_W,
					vLineWidth: () => LINE_W,
					hLineColor: () => '#ffffff',
					vLineColor: () => '#ffffff',
					paddingLeft: () => 0,
					paddingRight: () => 0,
					paddingTop: () => 0,
					paddingBottom: () => 0
				}
			}
		],

		defaultStyle: {
			font: 'Roboto',
			fontSize: 8
		}
	};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(pdfMake as any).createPdf(docDefinition).download(fileName);
}
