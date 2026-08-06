<script lang="ts">
	import { getCellA1Notation } from '../core/a1';
	import { editorModeColor } from '../grid/colors';
	import { KeyboardSymbols } from '../helpers/keyboardSymbols';
	import { pythonStatus } from '../python/pythonRunner';
	import { app, saveCellCode, sheetController } from '../state.svelte';

	let code = $state('');
	let running = $state(false);
	let textareaEl: HTMLTextAreaElement | undefined = $state();

	// reload the buffer whenever the editor targets a different cell/mode
	let loadedKey = $state('');
	$effect(() => {
		const key = `${app.editorCell.x},${app.editorCell.y},${app.editorMode}`;
		if (key !== loadedKey) {
			loadedKey = key;
			const cell = sheetController.sheet.getCell(app.editorCell.x, app.editorCell.y);
			code =
				app.editorMode === 'FORMULA'
					? (cell?.formula_code ?? '')
					: app.editorMode === 'JAVASCRIPT'
						? (cell?.javascript_code ?? '')
						: (cell?.python_code ?? '');
			queueMicrotask(() => textareaEl?.focus());
		}
	});

	// insert requests from the formula reference (FormulaDocs)
	$effect(() => {
		const text = app.pendingEditorInsert;
		if (text && textareaEl) {
			const start = textareaEl.selectionStart ?? code.length;
			const end = textareaEl.selectionEnd ?? start;
			code = code.slice(0, start) + text + code.slice(end);
			app.pendingEditorInsert = '';
			queueMicrotask(() => {
				textareaEl?.focus();
				textareaEl?.setSelectionRange(start + text.length, start + text.length);
			});
		}
	});

	const cell = $derived.by(() => {
		void app.redraw;
		return sheetController.sheet.getCell(app.editorCell.x, app.editorCell.y);
	});
	const result = $derived(cell?.evaluation_result);
	const modeColor = $derived(editorModeColor(app.editorMode));
	const modeName = $derived(
		app.editorMode === 'FORMULA'
			? 'Formula'
			: app.editorMode === 'JAVASCRIPT'
				? 'JavaScript'
				: 'Python'
	);

	async function run(): Promise<void> {
		if (running) return;
		running = true;
		try {
			await saveCellCode(app.editorCell.x, app.editorCell.y, app.editorMode, code);
		} finally {
			running = false;
		}
	}

	function close(): void {
		app.showCodeEditor = false;
	}

	// swallow only the keys handled here; everything else bubbles so global
	// shortcuts (⌘., ⌘P, zoom, …) keep working while the editor is focused
	function onKeyDown(e: KeyboardEvent): void {
		if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
			e.preventDefault();
			e.stopPropagation();
			void run();
			return;
		}
		if (e.key === 'Escape') {
			e.preventDefault();
			e.stopPropagation();
			close();
			return;
		}
		if (e.key === 'Tab' && e.target === textareaEl && textareaEl) {
			e.preventDefault();
			e.stopPropagation();
			const start = textareaEl.selectionStart;
			const end = textareaEl.selectionEnd;
			code = code.slice(0, start) + '    ' + code.slice(end);
			queueMicrotask(() => textareaEl?.setSelectionRange(start + 4, start + 4));
		}
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="code-editor" onkeydown={onKeyDown}>
	<div class="header" style:border-top="3px solid {modeColor}">
		<div class="title">
			<span class="mode" style:color={modeColor}>{modeName}</span>
			<span class="cellref">
				Cell ({app.editorCell.x}, {app.editorCell.y})
				<span class="a1">{getCellA1Notation(app.editorCell.x, app.editorCell.y)}</span>
			</span>
		</div>
		<div class="actions">
			{#if app.editorMode === 'FORMULA'}
				<button
					class="fx"
					onclick={() => (app.showFormulaDocs = true)}
					title="Browse all formula functions"
				>
					ƒx Functions
				</button>
			{/if}
			<button class="run" onclick={() => void run()} disabled={running} title="Run ({KeyboardSymbols.Cmd}{KeyboardSymbols.Enter})">
				{#if running}Running…{:else}▶ Run{/if}
			</button>
			<button class="close" onclick={close} title="Close (Esc)">✕</button>
		</div>
	</div>

	{#if app.editorMode === 'PYTHON' && $pythonStatus.state === 'loading'}
		<div class="python-loading">Loading Python runtime (Pyodide + pandas)… first run may take a moment.</div>
	{/if}

	<textarea
		bind:this={textareaEl}
		bind:value={code}
		class="code"
		spellcheck="false"
		placeholder={app.editorMode === 'FORMULA'
			? 'e.g.  SUM(A0:A5) * 2'
			: app.editorMode === 'JAVASCRIPT'
				? "e.g.\nlet total = q.cells('D6');\nreturn total * 2;"
				: 'e.g.\nresult = cell(0, 0)\nresult * 2'}
	></textarea>

	<div class="output">
		<div class="output-header">OUTPUT</div>
		{#if result}
			{#if result.success}
				{#if result.output_value !== null && result.output_value !== undefined}
					<div class="output-value">{result.output_value}</div>
				{/if}
				{#if result.array_output}
					<div class="output-note">
						Array output spilled onto the grid ({cell?.array_cells?.length ?? 0} cells)
					</div>
				{/if}
				{#if result.std_out}
					<pre class="stdout">{result.std_out}</pre>
				{/if}
			{:else}
				<pre class="stderr">{result.std_err ?? 'Error'}</pre>
			{/if}
		{:else}
			<div class="output-note">Not run yet.</div>
		{/if}
	</div>
</div>

<style>
	.code-editor {
		width: min(420px, 45vw);
		border-left: 1px solid #cfd7de;
		background: white;
		display: flex;
		flex-direction: column;
		font-size: 0.85rem;
	}
	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid #e6ebf0;
	}
	.title {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}
	.mode {
		font-weight: 600;
	}
	.cellref {
		color: #55606b;
		font-size: 0.75rem;
	}
	.a1 {
		color: #a7b2bc;
		margin-left: 0.4rem;
	}
	.actions {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}
	.run {
		background: #6cd4ff;
		color: #003a52;
		border: none;
		border-radius: 3px;
		padding: 0.3rem 0.8rem;
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}
	.run:disabled {
		opacity: 0.6;
		cursor: default;
	}
	.fx {
		background: none;
		border: 1px solid #cfd7de;
		border-radius: 3px;
		color: #8c1a6a;
		padding: 0.3rem 0.6rem;
		font: inherit;
		font-size: 0.78rem;
		cursor: pointer;
	}
	.fx:hover {
		background: #fdf3fa;
		border-color: #8c1a6a;
	}
	.close {
		background: none;
		border: none;
		font-size: 1rem;
		color: #55606b;
		cursor: pointer;
		padding: 0.2rem 0.4rem;
	}
	.python-loading {
		padding: 0.4rem 0.75rem;
		background: #fff3cd;
		color: #664d03;
		font-size: 0.75rem;
	}
	.code {
		flex: 1;
		border: none;
		outline: none;
		resize: none;
		padding: 0.75rem;
		font-family: 'SF Mono', ui-monospace, Menlo, Consolas, monospace;
		font-size: 0.8rem;
		line-height: 1.5;
		tab-size: 4;
		min-height: 8rem;
	}
	.output {
		border-top: 1px solid #e6ebf0;
		max-height: 40%;
		overflow: auto;
		padding: 0.5rem 0.75rem;
	}
	.output-header {
		font-size: 0.65rem;
		letter-spacing: 0.08em;
		color: #a7b2bc;
		margin-bottom: 0.3rem;
	}
	.output-value {
		font-family: 'SF Mono', ui-monospace, Menlo, Consolas, monospace;
		font-size: 0.8rem;
	}
	.output-note {
		color: #55606b;
		font-size: 0.75rem;
	}
	pre.stdout,
	pre.stderr {
		margin: 0.3rem 0 0;
		font-size: 0.75rem;
		white-space: pre-wrap;
		word-break: break-word;
	}
	pre.stderr {
		color: #f25f5c;
	}
</style>
