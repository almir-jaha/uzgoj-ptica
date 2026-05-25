import { supabase } from '$lib/supabase/client';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function urlBase64ToUint8Array(base64: string): ArrayBuffer {
	const padding = '='.repeat((4 - (base64.length % 4)) % 4);
	const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
	const raw = atob(b64);
	const bytes = new Uint8Array(raw.length);
	for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
	return bytes.buffer as ArrayBuffer;
}

export type NotifStatus = 'unsupported' | 'denied' | 'granted' | 'default';

export function getPermissionStatus(): NotifStatus {
	if (typeof window === 'undefined') return 'unsupported';
	if (!('Notification' in window) || !('serviceWorker' in navigator)) return 'unsupported';
	return Notification.permission as NotifStatus;
}

export async function isPushSubscribed(): Promise<boolean> {
	if (!('serviceWorker' in navigator)) return false;
	try {
		const sw = await navigator.serviceWorker.ready;
		return (await sw.pushManager.getSubscription()) !== null;
	} catch {
		return false;
	}
}

export async function subscribePush(userId: string): Promise<{ ok: boolean; error?: string }> {
	if (!VAPID_PUBLIC_KEY) return { ok: false, error: 'VITE_VAPID_PUBLIC_KEY nije postavljen u .env' };

	try {
		const permission = await Notification.requestPermission();
		if (permission !== 'granted') return { ok: false, error: 'permission_denied' };

		const sw = await navigator.serviceWorker.ready;
		const sub = await sw.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
		});

		const json = sub.toJSON();
		if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth)
			return { ok: false, error: 'Subscription nema ključeve' };

		const { error } = await supabase.from('push_subscriptions').insert(
			{ user_id: userId, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth }
		);
		// 23505 = unique violation — subscription već postoji, to je OK
		if (error && error.code !== '23505') return { ok: false, error: error.message };

		return { ok: true };
	} catch (err) {
		return { ok: false, error: err instanceof Error ? err.message : 'Nepoznata greška' };
	}
}

export async function unsubscribePush(userId: string): Promise<void> {
	if (!('serviceWorker' in navigator)) return;
	try {
		const sw = await navigator.serviceWorker.ready;
		const sub = await sw.pushManager.getSubscription();
		if (!sub) return;
		await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint).eq('user_id', userId);
		await sub.unsubscribe();
	} catch (err) {
		console.error('Unsubscribe failed:', err);
	}
}

// Ako browser ima subscription ali DB nema — upiši je (npr. po reinstalaciji, promjeni adaptera)
export async function syncSubscription(userId: string): Promise<void> {
	if (!('serviceWorker' in navigator)) return;
	try {
		const sw = await navigator.serviceWorker.ready;
		const sub = await sw.pushManager.getSubscription();
		if (!sub) return;
		const json = sub.toJSON();
		if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;
		const { error: syncErr } = await supabase.from('push_subscriptions').insert(
			{ user_id: userId, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth }
		);
		if (syncErr && syncErr.code !== '23505') console.warn('syncSubscription:', syncErr.message);
	} catch {
		// tiho — ne blokiraj UI
	}
}

export function hasDismissedBanner(): boolean {
	return localStorage.getItem('notif_banner_dismissed') === '1';
}

export function dismissBanner(): void {
	localStorage.setItem('notif_banner_dismissed', '1');
}
