<script lang="ts">
	import { pythonStatus } from '../python/pythonRunner';
	import { app, sheetController } from '../state.svelte';

	const selection = $derived(app.multiCursor);
	const cursorCell = $derived.by(() => {
		void app.redraw;
		return sheetController.sheet.getCell(app.cursorPosition.x, app.cursorPosition.y);
	});

	function timeAgo(iso: string): string {
		const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
		if (seconds < 60) return 'less than a minute ago';
		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
		const days = Math.floor(hours / 24);
		return `${days} day${days === 1 ? '' : 's'} ago`;
	}
</script>

<div class="bottombar" oncontextmenu={(e) => e.preventDefault()}>
	<div class="left">
		<button class="stat link" onclick={() => (app.showGoToMenu = true)}>
			Cursor: ({app.cursorPosition.x}, {app.cursorPosition.y})
		</button>
		{#if selection}
			<button class="stat link" onclick={() => (app.showGoToMenu = true)}>
				Selection: ({selection.originPosition.x}, {selection.originPosition.y}), ({selection
					.terminalPosition.x}, {selection.terminalPosition.y})
			</button>
		{/if}
		{#if cursorCell?.last_modified}
			<span class="stat">You, {timeAgo(cursorCell.last_modified)}</span>
		{/if}
	</div>
	<div class="right">
		{#if app.saveError}
			<span class="stat error" title={app.saveError}>
				⚠ Autosave failed — use File → Download to keep your work
			</span>
		{/if}
		{#if $pythonStatus.state === 'ready'}
			<span class="stat">✓ Python {$pythonStatus.version}</span>
		{:else if $pythonStatus.state === 'loading'}
			<span class="stat">⏳ Loading Python…</span>
		{:else if $pythonStatus.state === 'error'}
			<span class="stat error">✗ Python failed to load</span>
		{/if}
		<span class="stat">✓ Quadratic Svelte 0.1.0</span>
		<span class="beta">BETA</span>
	</div>
</div>

<style>
	.bottombar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: rgba(255, 255, 255, 0.9);
		border-top: 1px solid #cfd7de;
		color: #55606b;
		height: 1.5rem;
		font-size: 0.7rem;
		padding: 0 1rem;
		user-select: none;
		backdrop-filter: blur(1px);
	}
	.left,
	.right {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	.stat {
		white-space: nowrap;
	}
	.stat.error {
		color: #f25f5c;
	}
	button.link {
		background: none;
		border: none;
		font: inherit;
		color: inherit;
		cursor: pointer;
		padding: 0;
	}
	button.link:hover {
		text-decoration: underline;
	}
	.beta {
		background: #8ecb89;
		color: white;
		padding: 2px 5px;
		border-radius: 2px;
		font-size: 0.65rem;
	}
</style>
