/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare const self: ServiceWorkerGlobalScope;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// Precache statičkih asseta — vite-plugin-pwa injektuje manifest ovdje
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Supabase API — NetworkFirst s 8s timeout-om
registerRoute(
	({ url }) => url.hostname.includes('.supabase.co'),
	new NetworkFirst({
		cacheName: 'supabase-api',
		networkTimeoutSeconds: 8,
		plugins: [
			new CacheableResponsePlugin({ statuses: [0, 200] }),
			new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 })
		]
	})
);

// Slike i fontovi — CacheFirst
registerRoute(
	({ request }) => request.destination === 'image' || request.destination === 'font',
	new CacheFirst({
		cacheName: 'static-assets',
		plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 })]
	})
);

// ─── Push notifikacija ───────────────────────────────────────────────────────

self.addEventListener('push', (event: PushEvent) => {
	const data = event.data?.json() ?? {};
	event.waitUntil(
		self.registration.showNotification(data.title ?? 'HatchPlan', {
			body: data.body ?? '',
			icon: '/icon.png',
			badge: '/icon.png',
			tag: data.tag ?? 'uzgoj-aktivnost',
			data: { url: data.url ?? '/aktivnosti' },
			requireInteraction: data.hitnost === 'zakasnila'
		})
	);
});

// Klik na notifikaciju — fokusiraj otvoreni tab ili otvori novi
self.addEventListener('notificationclick', (event: NotificationEvent) => {
	event.notification.close();
	const url: string = event.notification.data?.url ?? '/aktivnosti';
	event.waitUntil(
		self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
			for (const client of list) {
				if ('focus' in client) return (client as WindowClient).focus();
			}
			return self.clients.openWindow(url);
		})
	);
});
