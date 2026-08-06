<img width="1374" height="506" alt="grafik" src="https://github.com/user-attachments/assets/2badb923-1381-4d3f-ab44-bfcd7e749312" />


# Quadratic Svelte

A SvelteKit reimplementation of [Quadratic](https://github.com/apryse/quadratic) — the data-science spreadsheet with an infinite grid, formulas, and Python cells.

The original app is React + Recoil, renders the grid with Pixi.js (WebGL), evaluates formulas in a Rust/WASM core, and runs Python via Pyodide. This port keeps the same data model, UX, and file format while replacing each layer:

| Original | This port |
| --- | --- |
| React 17 + Recoil atoms | Svelte 5 runes (`src/lib/state.svelte.ts`) |
| Pixi.js 6 + pixi-viewport 4 grid (`gridGL/`) | Pixi.js 8 + pixi-viewport 6 (`src/lib/grid/pixi/`) |
| Rust/WASM formula engine (`quadratic-core`) | The same crate, vendored and built with wasm-pack (`quadratic-core/`) |
| Pyodide + `run_python.py` | Pyodide loaded from CDN + inline prelude (`src/lib/python/pythonRunner.ts`) |
| Statement/runner transactions | Op-based transactions with captured inverses (`src/lib/core/SheetController.ts`) |
| `.grid` file schema v1.3 + localStorage | Same `.grid` schema (v1.3 + legacy import) + localStorage autosave |

## Run

```sh
pnpm i
pnpm run dev
```

for keyboard shortcuts and details about the port look into ``/docs`` folder.
