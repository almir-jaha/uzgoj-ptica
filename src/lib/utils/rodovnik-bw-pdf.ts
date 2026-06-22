import { get } from 'svelte/store';
import { aktivnaUzgajivacnica } from '$lib/stores/uzgajivacnica';
import type { RodovnikLang } from './rodovnik-i18n';
import { rodovnikI18n, type RodovnikLabels } from './rodovnik-i18n';
import {
	type RodovnikNode,
	urlToBase64, buildTree,
	prstenStr, safeName, genLabel,
	loadPdfMake, buildQrUrl, buildDatumStr
} from './rodovnik-shared';

const ROW_H = 63;
// Landscape A4 content width: 842-40=802pt
const WIDTHS = [195, 178, 158, '*'];
const CELL_BG = '#f5f5f5';
const LINE_COLOR = '#888888';

function buildBirdStack(node: RodovnikNode, genLevel: number, labels: RodovnikLabels): object[] {
	const p = node.ptica;
	const fs = genLevel === 1 ? 9.5 : genLevel === 2 ? 8.5 : genLevel === 3 ? 7.5 : 7;
	const naam = p.naziv || prstenStr(p) || p.id.slice(0, 8);
	const prsten = prstenStr(p);
	const label = genLabel(genLevel, p.spol, labels);
	const stack: object[] = [];

	if (label) stack.push({ text: label, fontSize: 6, color: '#888', bold: true, margin: [0, 0, 0, 2] });

	// Prsten broj prominentan
	const spolOznaka = p.spol === 'M' ? labels.spolM : p.spol === 'Ž' ? labels.spolZ : '';

	if (prsten) {
		stack.push({
			columns: [
				{ text: prsten, fontSize: fs + 1, bold: true, color: '#111' },
				...(spolOznaka ? [{ text: spolOznaka, fontSize: fs + 1, bold: true, color: '#333', alignment: 'right', width: 'auto' }] : [])
			],
			margin: [0, 0, 0, 1]
		});
		if (p.naziv) stack.push({ text: p.naziv, fontSize: fs, color: '#333', bold: true });
	} else {
		stack.push({
			columns: [
				{ text: naam, fontSize: fs + 1, bold: true, color: '#111' },
				...(spolOznaka ? [{ text: spolOznaka, fontSize: fs + 1, bold: true, color: '#333', alignment: 'right', width: 'auto' }] : [])
			],
			margin: [0, 0, 0, 1]
		});
	}

	stack.push({ text: node.vrstaLabel, fontSize: fs - 1, color: '#555' });
	if (p.boja && genLevel <= 3) stack.push({ text: p.boja, fontSize: fs - 1, color: '#444' });
	if (p.rezultati && genLevel <= 2) stack.push({ text: p.rezultati, fontSize: 7, color: '#555', italics: true, margin: [0, 2, 0, 0] });
	if (p.napomena_rodovnik && genLevel === 1) stack.push({ text: p.napomena_rodovnik, fontSize: 7, color: '#666', italics: true, margin: [0, 2, 0, 0] });

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
			fillColor: '#fafafa',
			margin: [2, 2, 2, 2]
		};
	}
	const fc = genLevel === 1 ? CELL_BG : '#ffffff';
	return {
		rowSpan,
		stack: buildBirdStack(node, genLevel, labels),
		fillColor: fc,
		margin: [4, 4, 4, 4]
	};
}

export async function generirajBwRodovnikPDF(pticaId: string, lang: RodovnikLang = 'bs'): Promise<void> {
	const labels = rodovnikI18n[lang];
	const { pdfMake, QRCode } = await loadPdfMake();

	const tree = await buildTree(pticaId, 1);
	if (!tree) throw new Error('Ptica nije pronađena');

	const info = get(aktivnaUzgajivacnica);

	const [logoBase64, qrBase64] = await Promise.all([
		info?.slika_url ? urlToBase64(info.slika_url) : Promise.resolve(null),
		QRCode.toDataURL(buildQrUrl(info, pticaId), { width: 140, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#000', light: '#fff' } }) as Promise<string>
	]);

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

	const datumStr = buildDatumStr();
	const GEN1_TOTAL_H = 8 * ROW_H;
	const QR_H = 60;
	const INFO_H = GEN1_TOTAL_H - QR_H;

	const birdContent: object[] = [
		// Uzgajivačnica info
		...(logoBase64 ? [{ image: logoBase64, fit: [80, 80], margin: [0, 0, 0, 4] }] : []),
		{ text: info?.naziv || '', fontSize: 10, bold: true, color: '#111', margin: [0, 0, 0, 1] },
		...(info?.ime_prezime ? [{ text: info.ime_prezime, fontSize: 8, color: '#444' }] : []),
		...(info?.adresa ? [{ text: info.adresa, fontSize: 7.5, color: '#555' }] : []),
		...(info?.telefon ? [{ text: info.telefon, fontSize: 7.5, color: '#555' }] : []),
		{ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 165, y2: 0, lineWidth: 0.8, lineColor: '#999' }], margin: [0, 5, 0, 5] },
		...buildBirdStack(tree, 1, labels)
	];

	const qrSection = {
		columns: [
			{
				table: {
					body: [[{ image: qrBase64, width: 44, margin: [2, 2, 2, 2] }]],
					widths: [48]
				},
				layout: {
					hLineWidth: () => 1,
					vLineWidth: () => 1,
					hLineColor: () => '#555',
					vLineColor: () => '#555',
					paddingLeft: () => 0,
					paddingRight: () => 0,
					paddingTop: () => 0,
					paddingBottom: () => 0
				},
				width: 'auto'
			},
			{
				stack: [
					{ text: labels.skeniraj, fontSize: 7, bold: true, color: '#333' },
					{ text: labels.qrKod, fontSize: 7, bold: true, color: '#333' },
					{ text: `${labels.datum}: ${datumStr}`, fontSize: 6.5, color: '#666', margin: [0, 3, 0, 0] }
				],
				margin: [5, 4, 0, 0]
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
				heights: [INFO_H, QR_H],
				body: [
					[{ stack: birdContent, margin: [5, 5, 5, 4] }],
					[{ ...qrSection, margin: [5, 4, 5, 4] }]
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

	const fileName = `Rodovnik_BW_${safeName(tree.ptica)}_${new Date().getFullYear()}.pdf`;

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
					hLineWidth: () => 1,
					vLineWidth: () => 1,
					hLineColor: () => LINE_COLOR,
					vLineColor: () => LINE_COLOR,
					paddingLeft: () => 0,
					paddingRight: () => 0,
					paddingTop: () => 0,
					paddingBottom: () => 0
				}
			},
			{
				columns: [
					{ text: `${labels.datum}: ${datumStr}`, fontSize: 8, color: '#555', width: '*' },
					{
						stack: [
							{ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 230, y2: 0, lineWidth: 0.8, lineColor: '#333' }] },
							{ text: labels.potpisUzgajivaca, fontSize: 7.5, color: '#888', alignment: 'center', margin: [0, 3, 0, 0] }
						],
						width: 'auto'
					}
				],
				margin: [0, 16, 0, 0]
			}
		],
		defaultStyle: { font: 'Roboto', fontSize: 8 }
	};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(pdfMake as any).createPdf(docDefinition).download(fileName);
}
