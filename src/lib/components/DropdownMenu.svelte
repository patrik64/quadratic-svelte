<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		label,
		title,
		children,
		align = 'left'
	}: { label: Snippet | string; title?: string; children: Snippet; align?: 'left' | 'right' } =
		$props();

	let open = $state(false);
	let rootEl: HTMLDivElement | undefined = $state();

	function onWindowClick(e: MouseEvent): void {
		if (open && rootEl && !rootEl.contains(e.target as Node)) open = false;
	}

	$effect(() => {
		window.addEventListener('mousedown', onWindowClick);
		return () => window.removeEventListener('mousedown', onWindowClick);
	});

	export function close(): void {
		open = false;
	}
</script>

<div class="dropdown" bind:this={rootEl}>
	<button class="trigger" {title} onclick={() => (open = !open)} class:active={open}>
		{#if typeof label === 'string'}{label}{:else}{@render label()}{/if}
	</button>
	{#if open}
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="panel" class:align-right={align === 'right'} onclick={() => (open = false)}>
			{@render children()}
		</div>
	{/if}
</div>

<style>
	.dropdown {
		position: relative;
		display: inline-flex;
	}
	.trigger {
		background: none;
		border: none;
		font: inherit;
		color: inherit;
		cursor: pointer;
		padding: 0.25rem 0.5rem;
		border-radius: 3px;
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
	}
	.trigger:hover,
	.trigger.active {
		background: #f6f8fa;
	}
	.panel {
		position: absolute;
		top: 100%;
		left: 0;
		margin-top: 2px;
		background: white;
		border: 1px solid #cfd7de;
		border-radius: 4px;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
		min-width: 220px;
		padding: 4px 0;
		z-index: 100;
		font-size: 0.85rem;
		max-height: calc(100vh - 5rem);
		overflow-y: auto;
	}
	/* right-aligned panels must release `left`, or the box stretches
	   past the viewport edge instead of hugging the trigger's right */
	.panel.align-right {
		left: auto;
		right: 0;
	}
	.panel :global(button.menu-item) {
		display: flex;
		width: 100%;
		align-items: center;
		justify-content: space-between;
		gap: 2rem;
		background: none;
		border: none;
		font: inherit;
		text-align: left;
		padding: 0.35rem 1rem;
		cursor: pointer;
		color: #202020;
		white-space: nowrap;
	}
	.panel :global(button.menu-item:hover:not(:disabled)) {
		background: #e7f7ff;
	}
	.panel :global(button.menu-item:disabled) {
		color: #a7b2bc;
		cursor: default;
	}
	.panel :global(.menu-divider) {
		border-top: 1px solid #e6ebf0;
		margin: 4px 0;
	}
	.panel :global(.menu-header) {
		padding: 0.35rem 1rem;
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #55606b;
	}
	.panel :global(.shortcut) {
		color: #a7b2bc;
		font-size: 0.75rem;
	}
</style>
