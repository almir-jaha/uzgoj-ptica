import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			// SPA fallback — sve rute vraćaju index.html koji SvelteKit router obrađuje
			fallback: 'index.html'
		})
	},
	onwarn: (warning, handler) => {
		if (warning.code.startsWith('a11y')) return;
		handler(warning);
	}
};

export default config;
