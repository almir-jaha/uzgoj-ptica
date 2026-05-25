import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Jedinstvena revizija po buildu — forsira SW da ponovo fetchuje index.html
const buildRevision = Date.now().toString(36);

export default defineConfig({
	plugins: [
		sveltekit(),
		VitePWA({
			registerType: 'autoUpdate',
			// injectManifest: koristimo src/sw.ts koji sam piše logiku + push handler
			// generateSW ne podržava custom push event handlere
			strategies: 'injectManifest',
			srcDir: 'src',
			filename: 'sw.ts',
			manifest: false,

			injectManifest: {
				globPatterns: ['**/*.{js,css,ico,png,svg,webp,woff,woff2}'],
				additionalManifestEntries: [
					{ url: '/index.html', revision: buildRevision },
					{ url: '/', revision: buildRevision }
				]
			}
		})
	]
});
