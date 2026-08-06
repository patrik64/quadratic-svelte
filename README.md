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
| `.grid` file schema v1.3 + localforage | Same `.grid` schema (v1.3 + legacy import) + localStorage autosave |

## Run it

```sh
pnpm i
pnpm run dev
```

## Features

- **Infinite grid** in all four directions (negative coordinates included) rendered with Pixi.js (WebGL) like the original: display objects persist between frames, pan/zoom is a pure GPU transform, cell layers redraw only on dirty flags, and label rasterization is budgeted per frame — continuous panning holds 60 fps on 10k+ cell sheets. Pan (space+drag / wheel / trackpad with inertia), zoom (⌘+wheel / pinch, 10%–1000%), resizable rows/columns, screen-space headings with selection highlight and optional A1 notation.
- **Cell editing**: type on any cell to open the inline editor; Enter/Tab/arrows commit and move; Escape cancels. `=` on an empty cell starts a formula directly (modern behavior); `/` opens the cell-type menu (Python / Formula / JavaScript); either opens the matching editor on an existing code cell.
- **Formulas** run in the original's Rust/WASM engine (`quadratic-core`, vendored in this repo and compiled with wasm-pack; lazy-loaded on first evaluation): A1 refs (col A = 0, row 0 exists, `n` prefix for negatives), ranges, absolute/relative refs. The function library has been extended with backports from the modern core: ROUND/ROUNDUP/ROUNDDOWN/INT/CEILING/FLOOR/MOD/POWER/EXP/LN/LOG/LOG10, SUMIF/COUNTIF/AVERAGEIF with Excel criteria strings (`">=10"`, `"<>x"`, `*`/`?` wildcards with `~` escapes), COUNTA/COUNTBLANK, IFERROR/ISERROR (lazy) and the IS* predicates, VLOOKUP/HLOOKUP/MATCH/INDEX, LEFT/RIGHT/MID/LEN/UPPER/LOWER/TRIM/SUBSTITUTE/FIND/REPT/TEXTJOIN/CONCATENATE, and a date & time category (TODAY/NOW/DATE/TIME/YEAR..SECOND, DATEVALUE/TIMEVALUE, EDATE/EOMONTH, DAYS/DAYS360/DATEDIF, WEEKDAY/WEEKNUM/ISOWEEKNUM, NETWORKDAYS/WORKDAY, YEARFRAC) — dates are ISO strings like `2026-08-06` since this engine has no date value type. Division by zero errors like the modern core. Rebuild after Rust changes with `npm run build:wasm` (the built `pkg/` is committed, so no Rust toolchain is needed to run the app).
- **Python cells** (Pyodide, lazy-loaded on first run, with numpy + pandas + micropip): `cell(x, y)` / `c()` / `getCells((x0,y0),(x1,y1))` → DataFrame / `cells[...]` API, last expression or assignment is the output, lists/Series spill down, DataFrames spill as 2-D ranges, stdout and tracebacks shown in the editor.
- **JavaScript cells** (from the modern original, where JS is a first-class language): `q.cells('A0'/'A0:B5')`, `q.pos()`, plus `cell(x,y)`/`cells(...)` aliases; the returned value is the output — 1-D arrays spill down, 2-D arrays spill as rows, arrays of objects get a header row; `console.log` is captured; errors report user line numbers.
- **Reactive recompute**: a dependency graph re-evaluates dependent formula and Python cells transitively when their inputs change.
- **Formatting**: bold, italic, text/fill color, alignment, wrapping, number formats (number, currency, percent, scientific, decimal +/−), clear formatting.
- **Undo/redo** across full computation transactions (⌘Z / ⌘⇧Z).
- **Clipboard & export**: copy/cut/paste as TSV (interops with Excel/Sheets), copy the selection as a PNG image (⌘⇧C, rendered from the WebGL scene), download the selection as CSV (⌘⇧E).
- **Right-click grid menu** (ported from the modern client): run code, cut/copy/paste, copy as PNG, download CSV, insert column left/right, insert row above/below, delete the selected rows/columns — all undoable in one step.
- **Rows and columns**: insert and delete shift cells, formats, and custom sizes; formula A1 references are rewritten by the Rust core (`adjust_formula`, preserving `$` markers and relative offsets) so `SUM(B6:B12)` becomes `SUM(B6:B13)` when a row lands inside it. Python/JS reference strings are not rewritten.
- **Files**: `.grid` open/save compatible with the original (including legacy pre-1.3 files), CSV import via drag-drop or menu, IndexedDB autosave (with one-time migration from the old localStorage copy; failures surface in the bottom bar).
- **Examples page** (File → Examples…, Help → Example files, or ⌘O): the six upstream example files plus two written for this port — *Formula tour* (aggregates, SUMIF/COUNTIF criteria, lookups, dates) and *JavaScript* (q.cells, a spilling table, a formula reading JS output). Both ship with pre-computed outputs so they read correctly before anything runs; regenerate with `npm run examples`.
- **Rerun all code** (⌘⇧↵) re-evaluates every code cell on the sheet.
- **Multi-sheet files** with a modern-style SheetBar: add, switch (click or Alt+arrows), rename (double-click), duplicate, per-sheet tab color, reorder — all persisted in the `.grid` file.
- **UI chrome**: menubar (File · Edit · View · Insert · Format · Help, matching the modern client's layout), rename-in-place filename, a code-outline toggle and command-palette button, and a zoom stepper (−/percentage/+) whose menu marks the active preset, bottom bar (cursor/selection, Python status, last-modified), command palette (⌘P) with Insert and Sheet commands, Go-to (⌘G), cell type menu, presentation mode (⌘.). Visuals follow the modern client: blue accent cursor (#2463eb), zoom-fading slate gridlines, amber JavaScript cells.
- **Formula reference**: a searchable browser of every function with signatures, docs, and examples served straight from the Rust core's registry (`formula_docs()` wasm export) — open it from Help, the command palette, or the ƒx button in the formula editor, where clicking a function inserts it. Insert today's date with ⌘; (⌘⇧; with time).

## Keyboard shortcuts

Same as the original: arrows / ⌘arrows (content jumps) / ⇧arrows (extend selection), Tab, Enter, Backspace/Delete, ⌘A, ⌘C/X/V, ⌘Z/⌘⇧Z, ⌘B/I, ⌘\ (clear formatting), ⌘P/K (palette), ⌘G/J (go to), ⌘O (files), ⌘. (presentation), ⌘+/−/0/8/9 (zoom), space+drag (pan), Alt+arrows (switch sheets).

## Not ported (yet)

Borders, fill-handle auto-complete series, AI cells, SQL cells, auth/sharing/multiplayer, Electron shell.
