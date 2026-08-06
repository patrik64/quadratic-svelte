<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<svelte:head>
	<title>Quadratic Svelte — The data science spreadsheet</title>
</svelte:head>

{@render children()}

<style>
	:global(html, body) {
		margin: 0;
		padding: 0;
		height: 100%;
		overflow: hidden;
		font-family:
			'Open Sans',
			-apple-system,
			system-ui,
			'Segoe UI',
			sans-serif;
	}
	:global(#svelte, body > div) {
		height: 100%;
	}
</style>
