import type { Ptica } from '$lib/db/schema';
import { db } from '$lib/db/dexie';
import type { RodovnikLabels } from './rodovnik-i18n';

export interface RodovnikNode {
	ptica: Ptica;
	vrstaLabel: string;
	slika: string | null;
	otac: RodovnikNode | null;
	majka: RodovnikNode | null;
}

export async function pngToJpeg(dataUrl: string | null, bgColor = '#ffffff'): Promise<string | null> {
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

export async function urlToBase64(url: string): Promise<string | null> {
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

export async function buildTree(pticaId: string | undefined, genLevel: number, maxGen = 4): Promise<RodovnikNode | null> {
	if (!pticaId || genLevel > maxGen) return null;
	const ptica = await db.ptice.get(pticaId);
	if (!ptica) return null;
	const vrsta = await db.vrsta_ptica.get(ptica.vrsta_ptica_id);
	let slika: string | null = null;
	if (genLevel <= 2 && ptica.slika_url) slika = await urlToBase64(ptica.slika_url);
	const [otac, majka] = await Promise.all([
		buildTree(ptica.otac_id, genLevel + 1, maxGen),
		buildTree(ptica.majka_id, genLevel + 1, maxGen)
	]);
	return { ptica, vrstaLabel: vrsta?.naziv ?? '—', slika, otac, majka };
}

export function prstenStr(p: Ptica): string {
	if (p.prstena_oznaka && p.prsten_redni_broj != null) return `${p.prstena_oznaka}-${p.prsten_redni_broj}`;
	if (p.prstena_oznaka) return p.prstena_oznaka;
	if (p.prsten_redni_broj != null) return `#${p.prsten_redni_broj}`;
	return '';
}

export function safeName(p: Ptica): string {
	return (p.naziv || prstenStr(p) || p.id.slice(0, 8)).replace(/[^a-zA-Z0-9_\-]/g, '_');
}

export function spolBoja(spol?: string): string {
	return spol === 'M' ? '#1565c0' : spol === 'Ž' ? '#c2185b' : '#444';
}

export function genLabel(genLevel: number, spol: string | undefined, labels: RodovnikLabels): string {
	const isMale = spol === 'M';
	if (genLevel === 1) return '';
	if (genLevel === 2) return isMale ? labels.otac : labels.majka;
	if (genLevel === 3) return isMale ? labels.djed : labels.baka;
	return isMale ? labels.pradjed : labels.prabaka;
}

export function fillColorForGen(genLevel: number, spol?: string): string {
	if (genLevel === 1) return '#EEF2FF';
	if (genLevel === 2) return spol === 'M' ? '#E8F0FE' : '#FCE8F3';
	if (genLevel === 3) return spol === 'M' ? '#F3F6FE' : '#FEF3F9';
	return '#FAFAFA';
}

export async function loadPdfMake() {
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
	return { pdfMake, QRCode };
}

export function buildQrUrl(info: { app_url?: string | null } | null, pticaId: string): string {
	return `${info?.app_url?.trim() || (typeof window !== 'undefined' ? window.location.origin : '')}/ptica/${pticaId}`;
}

export function buildDatumStr(): string {
	return new Date().toLocaleDateString('hr-BA', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
