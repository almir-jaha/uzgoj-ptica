import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
	plugins: [
		sveltekit(),
		VitePWA({
			registerType: 'autoUpdate',
			strategies: 'generateSW',

			// Koristimo vlastiti manifest.json iz static/
			manifest: false,

			workbox: {
				// Precache: app shell + sve statičke datoteke
				globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],

				// SPA fallback — sve navigacije vraćaju app shell koji SvelteKit
				// klijentski router obrađuje
				navigateFallback: '/',
				navigateFallbackDenylist: [
					/^\/_app\/immutable\//,  // Immutable assets — neka vrati 404
					/^\/api\//               // API rute
				],

				// Runtime caching
				runtimeCaching: [
					{
						// Supabase API — Network First s timeout-om
						// Dexie preuzima ako server nije dostupan
						urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
						handler: 'NetworkFirst',
						options: {
							cacheName: 'supabase-api',
							networkTimeoutSeconds: 8,
							cacheableResponse: { statuses: [0, 200] },
							expiration: {
								maxEntries: 100,
								maxAgeSeconds: 60 * 60 * 24 // 24h
							}
						}
					},
					{
						// Fontovi i ikone — Cache First
						urlPattern: /\.(woff2?|ttf|eot|ico|png|svg|webp)$/,
						handler: 'CacheFirst',
						options: {
							cacheName: 'static-assets',
							expiration: {
								maxEntries: 60,
								maxAgeSeconds: 60 * 60 * 24 * 30 // 30 dana
							}
						}
					}
				]
			}
		})
	]
});
