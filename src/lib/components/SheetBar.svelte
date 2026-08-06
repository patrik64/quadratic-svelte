<script lang="ts">
	// Multi-sheet tab bar, styled after the modern client's SheetBar:
	// per-sheet color as a 3px bottom bar, double-click renames, right-click
	// (or the chevron) opens the tab menu, + adds Sheet2, Sheet3, ...
	import { app, sheetController, switchSheet } from '../state.svelte';

	const SHEET_COLORS = ['#2463eb', '#8ecb89', '#ca8a04', '#cb8999', '#8c1a6a', '#3776ab', '#f25f5c'];

	const sheets = $derived.by(() => {
		void app.redraw;
		return sheetController.sheets.map((s, i) => ({
			name: s.name,
			color: s.color,
			active: i === sheetController.currentSheetIndex,
			index: i
		}));
	});

	let menuFor = $state<number | undefined>(undefined);
	let menuEl: HTMLDivElement | undefined = $state();
	let menuX = $state(0);
	let renaming = $state<number | undefined>(undefined);
	let renameDraft = $state('');
	let renameEl: HTMLInputElement | undefined = $state();

	function openMenu(e: MouseEvent, index: number): void {
		e.preventDefault();
		menuFor = index;
		menuX = Math.min(e.clientX, window.innerWidth - 200);
	}

	function closeMenu(): void {
		menuFor = undefined;
	}

	function startRename(index: number): void {
		renaming = index;
		renameDraft = sheetController.sheets[index].name;
		closeMenu();
		queueMicrotask(() => {
			renameEl?.focus();
			renameEl?.select();
		});
	}

	function commitRename(): void {
		if (renaming !== undefined) sheetController.renameSheet(renaming, renameDraft);
		renaming = undefined;
	}

	$effect(() => {
		if (menuFor === undefined) return;
		const close = (e: MouseEvent) => {
			if (!menuEl?.contains(e.target as Node)) closeMenu();
		};
		window.addEventListener('mousedown', close);
		return () => window.removeEventListener('mousedown', close);
	});
</script>

<div class="sheetbar" oncontextmenu={(e) => e.preventDefault()}>
	<button
		class="add"
		title="Add sheet"
		onclick={() => {
			sheetController.addSheet();
			app.multiCursor = undefined;
		}}>＋</button
	>
	<div class="tabs">
		{#each sheets as tab (tab.index)}
			{#if renaming === tab.index}
				<input
					bind:this={renameEl}
					bind:value={renameDraft}
					class="rename"
					maxlength="31"
					onkeydown={(e) => {
						e.stopPropagation();
						if (e.key === 'Enter') commitRename();
						if (e.key === 'Escape') renaming = undefined;
					}}
					onblur={commitRename}
				/>
			{:else}
				<button
					class="tab"
					class:active={tab.active}
					style:--sheet-color={tab.color ?? 'transparent'}
					onclick={() => switchSheet(tab.index)}
					ondblclick={() => startRename(tab.index)}
					oncontextmenu={(e) => openMenu(e, tab.index)}
				>
					{tab.name}
					<span
						class="chevron"
						class:visible={tab.active}
						role="presentation"
						onclick={(e) => {
							e.stopPropagation();
							openMenu(e, tab.index);
						}}>▾</span
					>
				</button>
			{/if}
		{/each}
	</div>
</div>

{#if menuFor !== undefined}
	{@const index = menuFor}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="tabmenu" bind:this={menuEl} style:left="{menuX}px">
		{#if sheets.length > 1}
			<button
				class="menu-item"
				onclick={() => {
					sheetController.deleteSheet(index);
					closeMenu();
				}}>Delete</button
			>
		{/if}
		<button
			class="menu-item"
			onclick={() => {
				sheetController.duplicateSheet(index);
				closeMenu();
			}}>Duplicate</button
		>
		<button class="menu-item" onclick={() => startRename(index)}>Rename</button>
		<div class="menu-label">Color</div>
		<div class="swatches">
			{#each SHEET_COLORS as color (color)}
				<button
					class="swatch"
					style:background={color}
					aria-label="sheet color {color}"
					onclick={() => {
						sheetController.setSheetColor(index, color);
						closeMenu();
					}}
				></button>
			{/each}
			<button
				class="swatch clear"
				title="Clear color"
				onclick={() => {
					sheetController.setSheetColor(index, undefined);
					closeMenu();
				}}>✕</button
			>
		</div>
		<div class="menu-divider"></div>
		<button
			class="menu-item"
			disabled={index === 0}
			onclick={() => {
				sheetController.moveSheet(index, -1);
				closeMenu();
			}}>Move left</button
		>
		<button
			class="menu-item"
			disabled={index === sheets.length - 1}
			onclick={() => {
				sheetController.moveSheet(index, 1);
				closeMenu();
			}}>Move right</button
		>
	</div>
{/if}

<style>
	.sheetbar {
		display: flex;
		align-items: stretch;
		height: 2rem;
		background: #fbfcfd;
		border-top: 1px solid #cfd7de;
		font-size: 0.75rem;
		color: #55606b;
		user-select: none;
	}
	.add {
		border: none;
		border-right: 1px solid #e3e8ec;
		background: none;
		font-size: 0.9rem;
		color: #55606b;
		width: 2.2rem;
		cursor: pointer;
	}
	.add:hover {
		background: #eef2f5;
	}
	.tabs {
		display: flex;
		overflow-x: auto;
		scrollbar-width: thin;
	}
	.tab {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		border: none;
		border-right: 1px solid #e3e8ec;
		background: none;
		font: inherit;
		color: inherit;
		padding: 0 0.9rem 3px;
		cursor: pointer;
		white-space: nowrap;
	}
	.tab::before {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 3px;
		background: var(--sheet-color);
	}
	.tab:hover {
		background: #eef2f5;
	}
	.tab.active {
		background: white;
		color: #2463eb;
		font-weight: 600;
	}
	.chevron {
		visibility: hidden;
		font-size: 0.6rem;
		color: #8a939c;
	}
	.tab:hover .chevron,
	.chevron.visible {
		visibility: visible;
	}
	.rename {
		font: inherit;
		border: 1px solid #2463eb;
		outline: none;
		margin: 3px;
		padding: 0 0.5rem;
		width: 8rem;
	}
	.tabmenu {
		position: fixed;
		bottom: 3.6rem;
		background: white;
		border: 1px solid #cfd7de;
		border-radius: 4px;
		box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.12);
		min-width: 11rem;
		padding: 4px 0;
		z-index: 150;
		font-size: 0.8rem;
	}
	.menu-item {
		display: block;
		width: 100%;
		background: none;
		border: none;
		font: inherit;
		text-align: left;
		padding: 0.35rem 1rem;
		cursor: pointer;
		color: #202020;
	}
	.menu-item:hover:not(:disabled) {
		background: #eef4ff;
	}
	.menu-item:disabled {
		color: #a7b2bc;
		cursor: default;
	}
	.menu-label {
		padding: 0.35rem 1rem 0.1rem;
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #8a939c;
	}
	.menu-divider {
		border-top: 1px solid #e6ebf0;
		margin: 4px 0;
	}
	.swatches {
		display: flex;
		gap: 4px;
		padding: 4px 1rem 8px;
	}
	.swatch {
		width: 18px;
		height: 18px;
		border: 1px solid #cfd7de;
		border-radius: 3px;
		cursor: pointer;
		padding: 0;
		font-size: 0.6rem;
		color: #55606b;
	}
	.swatch.clear {
		background: white;
	}
</style>
