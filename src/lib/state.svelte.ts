// Central reactive app state — the Svelte-runes equivalent of Quadratic's
// Recoil atoms (gridInteractionState, editorInteractionState, gridSettings).

import { Sheet } from './core/Sheet';
import { SheetController } from './core/SheetController';
import { updateCellAndDCells } from './core/updateCellAndDCells';
import {
	CELL_HEIGHT,
	CELL_WIDTH,
	HEADING_SIZE,
	isCodeCellType,
	type Cell,
	type CellAlignment,
	type CellFormat,
	type CellTextFormat,
	type CellType,
	type Coordinate
} from './core/types';
import {
	DEFAULT_FILE_NAME,
	downloadGridFile,
	exportGridFile,
	importGridFile,
	loadCurrentFile,
	parseCSV,
	saveCurrentFile
} from './files/gridFile';

export type EditorMode = 'FORMULA' | 'PYTHON' | 'JAVASCRIPT';
export type PanMode = 'disabled' | 'enabled' | 'dragging';

export const sheetController = new SheetController();

interface MultiCursor {
	originPosition: Coordinate;
	terminalPosition: Coordinate;
}

function createState() {
	// ---- interaction state ----
	let cursorPosition = $state<Coordinate>({ x: 0, y: 0 });
	let keyboardMovePosition = $state<Coordinate>({ x: 0, y: 0 });
	let multiCursor = $state<MultiCursor | undefined>(undefined);
	let showInput = $state(false);
	let inputInitialValue = $state('');
	let panMode = $state<PanMode>('disabled');

	// ---- editor interaction state ----
	let showCellTypeMenu = $state(false);
	let showCodeEditor = $state(false);
	let showCommandPalette = $state(false);
	let showGoToMenu = $state(false);
	let showFileMenu = $state(false);
	let showFormulaDocs = $state(false);
	let pendingEditorInsert = $state('');
	let editorMode = $state<EditorMode>('PYTHON');
	let editorCell = $state<Coordinate>({ x: 0, y: 0 });

	// ---- settings ----
	let showHeadings = $state(true);
	let showGridAxes = $state(true);
	let showGridLines = $state(true);
	let showCellTypeOutlines = $state(true);
	let showA1Notation = $state(false);
	let presentationMode = $state(false);

	// ---- viewport (world coords of canvas top-left, scale) ----
	let viewport = $state({ x: -HEADING_SIZE - 2, y: -HEADING_SIZE - 2, scale: 1 });

	// ---- file ----
	let filename = $state(DEFAULT_FILE_NAME);
	let fileId = $state<string>(crypto.randomUUID());

	// autosave health, shown in the BottomBar when something goes wrong
	let saveError = $state('');

	// bump to force canvas redraw after non-reactive sheet mutations
	let redraw = $state(0);

	return {
		get cursorPosition() {
			return cursorPosition;
		},
		set cursorPosition(v) {
			cursorPosition = v;
		},
		get keyboardMovePosition() {
			return keyboardMovePosition;
		},
		set keyboardMovePosition(v) {
			keyboardMovePosition = v;
		},
		get multiCursor() {
			return multiCursor;
		},
		set multiCursor(v) {
			multiCursor = v;
		},
		get showInput() {
			return showInput;
		},
		set showInput(v) {
			showInput = v;
		},
		get inputInitialValue() {
			return inputInitialValue;
		},
		set inputInitialValue(v) {
			inputInitialValue = v;
		},
		get panMode() {
			return panMode;
		},
		set panMode(v) {
			panMode = v;
		},
		get showCellTypeMenu() {
			return showCellTypeMenu;
		},
		set showCellTypeMenu(v) {
			showCellTypeMenu = v;
		},
		get showCodeEditor() {
			return showCodeEditor;
		},
		set showCodeEditor(v) {
			showCodeEditor = v;
		},
		get showCommandPalette() {
			return showCommandPalette;
		},
		set showCommandPalette(v) {
			showCommandPalette = v;
		},
		get showGoToMenu() {
			return showGoToMenu;
		},
		set showGoToMenu(v) {
			showGoToMenu = v;
		},
		get showFileMenu() {
			return showFileMenu;
		},
		set showFileMenu(v) {
			showFileMenu = v;
		},
		get showFormulaDocs() {
			return showFormulaDocs;
		},
		set showFormulaDocs(v) {
			showFormulaDocs = v;
		},
		get pendingEditorInsert() {
			return pendingEditorInsert;
		},
		set pendingEditorInsert(v) {
			pendingEditorInsert = v;
		},
		get editorMode() {
			return editorMode;
		},
		set editorMode(v) {
			editorMode = v;
		},
		get editorCell() {
			return editorCell;
		},
		set editorCell(v) {
			editorCell = v;
		},
		get showHeadings() {
			return showHeadings;
		},
		set showHeadings(v) {
			showHeadings = v;
		},
		get showGridAxes() {
			return showGridAxes;
		},
		set showGridAxes(v) {
			showGridAxes = v;
		},
		get showGridLines() {
			return showGridLines;
		},
		set showGridLines(v) {
			showGridLines = v;
		},
		get showCellTypeOutlines() {
			return showCellTypeOutlines;
		},
		set showCellTypeOutlines(v) {
			showCellTypeOutlines = v;
		},
		get showA1Notation() {
			return showA1Notation;
		},
		set showA1Notation(v) {
			showA1Notation = v;
		},
		get presentationMode() {
			return presentationMode;
		},
		set presentationMode(v) {
			presentationMode = v;
		},
		get viewport() {
			return viewport;
		},
		set viewport(v) {
			viewport = v;
		},
		get filename() {
			return filename;
		},
		set filename(v) {
			filename = v;
		},
		get fileId() {
			return fileId;
		},
		set fileId(v) {
			fileId = v;
		},
		get saveError() {
			return saveError;
		},
		set saveError(v) {
			saveError = v;
		},
		get redraw() {
			return redraw;
		},
		markDirty() {
			redraw++;
		}
	};
}

export const app = createState();

// persist + redraw on any model change
let saveTimer: ReturnType<typeof setTimeout> | undefined;
sheetController.onChange = () => {
	app.markDirty();
	clearTimeout(saveTimer);
	saveTimer = setTimeout(() => {
		void saveCurrentFile(exportGridFile(sheetController, app.filename, app.fileId))
			.then(() => (app.saveError = ''))
			.catch((e) => {
				app.saveError = String(e);
				console.error('autosave failed:', e);
			});
	}, 300);
};

// ------------------------------------------------------------------ helpers

export function clearSelection(): void {
	app.multiCursor = undefined;
}

export function getSelectionRect(): { x0: number; y0: number; x1: number; y1: number } {
	if (app.multiCursor) {
		const { originPosition: o, terminalPosition: t } = app.multiCursor;
		return {
			x0: Math.min(o.x, t.x),
			y0: Math.min(o.y, t.y),
			x1: Math.max(o.x, t.x),
			y1: Math.max(o.y, t.y)
		};
	}
	const c = app.cursorPosition;
	return { x0: c.x, y0: c.y, x1: c.x, y1: c.y };
}

// ------------------------------------------------------------------ editing

export async function commitCellValue(x: number, y: number, value: string): Promise<void> {
	const sheet = sheetController.sheet;
	sheetController.startTransaction();
	if (value.trim() === '') {
		const existing = sheet.getCell(x, y);
		if (existing) {
			await updateCellAndDCells({
				starting_cells: [existing],
				sheetController,
				delete_starting_cells: true
			});
		}
	} else {
		const cell: Cell = {
			x,
			y,
			type: 'TEXT',
			value: value.trim(),
			last_modified: new Date().toISOString()
		};
		await updateCellAndDCells({ starting_cells: [cell], sheetController });
	}
	sheetController.endTransaction();
}

export async function saveCellCode(
	x: number,
	y: number,
	mode: EditorMode,
	code: string
): Promise<void> {
	const existing = sheetController.sheet.getCell(x, y);
	const cell: Cell = {
		...(existing && existing.type === mode ? existing : {}),
		x,
		y,
		type: mode,
		value: existing?.value ?? '',
		last_modified: new Date().toISOString()
	};
	if (mode === 'FORMULA') cell.formula_code = code;
	else if (mode === 'JAVASCRIPT') cell.javascript_code = code;
	else cell.python_code = code;
	sheetController.startTransaction();
	await updateCellAndDCells({ starting_cells: [cell], sheetController });
	sheetController.endTransaction();
}

export async function deleteCellsInRect(
	x0: number,
	y0: number,
	x1: number,
	y1: number
): Promise<void> {
	const cells = sheetController.sheet.getCellsInRect({ left: x0, top: y0, right: x1, bottom: y1 });
	if (cells.length === 0) return;
	sheetController.startTransaction();
	await updateCellAndDCells({
		starting_cells: cells,
		sheetController,
		delete_starting_cells: true
	});
	sheetController.endTransaction();
}

export function undo(): void {
	sheetController.undo();
	sheetController.sheet.rebuildDependencies();
}

export function redo(): void {
	sheetController.redo();
	sheetController.sheet.rebuildDependencies();
}

// ------------------------------------------------------------------ formatting

function forEachSelectedCell(fn: (x: number, y: number) => void): void {
	const { x0, y0, x1, y1 } = getSelectionRect();
	for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) fn(x, y);
}

export function setFormat(update: Partial<CellFormat>): void {
	sheetController.startTransaction();
	forEachSelectedCell((x, y) => {
		const existing = sheetController.sheet.getFormat(x, y) ?? { x, y };
		sheetController.execute({ type: 'setFormat', x, y, format: { ...existing, ...update, x, y } });
	});
	sheetController.endTransaction();
}

export function getCursorFormat(): CellFormat | undefined {
	return sheetController.sheet.getFormat(app.cursorPosition.x, app.cursorPosition.y);
}

export function toggleBold(): void {
	setFormat({ bold: !(getCursorFormat()?.bold === true) });
}

export function toggleItalic(): void {
	setFormat({ italic: !(getCursorFormat()?.italic === true) });
}

export function setAlignment(alignment: CellAlignment | undefined): void {
	setFormat({ alignment });
}

export function setTextFormat(textFormat: CellTextFormat | undefined): void {
	sheetController.startTransaction();
	forEachSelectedCell((x, y) => {
		const existing = sheetController.sheet.getFormat(x, y) ?? { x, y };
		const format = { ...existing, x, y };
		if (textFormat === undefined) delete (format as CellFormat).textFormat;
		else format.textFormat = textFormat;
		sheetController.execute({ type: 'setFormat', x, y, format });
	});
	sheetController.endTransaction();
}

export function changeDecimals(delta: number): void {
	sheetController.startTransaction();
	forEachSelectedCell((x, y) => {
		const existing = sheetController.sheet.getFormat(x, y);
		const tf = existing?.textFormat ?? { type: 'NUMBER' as const, decimalPlaces: 2 };
		const decimals = Math.max(0, (tf.decimalPlaces ?? 2) + delta);
		sheetController.execute({
			type: 'setFormat',
			x,
			y,
			format: { ...(existing ?? { x, y }), x, y, textFormat: { ...tf, decimalPlaces: decimals } }
		});
	});
	sheetController.endTransaction();
}

export function clearFormatting(): void {
	sheetController.startTransaction();
	forEachSelectedCell((x, y) => {
		sheetController.execute({ type: 'setFormat', x, y, format: undefined });
	});
	sheetController.endTransaction();
}

// ------------------------------------------------------------------ clipboard

export async function copySelection(cut = false): Promise<void> {
	const { x0, y0, x1, y1 } = getSelectionRect();
	const sheet = sheetController.sheet;
	const lines: string[] = [];
	for (let y = y0; y <= y1; y++) {
		const parts: string[] = [];
		for (let x = x0; x <= x1; x++) parts.push(sheet.getCell(x, y)?.value ?? '');
		lines.push(parts.join('\t'));
	}
	try {
		await navigator.clipboard.writeText(lines.join('\n'));
	} catch {
		// clipboard permission denied; ignore
	}
	if (cut) await deleteCellsInRect(x0, y0, x1, y1);
}

export async function pasteFromClipboard(): Promise<void> {
	let text = '';
	try {
		text = await navigator.clipboard.readText();
	} catch {
		return;
	}
	if (!text) return;
	const rows = text.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n');
	const { x, y } = app.cursorPosition;
	const cells: Cell[] = [];
	rows.forEach((line, dy) => {
		line.split('\t').forEach((v, dx) => {
			if (v !== '')
				cells.push({
					x: x + dx,
					y: y + dy,
					type: 'TEXT',
					value: v,
					last_modified: new Date().toISOString()
				});
		});
	});
	if (cells.length === 0) return;
	sheetController.startTransaction();
	await updateCellAndDCells({ starting_cells: cells, sheetController });
	sheetController.endTransaction();
}

// ------------------------------------------------------------------ zoom / viewport

export function screenToWorld(sx: number, sy: number): { x: number; y: number } {
	return { x: app.viewport.x + sx / app.viewport.scale, y: app.viewport.y + sy / app.viewport.scale };
}

export function worldToScreen(wx: number, wy: number): { x: number; y: number } {
	return {
		x: (wx - app.viewport.x) * app.viewport.scale,
		y: (wy - app.viewport.y) * app.viewport.scale
	};
}

export function setZoom(scale: number, centerScreen?: { x: number; y: number }): void {
	const clamped = Math.min(10, Math.max(0.1, scale));
	const canvas = document.querySelector<HTMLCanvasElement>('canvas.grid-canvas');
	const center = centerScreen ?? {
		x: (canvas?.clientWidth ?? window.innerWidth) / 2,
		y: (canvas?.clientHeight ?? window.innerHeight) / 2
	};
	const world = screenToWorld(center.x, center.y);
	app.viewport = {
		scale: clamped,
		x: world.x - center.x / clamped,
		y: world.y - center.y / clamped
	};
}

export function zoomIn(): void {
	setZoom(app.viewport.scale * 2);
}
export function zoomOut(): void {
	setZoom(app.viewport.scale * 0.5);
}
export function zoomTo100(): void {
	setZoom(1);
}

export function zoomToRect(x0: number, y0: number, x1: number, y1: number): void {
	const offsets = sheetController.sheet.gridOffsets;
	const left = offsets.getColumnX(x0);
	const top = offsets.getRowY(y0);
	const right = offsets.getColumnX(x1) + offsets.getColumnWidth(x1);
	const bottom = offsets.getRowY(y1) + offsets.getRowHeight(y1);
	const canvas = document.querySelector<HTMLCanvasElement>('canvas.grid-canvas');
	const cw = canvas?.clientWidth ?? window.innerWidth;
	const ch = canvas?.clientHeight ?? window.innerHeight;
	const buffer = 1.2;
	const scale = Math.min(2, Math.min(cw / ((right - left) * buffer), ch / ((bottom - top) * buffer)));
	const cx = (left + right) / 2;
	const cy = (top + bottom) / 2;
	app.viewport = { scale, x: cx - cw / 2 / scale, y: cy - ch / 2 / scale };
}

export function zoomToFit(): void {
	const bounds = sheetController.sheet.getBounds();
	if (!bounds) {
		zoomTo100();
		return;
	}
	zoomToRect(bounds.left, bounds.top, bounds.right, bounds.bottom);
}

export function zoomToSelection(): void {
	const { x0, y0, x1, y1 } = getSelectionRect();
	zoomToRect(x0, y0, x1, y1);
}

/** Move the cursor and scroll it into view (re-centering only if offscreen). */
export function gotoCell(x: number, y: number, range?: { x1: number; y1: number }): void {
	app.cursorPosition = { x, y };
	app.keyboardMovePosition = { x, y };
	if (range) {
		app.multiCursor = {
			originPosition: { x: Math.min(x, range.x1), y: Math.min(y, range.y1) },
			terminalPosition: { x: Math.max(x, range.x1), y: Math.max(y, range.y1) }
		};
	} else {
		app.multiCursor = undefined;
	}
	ensureCursorVisible();
}

export function ensureCursorVisible(): void {
	const offsets = sheetController.sheet.gridOffsets;
	const { x, y } = app.cursorPosition;
	const rect = offsets.getCellRect(x, y);
	const canvas = document.querySelector<HTMLCanvasElement>('canvas.grid-canvas');
	const cw = (canvas?.clientWidth ?? window.innerWidth) / app.viewport.scale;
	const ch = (canvas?.clientHeight ?? window.innerHeight) / app.viewport.scale;
	const headingWorld = HEADING_SIZE / app.viewport.scale;
	let { x: vx, y: vy } = app.viewport;
	if (rect.x < vx + headingWorld) vx = rect.x - headingWorld - 2;
	else if (rect.x + rect.w > vx + cw) vx = rect.x + rect.w - cw + 2;
	if (rect.y < vy + headingWorld) vy = rect.y - headingWorld - 2;
	else if (rect.y + rect.h > vy + ch) vy = rect.y + rect.h - ch + 2;
	if (vx !== app.viewport.x || vy !== app.viewport.y)
		app.viewport = { ...app.viewport, x: vx, y: vy };
}

// ------------------------------------------------------------------ sheets

export function switchSheet(index: number): void {
	sheetController.switchSheet(index);
	app.multiCursor = undefined;
}

export function switchSheetRelative(delta: number): void {
	const n = sheetController.sheets.length;
	if (n < 2) return;
	switchSheet((sheetController.currentSheetIndex + delta + n) % n);
}

// ------------------------------------------------------------------ insert

/** Opens the code editor at the cursor in the given language. */
export function openCodeEditorAt(mode: EditorMode): void {
	app.editorCell = { ...app.cursorPosition };
	app.editorMode = mode;
	app.showCellTypeMenu = false;
	app.showCodeEditor = true;
}

/** Writes today's date (optionally with time) into the current cell. */
export async function insertTodayDate(withTime = false): Promise<void> {
	const now = new Date();
	const pad = (n: number) => String(n).padStart(2, '0');
	const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
	const value = withTime
		? `${date} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
		: date;
	await commitCellValue(app.cursorPosition.x, app.cursorPosition.y, value);
}

export function addSheet(): void {
	sheetController.addSheet();
	app.multiCursor = undefined;
}

export function duplicateCurrentSheet(): void {
	sheetController.duplicateSheet(sheetController.currentSheetIndex);
	app.multiCursor = undefined;
}

export function deleteCurrentSheet(): void {
	sheetController.deleteSheet(sheetController.currentSheetIndex);
	app.multiCursor = undefined;
}

// ------------------------------------------------------- rows and columns

/** Shifts every cell/format/size at or beyond `at` along an axis by `delta`.
 * Code cells are NOT re-run (re-running could regenerate random data or
 * re-spill over the sheet); their spill/dependency metadata is shifted so
 * the graph stays consistent. Formula A1 text is rewritten via the Rust
 * core's adjust_formula; Python/JS reference strings are not. */
async function shiftAxis(axis: 'x' | 'y', at: number, delta: number): Promise<void> {
	const sheet = sheetController.sheet;
	const desc = delta > 0;
	const hasFormulas = sheet.getAllCells().some((c) => c.type === 'FORMULA');
	const { adjustFormula } = hasFormulas
		? await import('./formulas/runFormula')
		: { adjustFormula: undefined };

	const shiftPair = ([px, py]: [number, number]): [number, number] =>
		axis === 'x' ? [px >= at ? px + delta : px, py] : [px, py >= at ? py + delta : py];
	const pairsEqual = (a: [number, number][] | undefined, b: [number, number][] | undefined) =>
		JSON.stringify(a) === JSON.stringify(b);

	const cells = sheet
		.getAllCells()
		.sort((a, b) => (desc ? b[axis] - a[axis] : a[axis] - b[axis]));
	for (const cell of cells) {
		const movedCoord = cell[axis] >= at;
		const array_cells = cell.array_cells?.map(shiftPair);
		const cells_accessed = cell.evaluation_result?.cells_accessed?.map(shiftPair);
		// formulas follow the shift: their A1 text is rewritten by the core
		let formula_code = cell.formula_code;
		if (cell.type === 'FORMULA' && formula_code && adjustFormula) {
			formula_code = await adjustFormula(formula_code, cell, axis, at, delta);
		}
		const metaChanged =
			!pairsEqual(array_cells, cell.array_cells) ||
			!pairsEqual(cells_accessed, cell.evaluation_result?.cells_accessed) ||
			formula_code !== cell.formula_code;
		if (!movedCoord && !metaChanged) continue;

		const moved = { ...cell, [axis]: movedCoord ? cell[axis] + delta : cell[axis] };
		if (array_cells) moved.array_cells = array_cells;
		if (formula_code !== undefined) moved.formula_code = formula_code;
		if (cell.evaluation_result && cells_accessed) {
			moved.evaluation_result = { ...cell.evaluation_result, cells_accessed };
		}
		sheetController.execute({ type: 'setCell', x: cell.x, y: cell.y, cell: undefined });
		sheetController.execute({ type: 'setCell', x: moved.x, y: moved.y, cell: moved });
	}

	const formats = sheet
		.getAllFormats()
		.filter((f) => f[axis] >= at)
		.sort((a, b) => (desc ? b[axis] - a[axis] : a[axis] - b[axis]));
	for (const format of formats) {
		sheetController.execute({ type: 'setFormat', x: format.x, y: format.y, format: undefined });
		const moved = { ...format, [axis]: format[axis] + delta };
		sheetController.execute({ type: 'setFormat', x: moved.x, y: moved.y, format: moved });
	}

	const kind = axis === 'x' ? ('column' as const) : ('row' as const);
	const headings =
		axis === 'x' ? sheet.gridOffsets.exportColumns() : sheet.gridOffsets.exportRows();
	const affected = headings
		.filter((h) => h.id >= at)
		.sort((a, b) => (desc ? b.id - a.id : a.id - b.id));
	for (const h of affected) {
		sheetController.execute({ type: 'setHeading', kind, id: h.id, size: undefined });
		sheetController.execute({ type: 'setHeading', kind, id: h.id + delta, size: h.size });
	}

	sheet.rebuildDependencies();
}

export async function insertColumn(at: number): Promise<void> {
	sheetController.startTransaction();
	await shiftAxis('x', at, 1);
	sheetController.endTransaction();
}

export async function insertRow(at: number): Promise<void> {
	sheetController.startTransaction();
	await shiftAxis('y', at, 1);
	sheetController.endTransaction();
}

export async function deleteColumns(x0: number, x1: number): Promise<void> {
	const sheet = sheetController.sheet;
	sheetController.startTransaction();
	// plain deletion — like insert, no code re-runs (see shiftAxis)
	for (const cell of sheet.getAllCells().filter((c) => c.x >= x0 && c.x <= x1)) {
		sheetController.execute({ type: 'setCell', x: cell.x, y: cell.y, cell: undefined });
	}
	for (const f of sheet.getAllFormats().filter((f) => f.x >= x0 && f.x <= x1)) {
		sheetController.execute({ type: 'setFormat', x: f.x, y: f.y, format: undefined });
	}
	await shiftAxis('x', x1 + 1, -(x1 - x0 + 1));
	sheetController.endTransaction();
}

export async function deleteRows(y0: number, y1: number): Promise<void> {
	const sheet = sheetController.sheet;
	sheetController.startTransaction();
	for (const cell of sheet.getAllCells().filter((c) => c.y >= y0 && c.y <= y1)) {
		sheetController.execute({ type: 'setCell', x: cell.x, y: cell.y, cell: undefined });
	}
	for (const f of sheet.getAllFormats().filter((f) => f.y >= y0 && f.y <= y1)) {
		sheetController.execute({ type: 'setFormat', x: f.x, y: f.y, format: undefined });
	}
	await shiftAxis('y', y1 + 1, -(y1 - y0 + 1));
	sheetController.endTransaction();
}

// ------------------------------------------------------------------ export

/** Set by GridCanvas so actions can reach the renderer (PNG export). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const pixiRef: { current?: any } = {};

/** Copies the current selection to the clipboard as a PNG image. */
export async function copySelectionAsPng(): Promise<void> {
	const grid = pixiRef.current;
	if (!grid) return;
	const { x0, y0, x1, y1 } = getSelectionRect();
	const offsets = sheetController.sheet.gridOffsets;
	const left = offsets.getColumnX(x0);
	const top = offsets.getRowY(y0);
	const right = offsets.getColumnX(x1) + offsets.getColumnWidth(x1);
	const bottom = offsets.getRowY(y1) + offsets.getRowHeight(y1);
	const blob: Blob | null = await grid.extractPng(left, top, right - left, bottom - top);
	if (!blob) return;
	try {
		await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
	} catch {
		// clipboard image write unsupported; fall back to downloading
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${app.filename} selection.png`;
		a.click();
		URL.revokeObjectURL(url);
	}
}

/** Downloads the current selection (or the whole sheet) as a CSV file. */
export function downloadSelectionAsCsv(): void {
	const sheet = sheetController.sheet;
	let { x0, y0, x1, y1 } = getSelectionRect();
	if (!app.multiCursor) {
		const bounds = sheet.getBounds();
		if (bounds) ({ left: x0, top: y0, right: x1, bottom: y1 } = bounds);
	}
	const rows: string[] = [];
	for (let y = y0; y <= y1; y++) {
		const fields: string[] = [];
		for (let x = x0; x <= x1; x++) {
			const value = sheet.getCell(x, y)?.value ?? '';
			fields.push(/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);
		}
		rows.push(fields.join(','));
	}
	const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `${app.filename}.csv`;
	a.click();
	URL.revokeObjectURL(url);
}

/** Re-runs every code cell on the current sheet. */
export async function rerunAllCode(): Promise<void> {
	const codeCells = sheetController.sheet.getAllCells().filter((c) => isCodeCellType(c.type));
	if (codeCells.length === 0) return;
	sheetController.startTransaction();
	await updateCellAndDCells({ starting_cells: codeCells, sheetController });
	sheetController.endTransaction();
}

/** Re-runs the code cell under the cursor. */
export async function rerunCurrentCell(): Promise<void> {
	const cell = sheetController.sheet.getCell(app.cursorPosition.x, app.cursorPosition.y);
	if (!cell || !isCodeCellType(cell.type)) return;
	sheetController.startTransaction();
	await updateCellAndDCells({ starting_cells: [cell], sheetController });
	sheetController.endTransaction();
}

// ------------------------------------------------------------------ files

export function newFile(): void {
	sheetController.sheets = [new Sheet()];
	sheetController.currentSheetIndex = 0;
	app.filename = DEFAULT_FILE_NAME;
	app.fileId = crypto.randomUUID();
	app.cursorPosition = { x: 0, y: 0 };
	app.multiCursor = undefined;
	app.viewport = { x: -HEADING_SIZE - 2, y: -HEADING_SIZE - 2, scale: 1 };
	sheetController.onChange();
}

export function saveFile(): void {
	downloadGridFile(exportGridFile(sheetController, app.filename, app.fileId));
}

export function openFileFromJSON(json: string, name?: string): void {
	const parsed = JSON.parse(json);
	importGridFile(sheetController, parsed);
	app.filename = name?.replace(/\.grid$/, '') ?? parsed.filename ?? DEFAULT_FILE_NAME;
	app.fileId = parsed.id ?? crypto.randomUUID();
	app.cursorPosition = { x: 0, y: 0 };
	app.multiCursor = undefined;
	sheetController.onChange();
	zoomToFit();
}

export async function importCSVAt(text: string, at: Coordinate): Promise<void> {
	const rows = parseCSV(text);
	const cells: Cell[] = [];
	rows.forEach((row, dy) => {
		row.forEach((v, dx) => {
			if (v !== '')
				cells.push({
					x: at.x + dx,
					y: at.y + dy,
					type: 'TEXT',
					value: v,
					last_modified: new Date().toISOString()
				});
		});
	});
	if (cells.length === 0) return;
	sheetController.startTransaction();
	await updateCellAndDCells({ starting_cells: cells, sheetController });
	sheetController.endTransaction();
}

export async function loadInitialFile(): Promise<void> {
	const saved = await loadCurrentFile();
	if (saved) {
		try {
			importGridFile(sheetController, saved);
			app.filename = saved.filename ?? DEFAULT_FILE_NAME;
			app.fileId = saved.id ?? crypto.randomUUID();
			app.markDirty();
			return;
		} catch {
			// fall through to example content
		}
	}
	seedExampleContent();
}

function seedExampleContent(): void {
	const now = new Date().toISOString();
	const cells: Cell[] = [];
	const put = (x: number, y: number, value: string) =>
		cells.push({ x, y, type: 'TEXT', value, last_modified: now });
	put(0, 0, 'Welcome to Quadratic Svelte!');
	put(0, 2, 'Item');
	put(1, 2, 'Q1');
	put(2, 2, 'Q2');
	put(3, 2, 'Total');
	const data: [string, number, number][] = [
		['Apples', 34, 41],
		['Oranges', 28, 33],
		['Pears', 19, 25]
	];
	data.forEach(([name, q1, q2], i) => {
		put(0, 3 + i, name);
		put(1, 3 + i, String(q1));
		put(2, 3 + i, String(q2));
	});
	sheetController.startTransaction();
	void (async () => {
		await updateCellAndDCells({ starting_cells: cells, sheetController });
		const formulas: Cell[] = [
			{ x: 3, y: 3, type: 'FORMULA', value: '', formula_code: 'SUM(B3:C3)', last_modified: now },
			{ x: 3, y: 4, type: 'FORMULA', value: '', formula_code: 'SUM(B4:C4)', last_modified: now },
			{ x: 3, y: 5, type: 'FORMULA', value: '', formula_code: 'SUM(B5:C5)', last_modified: now },
			{ x: 1, y: 6, type: 'FORMULA', value: '', formula_code: 'SUM(B3:B5)', last_modified: now },
			{ x: 2, y: 6, type: 'FORMULA', value: '', formula_code: 'SUM(C3:C5)', last_modified: now },
			{ x: 3, y: 6, type: 'FORMULA', value: '', formula_code: 'SUM(D3:D5)', last_modified: now }
		];
		await updateCellAndDCells({ starting_cells: formulas, sheetController });
		sheetController.execute({
			type: 'setCell',
			x: 0,
			y: 6,
			cell: { x: 0, y: 6, type: 'TEXT', value: 'Total', last_modified: now }
		});
		sheetController.endTransaction();
	})();
	for (let x = 0; x <= 3; x++) {
		sheetController.execute({ type: 'setFormat', x, y: 2, format: { x, y: 2, bold: true } });
	}
}

export const constants = { CELL_WIDTH, CELL_HEIGHT, HEADING_SIZE };
export type { Cell, CellFormat, CellType, Coordinate };
