import { get } from 'svelte/store';
import { aktivnaUzgajivacnica } from '$lib/stores/uzgajivacnica';
import type { RodovnikLang } from './rodovnik-i18n';
import { rodovnikI18n, type RodovnikLabels } from './rodovnik-i18n';
import {
	type RodovnikNode,
	pngToJpeg, urlToBase64, buildTree,
	prstenStr, safeName, spolBoja, genLabel, fillColorForGen,
	loadPdfMake, buildQrUrl, buildDatumStr
} from './rodovnik-shared';
import { buildScoreStr } from './genetika-schema';

const ROW_H = 63;
const LINE_W = 2;
const GEN1_TOTAL_H = 8 * ROW_H;
const QR_ROW_H = 63;
const INFO_ROW_H = GEN1_TOTAL_H - QR_ROW_H;
const CELL_BG = '#EEF2FF';

function buildBirdCard(node: RodovnikNode, genLevel: number, labels: RodovnikLabels): object[] {
	const p = node.ptica;
	const fs = genLevel === 1 ? 10 : genLevel === 2 ? 9 : genLevel === 3 ? 7.5 : 7;
	const naam = p.naziv || prstenStr(p) || p.id.slice(0, 8);
	const prsten = prstenStr(p);
	const spolColor = spolBoja(p.spol);
	const stack: object[] = [];

	const spolStr = p.spol === 'M' ? labels.spolM : p.spol === 'Ž' ? labels.spolZ : '';
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

	// Mutacija: preferira genetika.vizuelna_mutacija, fallback na boja
	const mutacija = (p.genetika?.vizuelna_mutacija as string) || p.boja;
	if (mutacija && genLevel <= 3) {
		stack.push({ text: mutacija, fontSize: fs - 0.5, color: '#5c6bc0', margin: [0, 0, 0, 1] });
	}

	// Skrivena mutacija (split)
	const skrivena = p.genetika?.skrivena_mutacija;
	if (skrivena && genLevel <= 2) {
		const str = Array.isArray(skrivena) ? skrivena.join(' / ') : String(skrivena);
		if (str) stack.push({ text: `/ ${str}`, fontSize: fs - 1.5, color: '#888', italics: true, margin: [0, 0, 0, 1] });
	}

	if (p.rezultati && genLevel <= 2) {
		stack.push({ text: p.rezultati, fontSize: fs - 1, color: '#555', italics: true, margin: [0, 0, 0, 1] });
	}

	// Ocjene kvaliteta
	const scoreStr = buildScoreStr(p.genetika);
	if (scoreStr && genLevel <= 3) {
		stack.push({ text: scoreStr, fontSize: 6.5, color: '#888', margin: [0, 1, 0, 0] });
	}

	if (p.napomena_rodovnik && genLevel === 1) {
		stack.push({ text: p.napomena_rodovnik, fontSize: 7.5, color: '#777', italics: true, margin: [0, 2, 0, 0] });
	}

	return stack;
}

function makeCell(node: RodovnikNode | null, rowSpan: number, genLevel: number, labels: RodovnikLabels): object {
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
	const fc = genLevel === 1 ? CELL_BG
		: genLevel === 2 ? (node.ptica.spol === 'M' ? '#F0F6FF' : '#FFF0F6')
		: '#ffffff';

	return {
		rowSpan,
		stack: buildBirdCard(node, genLevel, labels),
		fillColor: fc,
		margin: [4, 4, 4, 4]
	};
}

export async function generirajLandscapeRodovnikPDF(pticaId: string, lang: RodovnikLang = 'bs'): Promise<void> {
	const labels = rodovnikI18n[lang];
	const { pdfMake, QRCode } = await loadPdfMake();

	const tree = await buildTree(pticaId, 1);
	if (!tree) throw new Error('Ptica nije pronađena');

	const info = get(aktivnaUzgajivacnica);

	const [logoBase64, appLogoRaw, qrBase64] = await Promise.all([
		info?.slika_url ? urlToBase64(info.slika_url) : Promise.resolve(null),
		urlToBase64('/app-logo.png'),
		QRCode.toDataURL(buildQrUrl(info, pticaId), { width: 140, margin: 1, errorCorrectionLevel: 'M' }) as Promise<string>
	]);
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

	const infoStack: object[] = [];
	if (logoBase64) infoStack.push({ image: logoBase64, fit: [115, 115], margin: [0, 0, 0, 4] });
	infoStack.push({ text: info?.naziv || 'Uzgajivacnica', fontSize: 10.5, bold: true, color: '#222', margin: [0, 0, 0, 1] });
	if (info?.opis) infoStack.push({ text: info.opis, fontSize: 8, color: '#5c6bc0', italics: true, margin: [0, 0, 0, 1] });
	if (info?.ime_prezime) infoStack.push({ text: info.ime_prezime, fontSize: 8.5, color: '#555' });
	if (info?.adresa) infoStack.push({ text: info.adresa, fontSize: 8, color: '#777' });
	if (info?.telefon) infoStack.push({ text: `Tel: ${info.telefon}`, fontSize: 8, color: '#777' });

	const appLogoCell = appLogoBase64 ? {
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
	} : null;

	const datumStr = buildDatumStr();

	const birdContent: object[] = [
		{
			columns: [
				{ stack: infoStack, width: '*' },
				...(appLogoCell ? [appLogoCell] : [])
			],
			margin: [0, 0, 0, 6]
		},
		{ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 165, y2: 0, lineWidth: 0.5, lineColor: '#aaaaaa' }], margin: [0, 0, 0, 6] },
		...buildBirdCard(tree, 1, labels)
	];

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
					{ text: labels.skeniraj, fontSize: 7.5, bold: true, color: '#333' },
					{ text: labels.qrKod, fontSize: 7.5, bold: true, color: '#333' },
					{ text: labels.zaVise, fontSize: 7, color: '#555' },
					{ text: labels.informacija, fontSize: 7, color: '#555' },
					{ text: `${labels.datum}: ${datumStr}`, fontSize: 6.5, color: '#888', margin: [0, 4, 0, 0] }
				],
				margin: [6, 4, 0, 0]
			}
		]
	};

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
		[gen1Cell, makeCell(g2_otac, 4, 2, labels), makeCell(g3[0], 2, 3, labels), makeCell(g4[0], 1, 4, labels)],
		[{}, {}, {}, makeCell(g4[1], 1, 4, labels)],
		[{}, {}, makeCell(g3[1], 2, 3, labels), makeCell(g4[2], 1, 4, labels)],
		[{}, {}, {}, makeCell(g4[3], 1, 4, labels)],
		[{}, makeCell(g2_majka, 4, 2, labels), makeCell(g3[2], 2, 3, labels), makeCell(g4[4], 1, 4, labels)],
		[{}, {}, {}, makeCell(g4[5], 1, 4, labels)],
		[{}, {}, makeCell(g3[3], 2, 3, labels), makeCell(g4[6], 1, 4, labels)],
		[{}, {}, {}, makeCell(g4[7], 1, 4, labels)]
	];

	const fileName = `Rodovnik_L_${safeName(tree.ptica)}_${new Date().getFullYear()}.pdf`;

	const docDefinition = {
		pageSize: 'A4',
		pageOrientation: 'landscape',
		pageMargins: [20, 20, 20, 20],
		content: [{
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
		}],
		defaultStyle: { font: 'Roboto', fontSize: 8 }
	};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(pdfMake as any).createPdf(docDefinition).download(fileName);
}
