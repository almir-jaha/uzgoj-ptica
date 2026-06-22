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

const ROW_H = 108; // 4 rows × 108pt = 432pt, fits A5 content height ~545pt
const WIDTHS = [110, 95, '*']; // 3 generacije

function buildBirdStack(node: RodovnikNode, genLevel: number, labels: RodovnikLabels): object[] {
	const p = node.ptica;
	const fs = genLevel === 1 ? 9.5 : genLevel === 2 ? 8.5 : 7.5;
	const naam = p.naziv || prstenStr(p) || p.id.slice(0, 8);
	const prsten = prstenStr(p);
	const label = genLabel(genLevel, p.spol, labels);
	const stack: object[] = [];

	if (label) stack.push({ text: label, fontSize: 5.5, color: '#999', bold: true, margin: [0, 0, 0, 2] });

	const spolOznaka = p.spol === 'M' ? labels.spolM : p.spol === 'Ž' ? labels.spolZ : '';
	stack.push({
		columns: [
			{ text: naam, fontSize: fs, bold: true, color: '#111' },
			...(spolOznaka ? [{
				text: spolOznaka,
				fontSize: fs,
				bold: true,
				color: spolBoja(p.spol),
				alignment: 'right',
				width: 'auto'
			}] : [])
		],
		margin: [0, 0, 0, 1]
	});

	if (p.naziv && prsten) stack.push({ text: prsten, fontSize: fs - 1, color: '#555' });
	stack.push({ text: node.vrstaLabel, fontSize: fs - 1, color: '#555' });
	if (p.boja && genLevel <= 2) stack.push({ text: p.boja, fontSize: fs - 1.5, color: '#666' });
	if (p.rezultati && genLevel === 1) stack.push({ text: p.rezultati, fontSize: 7, color: '#555', italics: true, margin: [0, 2, 0, 0] });
	if (p.napomena_rodovnik && genLevel === 1) stack.push({ text: p.napomena_rodovnik, fontSize: 7, color: '#777', italics: true, margin: [0, 2, 0, 0] });

	return stack;
}

function makeCell(node: RodovnikNode | null, rowSpan: number, genLevel: number, labels: RodovnikLabels): object {
	if (!node) {
		return {
			rowSpan,
			stack: [{ text: '—', fontSize: 6, color: '#ccc', alignment: 'center' }],
			fillColor: '#F8F8F8',
			margin: [2, 2, 2, 2]
		};
	}
	return {
		stack: buildBirdStack(node, genLevel, labels),
		rowSpan,
		fillColor: fillColorForGen(genLevel, node.ptica.spol),
		margin: [3, 3, 3, 3]
	};
}

function makeGen1Cell(node: RodovnikNode, labels: RodovnikLabels, qrCode: string): object {
	const birdStack = buildBirdStack(node, 1, labels);
	const QR_H = 68;
	const INFO_H = 4 * ROW_H - QR_H;

	const qrSection = {
		columns: [
			{
				table: {
					body: [[{ image: qrCode, width: 44, margin: [2, 2, 2, 2] }]],
					widths: [48]
				},
				layout: {
					hLineWidth: () => 1.5,
					vLineWidth: () => 1.5,
					hLineColor: () => '#333',
					vLineColor: () => '#333',
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
					{ text: labels.zaVise, fontSize: 6.5, color: '#555' }
				],
				margin: [5, 5, 0, 0]
			}
		]
	};

	return {
		rowSpan: 4,
		fillColor: fillColorForGen(1),
		margin: [0, 0, 0, 0],
		stack: [{
			table: {
				widths: ['*'],
				heights: [INFO_H, QR_H],
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
		}]
	};
}

export async function generirajA5RodovnikPDF(pticaId: string, lang: RodovnikLang = 'bs'): Promise<void> {
	const labels = rodovnikI18n[lang];
	const { pdfMake, QRCode } = await loadPdfMake();

	// maxGen = 3 — pradjed/prabaka se ne učitavaju
	const tree = await buildTree(pticaId, 1, 3);
	if (!tree) throw new Error('Ptica nije pronađena');

	const info = get(aktivnaUzgajivacnica);

	const [logoBase64, appLogoRaw, qrBase64] = await Promise.all([
		info?.slika_url ? urlToBase64(info.slika_url) : Promise.resolve(null),
		urlToBase64('/app-logo.png'),
		QRCode.toDataURL(buildQrUrl(info, pticaId), { width: 120, margin: 1, errorCorrectionLevel: 'M' }) as Promise<string>
	]);
	const appLogoBase64 = await pngToJpeg(appLogoRaw);

	const g2_otac = tree.otac;
	const g2_majka = tree.majka;
	const g3 = [
		g2_otac?.otac ?? null, g2_otac?.majka ?? null,
		g2_majka?.otac ?? null, g2_majka?.majka ?? null
	];

	const tableBody = [
		[makeGen1Cell(tree, labels, qrBase64), makeCell(g2_otac, 2, 2, labels), makeCell(g3[0], 1, 3, labels)],
		[{}, {}, makeCell(g3[1], 1, 3, labels)],
		[{}, makeCell(g2_majka, 2, 2, labels), makeCell(g3[2], 1, 3, labels)],
		[{}, {}, makeCell(g3[3], 1, 3, labels)]
	];

	const infoStack: object[] = [
		{ text: info?.naziv || 'Uzgajivacnica', fontSize: 12, bold: true, color: '#222' },
		...(info?.ime_prezime ? [{ text: info.ime_prezime, fontSize: 9, color: '#555' }] : []),
		...(info?.telefon ? [{ text: info.telefon, fontSize: 8.5, color: '#777' }] : [])
	];

	const datumStr = buildDatumStr();
	const fileName = `Rodovnik_A5_${safeName(tree.ptica)}_${new Date().getFullYear()}.pdf`;

	const docDefinition = {
		pageSize: 'A5',
		pageOrientation: 'portrait',
		pageMargins: [15, 15, 15, 15],
		content: [
			{
				columns: [
					...(logoBase64 ? [{ image: logoBase64, fit: [60, 60] }] : []),
					{ stack: infoStack, width: '*' },
					...(appLogoBase64 ? [{ image: appLogoBase64, width: 44, height: 44 }] : [])
				],
				columnGap: 12,
				margin: [0, 0, 0, 6]
			},
			{
				table: {
					widths: WIDTHS,
					heights: Array(4).fill(ROW_H),
					body: tableBody
				},
				layout: {
					hLineWidth: () => 3,
					vLineWidth: () => 3,
					hLineColor: () => '#ffffff',
					vLineColor: () => '#ffffff',
					paddingLeft: () => 0,
					paddingRight: () => 0,
					paddingTop: () => 0,
					paddingBottom: () => 0
				}
			},
			{
				columns: [
					{ text: `${labels.datum}: ${datumStr}`, fontSize: 7.5, color: '#555', width: '*' },
					{
						stack: [
							{ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 160, y2: 0, lineWidth: 0.8, lineColor: '#444' }] },
							{ text: labels.potpisUzgajivaca, fontSize: 7, color: '#888', alignment: 'center', margin: [0, 2, 0, 0] }
						],
						width: 'auto'
					}
				],
				margin: [0, 20, 0, 0]
			}
		],
		defaultStyle: { font: 'Roboto', fontSize: 8 }
	};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(pdfMake as any).createPdf(docDefinition).download(fileName);
}
