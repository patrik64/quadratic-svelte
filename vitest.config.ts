import { defineConfig } from 'vitest/config';

// Standalone config: the pure-TS core is tested without the SvelteKit
// plugin, so tests never compile runes or touch wasm/Pixi/Pyodide.
export default defineConfig({
	test: {
		environment: 'node',
		include: ['src/**/*.test.ts']
	}
});
