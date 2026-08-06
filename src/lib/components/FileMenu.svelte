<script lang="ts">
	import { app, newFile, openFileFromJSON, saveFile } from '../state.svelte';

	interface Example {
		name: string;
		file: string;
		description: string;
		tags: ('Formulas' | 'Python' | 'JavaScript' | 'Data')[];
	}

	const EXAMPLES: Example[] = [
		{
			name: 'Formula tour (example)',
			file: 'formula_tour.grid',
			description: 'Aggregates, SUMIF/COUNTIF criteria, lookups, and date functions.',
			tags: ['Formulas']
		},
		{
			name: 'JavaScript (example)',
			file: 'javascript.grid',
			description: 'q.cells(), spilling a table, and a formula reading JS output.',
			tags: ['JavaScript', 'Formulas']
		},
		{
			name: 'Default (example)',
			file: 'default.grid',
			description: 'Quick overview of basic usage of the app.',
			tags: ['Formulas', 'Python']
		},
		{
			name: 'Python (example)',
			file: 'python.grid',
			description: 'Advanced examples of how to use Python in the app.',
			tags: ['Python']
		},
		{
			name: 'Airports distance (example)',
			file: 'airports_distance.grid',
			description: 'Filtering data and calculating values over a large table.',
			tags: ['Python', 'Data']
		},
		{
			name: 'Expenses (example)',
			file: 'expenses.grid',
			description: 'Spreadsheet-style budgeting with formatted currency.',
			tags: ['Formulas']
		},
		{
			name: 'Monte Carlo simulation (example)',
			file: 'monte_carlo_simulation.grid',
			description: 'Working with large sets of generated data.',
			tags: ['Python', 'Data']
		},
		{
			name: 'Startup portfolio (example)',
			file: 'startup_portfolio.grid',
			description: 'Calculations from formulas and Python side by side.',
			tags: ['Formulas', 'Python', 'Data']
		}
	];

	let fileInput: HTMLInputElement | undefined = $state();
	let error = $state('');

	function close(): void {
		app.showFileMenu = false;
	}

	async function openLocal(e: Event): Promise<void> {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		try {
			openFileFromJSON(await file.text(), file.name);
			close();
		} catch (err) {
			error = `Could not open file: ${String(err)}`;
		}
	}

	let loading = $state('');

	async function openExample(file: string, name: string): Promise<void> {
		loading = file;
		try {
			const res = await fetch(`/examples/${file}`);
			if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
			openFileFromJSON(await res.text(), name);
			close();
		} catch (err) {
			error = `Could not load ${name}: ${String(err)}`;
		} finally {
			loading = '';
		}
	}

	function onKeyDown(e: KeyboardEvent): void {
		e.stopPropagation();
		if (e.key === 'Escape') close();
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="filemenu" onkeydown={onKeyDown} tabindex="-1">
	<div class="header">
		<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
			<rect x="2" y="2" width="9" height="9" fill="#6cd4ff" />
			<rect x="13" y="2" width="9" height="9" fill="#8ecb89" />
			<rect x="2" y="13" width="9" height="9" fill="#cb8999" />
			<rect x="13" y="13" width="9" height="9" fill="#5d576b" />
		</svg>
		<span class="title">Files</span>
		<button class="close" onclick={close} title="Close (Esc)">✕</button>
	</div>

	{#if error}<div class="error">{error}</div>{/if}

	<div class="content">
		<div class="section">
			<div class="section-title">Start</div>
			<button
				class="entry"
				onclick={() => {
					newFile();
					close();
				}}
			>
				<span class="entry-name">＋ New grid</span>
				<span class="entry-desc">Start with a blank sheet.</span>
			</button>
			<button class="entry" onclick={() => fileInput?.click()}>
				<span class="entry-name">⌥ Open local file…</span>
				<span class="entry-desc">Open a .grid file from your computer.</span>
			</button>
			<button
				class="entry"
				onclick={() => {
					saveFile();
				}}
			>
				<span class="entry-name">↓ Download current file</span>
				<span class="entry-desc">Save “{app.filename}” as a .grid file.</span>
			</button>
		</div>
		<div class="section examples">
			<div class="section-title">Examples</div>
			<div class="example-grid">
				{#each EXAMPLES as example (example.file)}
					<button
						class="entry example"
						disabled={loading !== ''}
						onclick={() => openExample(example.file, example.name)}
					>
						<span class="entry-name">{example.name.replace(' (example)', '')}</span>
						<span class="entry-desc">{example.description}</span>
						<span class="tags">
							{#each example.tags as tag (tag)}
								<span class="tag {tag.toLowerCase()}">{tag}</span>
							{/each}
							{#if loading === example.file}<span class="tag loading">Opening…</span>{/if}
						</span>
					</button>
				{/each}
			</div>
		</div>
	</div>

	<input
		bind:this={fileInput}
		type="file"
		accept=".grid,.json"
		style="display: none"
		onchange={openLocal}
	/>
</div>

<style>
	.filemenu {
		position: fixed;
		inset: 0;
		background: white;
		z-index: 300;
		display: flex;
		flex-direction: column;
		outline: none;
	}
	.header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem 1.5rem;
		border-bottom: 1px solid #e6ebf0;
	}
	.title {
		font-weight: 600;
		font-size: 1.1rem;
		color: #202020;
	}
	.close {
		margin-left: auto;
		background: none;
		border: none;
		font-size: 1.1rem;
		color: #55606b;
		cursor: pointer;
	}
	.error {
		background: #fde8e8;
		color: #b71c1c;
		padding: 0.5rem 1.5rem;
		font-size: 0.85rem;
	}
	.content {
		display: grid;
		grid-template-columns: minmax(240px, 1fr) minmax(0, 2.2fr);
		gap: 2.5rem;
		padding: 1.5rem;
		overflow-y: auto;
		max-width: 1100px;
		margin: 0 auto;
		width: 100%;
		box-sizing: border-box;
	}
	@media (max-width: 780px) {
		.content {
			grid-template-columns: 1fr;
			gap: 1.5rem;
		}
	}
	.example-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: 0.6rem;
	}
	.entry.example {
		margin-bottom: 0;
		gap: 0.3rem;
	}
	.entry:disabled {
		opacity: 0.6;
		cursor: default;
	}
	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
		margin-top: 0.15rem;
	}
	.tag {
		font-size: 0.62rem;
		letter-spacing: 0.03em;
		text-transform: uppercase;
		padding: 1px 6px;
		border-radius: 9px;
		border: 1px solid currentColor;
		color: #8a939c;
	}
	.tag.formulas {
		color: #8c1a6a;
	}
	.tag.python {
		color: #3776ab;
	}
	.tag.javascript {
		color: #ca8a04;
	}
	.tag.data {
		color: #55606b;
	}
	.tag.loading {
		color: #2463eb;
	}
	.section-title {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: #55606b;
		margin-bottom: 0.5rem;
	}
	.entry {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.15rem;
		width: 100%;
		background: none;
		border: 1px solid #e6ebf0;
		border-radius: 6px;
		font: inherit;
		text-align: left;
		padding: 0.7rem 0.9rem;
		margin-bottom: 0.5rem;
		cursor: pointer;
	}
	.entry:hover {
		border-color: #6cd4ff;
		background: #f2fbff;
	}
	.entry-name {
		font-weight: 600;
		font-size: 0.9rem;
		color: #202020;
	}
	.entry-desc {
		font-size: 0.75rem;
		color: #55606b;
	}
</style>
