import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Jedinstvena revizija po buildu — forsira SW da ponovo fetchuje index.html
// revision: null bi značilo "nikad ne osvježavaj" što uzrokuje plavi ekran
const buildRevision = Date.now().toString(36);

export default defineConfig({
	plugins: [
		sveltekit(),
		VitePWA({
			registerType: 'autoUpdate',
			strategies: 'generateSW',
			manifest: false,

			workbox: {
				cacheId: 'uzgoj-ptica-v2',

				globPatterns: ['**/*.{js,css,ico,png,svg,webp,woff,woff2}'],

				// index.html generiše adapter-static NAKON što Workbox kreira SW,
				// pa ga moramo dodati ručno u precache.
				// buildRevision se mijenja svaki build → SW uvijek re-fetcha novi index.html
				additionalManifestEntries: [
					{ url: '/index.html', revision: buildRevision },
					{ url: '/', revision: buildRevision }
				],

				// SPA navigacijski fallback — uvijek serviraj keširani index.html
				navigateFallback: '/index.html',
				navigateFallbackDenylist: [
					/^\/_app\/immutable\//,
					/^\/api\//
				],

				// SW preuzima kontrolu odmah bez čekanja na refresh
				clientsClaim: true,
				skipWaiting: true,

				runtimeCaching: [
					{
						urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
						handler: 'NetworkFirst',
						options: {
							cacheName: 'supabase-api',
							networkTimeoutSeconds: 8,
							cacheableResponse: { statuses: [0, 200] },
							expiration: {
								maxEntries: 100,
								maxAgeSeconds: 60 * 60 * 24
							}
						}
					},
					{
						urlPattern: /\.(woff2?|ttf|eot|ico|png|svg|webp)$/,
						handler: 'CacheFirst',
						options: {
							cacheName: 'static-assets',
							expiration: {
								maxEntries: 60,
								maxAgeSeconds: 60 * 60 * 24 * 30
							}
						}
					}
				]
			}
		})
	]
});
