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

const ROW_H = 76;
const GEN1_TOTAL_H = 8 * ROW_H;
const QR_ROW_H = 76;
const INFO_ROW_H = GEN1_TOTAL_H - QR_ROW_H;

function buildBirdStack(node: RodovnikNode, genLevel: number, labels: RodovnikLabels): object[] {
	const p = node.ptica;
	const fs = genLevel === 1 ? 10 : genLevel === 2 ? 9 : genLevel === 3 ? 7.5 : 7;
	const naam = p.naziv || prstenStr(p) || p.id.slice(0, 8);
	const prsten = prstenStr(p);
	const label = genLabel(genLevel, p.spol, labels);
	const stack: object[] = [];

	if (label) stack.push({ text: label, fontSize: 6, color: '#999', bold: true, margin: [0, 0, 0, 2] });

	if (node.slika && genLevel <= 2) {
		const imgW = genLevel === 1 ? 118 : 88;
		stack.push({ image: node.slika, width: imgW, alignment: 'center', margin: [0, 0, 0, 4] });
	}

	const spolOznaka = p.spol === 'M' ? labels.spolM : p.spol === 'Ž' ? labels.spolZ : '';
	stack.push({
		columns: [
			{ text: naam, fontSize: fs + 1, bold: true, color: '#111' },
			...(spolOznaka ? [{
				text: spolOznaka,
				fontSize: fs + 1,
				bold: true,
				color: spolBoja(p.spol),
				alignment: 'right',
				width: 'auto'
			}] : [])
		],
		margin: [0, 0, 0, 1]
	});

	if (p.naziv && prsten) stack.push({ text: prsten, fontSize: fs, color: '#555' });
	stack.push({ text: node.vrstaLabel, fontSize: fs, color: '#444' });
	if (p.boja && genLevel <= 3) stack.push({ text: p.boja, fontSize: fs - 0.5, color: '#666' });
	if (p.status_ptica && genLevel <= 2) stack.push({ text: `[${p.status_ptica}]`, fontSize: fs - 1, color: '#888', italics: true });
	if (p.rezultati && genLevel <= 2) stack.push({ text: p.rezultati, fontSize: 7, color: '#666', margin: [0, 2, 0, 0] });
	if (p.napomena_rodovnik && genLevel === 1) stack.push({ text: p.napomena_rodovnik, fontSize: 7.5, color: '#777', italics: true, margin: [0, 3, 0, 0] });

	return stack;
}

function makeCell(node: RodovnikNode | null, rowSpan: number, genLevel: number, labels: RodovnikLabels, qrCode?: string): object {
	if (!node) {
		return {
			rowSpan,
			stack: [{ text: '—', fontSize: 6, color: '#ccc', alignment: 'center' }],
			fillColor: '#F8F8F8',
			margin: [2, 2, 2, 2]
		};
	}

	const birdStack = buildBirdStack(node, genLevel, labels);

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
						{ text: labels.skeniraj, fontSize: 8, bold: true, color: '#333', letterSpacing: 0.5 },
						{ text: labels.qrKod, fontSize: 8, bold: true, color: '#333', letterSpacing: 0.5 },
						{ text: labels.zaVise, fontSize: 7.5, color: '#555' },
						{ text: labels.informacija, fontSize: 7.5, color: '#555' }
					],
					margin: [6, 6, 0, 0]
				}
			]
		};

		return {
			rowSpan: 8,
			fillColor: fillColorForGen(1),
			margin: [0, 0, 0, 0],
			stack: [{
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
			}]
		};
	}

	return {
		stack: birdStack,
		rowSpan,
		fillColor: fillColorForGen(genLevel, node.ptica.spol),
		margin: [3, 3, 3, 3]
	};
}

export async function generirajRodovnikPDF(pticaId: string, lang: RodovnikLang = 'bs'): Promise<void> {
	const labels = rodovnikI18n[lang];
	const { pdfMake, QRCode } = await loadPdfMake();

	const tree = await buildTree(pticaId, 1);
	if (!tree) throw new Error('Ptica nije pronađena');

	const info = get(aktivnaUzgajivacnica);

	const [logoBase64, appLogoRaw, qrBase64] = await Promise.all([
		info?.slika_url ? urlToBase64(info.slika_url) : Promise.resolve(null),
		urlToBase64('/app-logo.png'),
		QRCode.toDataURL(buildQrUrl(info, pticaId), { width: 150, margin: 1, errorCorrectionLevel: 'M' }) as Promise<string>
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
		[makeCell(tree, 8, 1, labels, qrBase64), makeCell(g2_otac, 4, 2, labels), makeCell(g3[0], 2, 3, labels), makeCell(g4[0], 1, 4, labels)],
		[{}, {}, {}, makeCell(g4[1], 1, 4, labels)],
		[{}, {}, makeCell(g3[1], 2, 3, labels), makeCell(g4[2], 1, 4, labels)],
		[{}, {}, {}, makeCell(g4[3], 1, 4, labels)],
		[{}, makeCell(g2_majka, 4, 2, labels), makeCell(g3[2], 2, 3, labels), makeCell(g4[4], 1, 4, labels)],
		[{}, {}, {}, makeCell(g4[5], 1, 4, labels)],
		[{}, {}, makeCell(g3[3], 2, 3, labels), makeCell(g4[6], 1, 4, labels)],
		[{}, {}, {}, makeCell(g4[7], 1, 4, labels)]
	];

	const infoStack: object[] = [
		{ text: info?.naziv || 'Uzgajivacnica', fontSize: 17, bold: true, color: '#222' },
		...(info?.opis ? [{ text: info.opis, fontSize: 10, color: '#5c6bc0', italics: true, margin: [0, 1, 0, 0] }] : []),
		...(info?.ime_prezime ? [{ text: info.ime_prezime, fontSize: 11, color: '#555', margin: [0, 2, 0, 0] }] : []),
		...(info?.adresa ? [{ text: info.adresa, fontSize: 10, color: '#777' }] : []),
		...(info?.telefon ? [{ text: `Tel: ${info.telefon}`, fontSize: 10, color: '#777' }] : [])
	];

	const fileName = `Rodovnik_${safeName(tree.ptica)}_${new Date().getFullYear()}.pdf`;
	const datumStr = buildDatumStr();

	const docDefinition = {
		pageSize: 'A4',
		pageOrientation: 'portrait',
		pageMargins: [20, 20, 20, 20],
		content: [
			{
				columns: [
					...(logoBase64 ? [{ image: logoBase64, fit: [90, 90] }] : []),
					{ stack: infoStack, width: '*' },
					...(appLogoBase64 ? [{ image: appLogoBase64, width: 64, height: 64 }] : [])
				],
				columnGap: 24,
				margin: [0, 0, 0, 8]
			},
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
			{
				columns: [
					{ text: `${labels.datum}: ${datumStr}`, fontSize: 8.5, color: '#555', width: '*' },
					{
						stack: [
							{ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 230, y2: 0, lineWidth: 1, lineColor: '#444' }] },
							{ text: labels.potpisUzgajivaca, fontSize: 8, color: '#888', alignment: 'center', margin: [0, 3, 0, 0] }
						],
						width: 'auto'
					}
				],
				margin: [0, 30, 0, 0]
			}
		],
		defaultStyle: { font: 'Roboto', fontSize: 8 }
	};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(pdfMake as any).createPdf(docDefinition).download(fileName);
}
