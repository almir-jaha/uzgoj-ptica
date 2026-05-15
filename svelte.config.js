import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			runtime: 'nodejs20.x'
		})
	},
	onwarn: (warning, handler) => {
		if (warning.code.startsWith('a11y')) return;
		handler(warning);
	}
};

export default config;
