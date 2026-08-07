<script lang="ts">
	import { app, commitCellValue, ensureCursorVisible, sheetController } from '../state.svelte';

	// cell is fixed at open time; the input pans/zooms with the viewport
	const cell = { ...app.cursorPosition };
	let value = $state(app.inputInitialValue);
	let inputEl: HTMLInputElement | undefined = $state();
	let closed = false;

	const rect = $derived(sheetController.sheet.gridOffsets.getCellRect(cell.x, cell.y));
	const left = $derived((rect.x - app.viewport.x) * app.viewport.scale);
	const top = $derived((rect.y - app.viewport.y) * app.viewport.scale);
	const scale = $derived(app.viewport.scale);

	$effect(() => {
		if (inputEl) {
			inputEl.focus();
			inputEl.setSelectionRange(value.length, value.length);
		}
	});

	async function close(commit: boolean, move?: { dx: number; dy: number }): Promise<void> {
		if (closed) return;
		closed = true;
		app.showInput = false;
		if (commit) await commitCellValue(cell.x, cell.y, value);
		if (move) {
			const pos = { x: cell.x + move.dx, y: cell.y + move.dy };
			app.cursorPosition = pos;
			app.keyboardMovePosition = pos;
			app.multiCursor = undefined;
			ensureCursorVisible();
		}
	}

	function onKeyDown(e: KeyboardEvent): void {
		e.stopPropagation();
		if (e.key === 'Enter') {
			e.preventDefault();
			void close(true, { dx: 0, dy: 1 });
		} else if (e.key === 'Tab') {
			e.preventDefault();
			void close(true, { dx: e.shiftKey ? -1 : 1, dy: 0 });
		} else if (e.key === 'Escape') {
			e.preventDefault();
			void close(false);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			void close(true, { dx: 0, dy: -1 });
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			void close(true, { dx: 0, dy: 1 });
		} else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'p') {
			e.preventDefault();
		}
	}
</script>

<input
	bind:this={inputEl}
	bind:value
	class="cell-input"
	style:left="{left}px"
	style:top="{top}px"
	style:min-width="{rect.w * scale}px"
	style:height="{rect.h * scale}px"
	style:font-size="{14 * scale}px"
	spellcheck="false"
	onkeydown={onKeyDown}
	onblur={() => void close(true)}
/>

<style>
	.cell-input {
		position: absolute;
		border: none;
		outline: none;
		background: var(--panel);
		line-height: 1;
		padding: 0 0 0 3px;
		margin: 0;
		font-family: 'Open Sans', -apple-system, system-ui, sans-serif;
		letter-spacing: 0.07px;
		z-index: 10;
		box-sizing: border-box;
	}
</style>
