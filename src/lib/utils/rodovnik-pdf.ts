import type { Ptica } from '$lib/db/schema';
import { db } from '$lib/db/dexie';
import { get } from 'svelte/store';
import { postavke } from '$lib/stores/postavke';

interface RodovnikNode {
	ptica: Ptica;
	vrstaLabel: string;
	slika: string | null;
	otac: RodovnikNode | null;
	majka: RodovnikNode | null;
}

const ROW_H = 76;
const GEN1_TOTAL_H = 8 * ROW_H; // 608pt
const QR_ROW_H = 76;
const INFO_ROW_H = GEN1_TOTAL_H - QR_ROW_H; // 532pt

async function pngToJpeg(dataUrl: string | null): Promise<string | null> {
	if (!dataUrl || typeof document === 'undefined') return dataUrl;
	return new Promise((resolve) => {
		const img = new Image();
		img.onload = () => {
			const canvas = document.createElement('canvas');
			canvas.width = 256;
			canvas.height = 256;
			const ctx = canvas.getContext('2d');
			if (!ctx) { resolve(dataUrl); return; }
			ctx.fillStyle = '#ffffff';
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

function spolSimbol(spol?: string): string {
	return spol === 'M' ? '♂' : spol === 'Ž' ? '♀' : '?';
}

function prstenStr(p: Ptica): string {
	if (p.prstena_oznaka && p.prsten_redni_broj != null) return `${p.prstena_oznaka}-${p.prsten_redni_broj}`;
	if (p.prstena_oznaka) return p.prstena_oznaka;
	if (p.prsten_redni_broj != null) return `#${p.prsten_redni_broj}`;
	return '';
}

function genLabel(genLevel: number, spol?: string): string {
	const isMale = spol === 'M';
	if (genLevel === 1) return '';
	if (genLevel === 2) return isMale ? 'OTAC' : 'MAJKA';
	if (genLevel === 3) return isMale ? 'DJED' : 'BAKA';
	return isMale ? 'PRADJED' : 'PRABAKA';
}

function fillColor(genLevel: number, spol?: string): string {
	if (genLevel === 1) return '#EEF2FF';
	if (genLevel === 2) return spol === 'M' ? '#E8F0FE' : '#FCE8F3';
	if (genLevel === 3) return spol === 'M' ? '#F3F6FE' : '#FEF3F9';
	return '#FAFAFA';
}

function buildBirdStack(node: RodovnikNode, genLevel: number): object[] {
	const p = node.ptica;
	const fs = genLevel === 1 ? 10 : genLevel === 2 ? 9 : genLevel === 3 ? 7.5 : 7;
	const naam = p.naziv || prstenStr(p) || p.id.slice(0, 8);
	const prsten = prstenStr(p);
	const label = genLabel(genLevel, p.spol);
	const stack: object[] = [];

	if (label) stack.push({ text: label, fontSize: 6, color: '#999', bold: true, margin: [0, 0, 0, 2] });

	if (node.slika && genLevel <= 2) {
		const imgW = genLevel === 1 ? 118 : 88;
		stack.push({ image: node.slika, width: imgW, alignment: 'center', margin: [0, 0, 0, 4] });
	}

	stack.push({ text: naam, fontSize: fs + 1, bold: true, margin: [0, 0, 0, 1] });

	if (p.naziv && prsten) stack.push({ text: prsten, fontSize: fs, color: '#555' });

	stack.push({ text: `${spolSimbol(p.spol)}  ${node.vrstaLabel}`, fontSize: fs, color: '#444' });

	if (p.boja && genLevel <= 3) stack.push({ text: p.boja, fontSize: fs - 0.5, color: '#666' });
	if (p.status_ptica && genLevel <= 2) stack.push({ text: `[${p.status_ptica}]`, fontSize: fs - 1, color: '#888', italics: true });
	if (p.rezultati && genLevel <= 2) stack.push({ text: p.rezultati, fontSize: 7, color: '#666', margin: [0, 2, 0, 0] });
	if (p.napomena_rodovnik && genLevel === 1) stack.push({ text: p.napomena_rodovnik, fontSize: 7.5, color: '#777', italics: true, margin: [0, 3, 0, 0] });

	return stack;
}

function makeCell(node: RodovnikNode | null, rowSpan: number, genLevel: number, qrCode?: string): object {
	if (!node) {
		return {
			rowSpan,
			stack: [{ text: '—', fontSize: 6, color: '#ccc', alignment: 'center' }],
			fillColor: '#F8F8F8',
			margin: [2, 2, 2, 2]
		};
	}

	const birdStack = buildBirdStack(node, genLevel);

	// Gen1: nested table — bird info na vrhu, QR na apsolutnom dnu
	if (genLevel === 1 && qrCode) {
		const qrSection = {
			columns: [
				{
					table: {
						body: [[{ image: qrCode, width: 52, margin: [3, 3, 3, 3] }]],
						widths: [58]
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
						{ text: 'SKENIRAJ', fontSize: 8, bold: true, color: '#333', letterSpacing: 0.5 },
						{ text: 'QR KOD', fontSize: 8, bold: true, color: '#333', letterSpacing: 0.5 },
						{ text: 'za više', fontSize: 7.5, color: '#555' },
						{ text: 'informacija', fontSize: 7.5, color: '#555' }
					],
					margin: [6, 6, 0, 0]
				}
			]
		};

		return {
			rowSpan: 8,
			fillColor: fillColor(1),
			margin: [0, 0, 0, 0],
			stack: [
				{
					table: {
						widths: ['*'],
						heights: [INFO_ROW_H, QR_ROW_H],
						body: [
							[{ stack: birdStack, margin: [4, 4, 4, 4] }],
							[{ ...qrSection, margin: [4, 4, 4, 4] }]
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
				}
			]
		};
	}

	// Gen 2, 3, 4 — standardne kućice
	return {
		stack: birdStack,
		rowSpan,
		fillColor: fillColor(genLevel, node.ptica.spol),
		margin: [3, 3, 3, 3]
	};
}

export async function generirajRodovnikPDF(pticaId: string): Promise<void> {
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

	const info = get(postavke);

	const [logoBase64, appLogoRaw, qrBase64] = await Promise.all([
		info?.slika_url ? urlToBase64(info.slika_url) : Promise.resolve(null),
		urlToBase64('/app-logo.png'),
		QRCode.toDataURL(
			typeof window !== 'undefined' ? `${window.location.origin}/ptica/${pticaId}` : pticaId,
			{ width: 150, margin: 1, errorCorrectionLevel: 'M' }
		) as Promise<string>
	]);
	const appLogoBase64 = await pngToJpeg(appLogoRaw);

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

	const WIDTHS = [140, 128, 112, '*'];

	const tableBody = [
		[makeCell(tree, 8, 1, qrBase64), makeCell(g2_otac, 4, 2), makeCell(g3[0], 2, 3), makeCell(g4[0], 1, 4)],
		[{}, {}, {}, makeCell(g4[1], 1, 4)],
		[{}, {}, makeCell(g3[1], 2, 3), makeCell(g4[2], 1, 4)],
		[{}, {}, {}, makeCell(g4[3], 1, 4)],
		[{}, makeCell(g2_majka, 4, 2), makeCell(g3[2], 2, 3), makeCell(g4[4], 1, 4)],
		[{}, {}, {}, makeCell(g4[5], 1, 4)],
		[{}, {}, makeCell(g3[3], 2, 3), makeCell(g4[6], 1, 4)],
		[{}, {}, {}, makeCell(g4[7], 1, 4)]
	];

	const infoStack: object[] = [
		{ text: info?.naziv_uzgajivacnice || 'Uzgajivacnica', fontSize: 17, bold: true, color: '#222' },
		...(info?.ime_prezime ? [{ text: info.ime_prezime, fontSize: 11, color: '#555', margin: [0, 2, 0, 0] }] : []),
		...(info?.adresa ? [{ text: info.adresa, fontSize: 10, color: '#777' }] : []),
		...(info?.telefon ? [{ text: `Tel: ${info.telefon}`, fontSize: 10, color: '#777' }] : [])
	];

	const datumStr = new Date().toLocaleDateString('hr-BA', { day: '2-digit', month: '2-digit', year: 'numeric' });
	const fileName = `Rodovnik_${(tree.ptica.naziv || prstenStr(tree.ptica) || pticaId.slice(0, 8)).replace(/[^a-zA-Z0-9_\-]/g, '_')}_${new Date().getFullYear()}.pdf`;

	const docDefinition = {
		pageSize: 'A4',
		pageOrientation: 'portrait',
		pageMargins: [20, 20, 20, 20],

		content: [
			// Header: bordered uzgajivačnica box + app logo desno
			{
				columns: [
					...(logoBase64 ? [{ image: logoBase64, fit: [90, 90] }] : []),
					{ stack: infoStack, width: '*' },
					...(appLogoBase64 ? [{ image: appLogoBase64, width: 64, height: 64 }] : [])
				],
				columnGap: 24,
				margin: [0, 0, 0, 8]
			},

			// Tabela rodovnika
			{
				table: {
					widths: WIDTHS,
					heights: Array(8).fill(ROW_H),
					body: tableBody
				},
				layout: {
					hLineWidth: () => 4,
					vLineWidth: () => 4,
					hLineColor: () => '#ffffff',
					vLineColor: () => '#ffffff',
					paddingLeft: () => 0,
					paddingRight: () => 0,
					paddingTop: () => 0,
					paddingBottom: () => 0
				}
			},

			// Potpis — datum lijevo, linija za potpis desno
			{
				columns: [
					{ text: `Datum: ${datumStr}`, fontSize: 8.5, color: '#555', width: '*' },
					{
						stack: [
							{ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 230, y2: 0, lineWidth: 1, lineColor: '#444' }] },
							{ text: 'Potpis uzgajivača', fontSize: 8, color: '#888', alignment: 'center', margin: [0, 3, 0, 0] }
						],
						width: 'auto'
					}
				],
				margin: [0, 30, 0, 0]
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
