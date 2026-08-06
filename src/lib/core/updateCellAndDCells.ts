import type { SheetController } from './SheetController';
import { coordKey, isCodeCellType, type ArrayOutput, type Cell } from './types';

// Port of Quadratic's updateCellAndDCells: writes/deletes the starting cells,
// evaluates code cells, spills array output, and recomputes dependent cells
// transitively via the dependency graph. The queue carries a sheet index so
// cross-sheet formula dependents recompute against their own sheet.

export interface UpdateCellsOptions {
	starting_cells: Cell[];
	sheetController: SheetController;
	delete_starting_cells?: boolean;
}

interface QueueItem {
	sheetIndex: number;
	x: number;
	y: number;
}

const MAX_UPDATES_PER_CELL = 25; // circular-reference guard

function itemKey(item: QueueItem): string {
	return `${item.sheetIndex}:${coordKey(item.x, item.y)}`;
}

export async function updateCellAndDCells(options: UpdateCellsOptions): Promise<void> {
	const { starting_cells, sheetController: sc, delete_starting_cells } = options;
	const sheet = sc.sheet;
	const startSheetIndex = sc.currentSheetIndex;

	const queue: QueueItem[] = [];
	const updateCounts = new Map<string, number>();
	const startingKeys = new Set(
		starting_cells.map((c) => `${startSheetIndex}:${coordKey(c.x, c.y)}`)
	);

	for (const cell of starting_cells) {
		if (delete_starting_cells) {
			const existing = sheet.getCell(cell.x, cell.y);
			if (existing) {
				deleteArrayCells(existing, sc, startSheetIndex, queue);
				sc.execute({
					type: 'setCell',
					x: cell.x,
					y: cell.y,
					cell: undefined,
					sheetIndex: startSheetIndex
				});
				sheet.setDependencies({ x: cell.x, y: cell.y }, []);
				sc.setCrossSheetDeps({ sheetIndex: startSheetIndex, x: cell.x, y: cell.y }, []);
			}
		} else {
			sc.execute({ type: 'setCell', x: cell.x, y: cell.y, cell, sheetIndex: startSheetIndex });
		}
		queue.push({ sheetIndex: startSheetIndex, x: cell.x, y: cell.y });
	}

	while (queue.length > 0) {
		const item = queue.shift()!;
		const key = itemKey(item);
		const count = (updateCounts.get(key) ?? 0) + 1;
		if (count > MAX_UPDATES_PER_CELL) continue; // circular reference; stop propagating
		updateCounts.set(key, count);

		const itemSheet = sc.sheets[item.sheetIndex];
		if (!itemSheet) continue;
		const cell = itemSheet.getCell(item.x, item.y);

		if (cell && isCodeCellType(cell.type)) {
			await computeCell(cell, sc, item.sheetIndex, queue);
		} else if (cell && startingKeys.has(key) && cell.type === 'TEXT') {
			// plain text write; nothing to compute
		}

		// propagate to same-sheet dependents, then to cross-sheet formula
		// dependents registered against this sheet's name
		for (const dep of itemSheet.getDependents(item.x, item.y)) {
			queue.push({ sheetIndex: item.sheetIndex, ...dep });
		}
		for (const dep of sc.getCrossSheetDependents(itemSheet.name, item.x, item.y)) {
			queue.push(dep);
		}
	}
}

async function computeCell(
	cell: Cell,
	sc: SheetController,
	sheetIndex: number,
	queue: QueueItem[]
): Promise<void> {
	const sheet = sc.sheets[sheetIndex];
	const getCellValue = (x: number, y: number) => sheet.getCell(x, y)?.value;

	let success: boolean;
	let displayValue: string;
	let arrayOutput: ArrayOutput | undefined;
	let cellsAccessed: [number, number][] = [];
	let stdOut: string | undefined;
	let stdErr: string | undefined;
	let errorSpan: [number, number] | null = null;

	if (cell.type === 'FORMULA') {
		// Rust/WASM quadratic-core engine, lazy-loaded on first evaluation.
		// Sheet-qualified refs are resolved here (the engine is sheet-unaware)
		// and registered in the controller's cross-sheet dependency graph.
		const { runFormula } = await import('../formulas/runFormula');
		const { substituteSheetRefs } = await import('../formulas/sheetRefs');
		const { code, refs } = substituteSheetRefs(cell.formula_code ?? '', (name) =>
			sc.sheets.find((s) => s.name === name)
		);
		sc.setCrossSheetDeps({ sheetIndex, x: cell.x, y: cell.y }, refs);
		const result = await runFormula(code, { x: cell.x, y: cell.y }, getCellValue);
		success = result.success;
		displayValue = result.success ? (result.output_value ?? '') : '';
		arrayOutput = result.array_output ?? undefined;
		cellsAccessed = result.cells_accessed;
		stdErr = result.error_msg ?? undefined;
		errorSpan = result.error_span;
	} else if (cell.type === 'JAVASCRIPT') {
		const { runJavascript } = await import('../javascript/javascriptRunner');
		const result = await runJavascript(
			cell.javascript_code ?? '',
			{ x: cell.x, y: cell.y },
			getCellValue
		);
		success = result.success;
		displayValue = result.output_value ?? '';
		arrayOutput = result.array_output ?? undefined;
		cellsAccessed = result.cells_accessed;
		stdOut = result.std_out;
		stdErr = result.std_err;
	} else {
		// PYTHON — lazy import keeps pyodide machinery out of the base flow
		const { runPython } = await import('../python/pythonRunner');
		const result = await runPython(cell.python_code ?? '', getCellValue);
		success = result.success;
		displayValue = result.output_value ?? '';
		arrayOutput = result.array_output ?? undefined;
		cellsAccessed = result.cells_accessed;
		stdOut = result.std_out;
		stdErr = result.std_err;
	}

	// -------- spill array output --------
	const oldArrayCells = (cell.array_cells ?? []).filter(
		([x, y]) => !(x === cell.x && y === cell.y)
	);
	const newArrayCells: [number, number][] = [];
	let originValue = displayValue;

	if (success && arrayOutput && arrayOutput.length > 0) {
		const rows2d: (string | number | boolean | null | undefined)[][] = Array.isArray(
			arrayOutput[0]
		)
			? (arrayOutput as (string | number | boolean)[][])
			: (arrayOutput as (string | number | boolean)[]).map((v) => [v]);

		let first = true;
		for (let dy = 0; dy < rows2d.length; dy++) {
			const row = rows2d[dy];
			for (let dx = 0; dx < row.length; dx++) {
				const v = row[dx];
				if (v === null || v === undefined) continue;
				const x = cell.x + dx;
				const y = cell.y + dy;
				if (first && dx === 0 && dy === 0) {
					originValue = String(v);
					first = false;
					newArrayCells.push([x, y]);
					continue;
				}
				newArrayCells.push([x, y]);
				sc.execute({
					type: 'setCell',
					x,
					y,
					cell: {
						x,
						y,
						type: 'COMPUTED',
						value: String(v),
						last_modified: new Date().toISOString()
					},
					sheetIndex
				});
				queue.push({ sheetIndex, x, y });
			}
		}
	}

	// delete stale spilled cells no longer produced
	const newKeys = new Set(newArrayCells.map(([x, y]) => coordKey(x, y)));
	for (const [x, y] of oldArrayCells) {
		if (!newKeys.has(coordKey(x, y))) {
			const existing = sheet.getCell(x, y);
			if (existing?.type === 'COMPUTED') {
				sc.execute({ type: 'setCell', x, y, cell: undefined, sheetIndex });
				queue.push({ sheetIndex, x, y });
			}
		}
	}

	const updated: Cell = {
		...cell,
		value: success ? originValue : '',
		array_cells: newArrayCells.length > 0 ? newArrayCells : undefined,
		evaluation_result: {
			success,
			std_out: stdOut,
			std_err: stdErr,
			output_value: success ? originValue : null,
			cells_accessed: cellsAccessed,
			array_output: arrayOutput,
			error_span: errorSpan
		},
		last_modified: new Date().toISOString()
	};
	sc.execute({ type: 'setCell', x: cell.x, y: cell.y, cell: updated, sheetIndex });

	sheet.setDependencies(
		{ x: cell.x, y: cell.y },
		cellsAccessed.map(([x, y]) => ({ x, y }))
	);
}

function deleteArrayCells(
	cell: Cell,
	sc: SheetController,
	sheetIndex: number,
	queue: QueueItem[]
): void {
	const sheet = sc.sheets[sheetIndex];
	for (const [x, y] of cell.array_cells ?? []) {
		if (x === cell.x && y === cell.y) continue;
		const existing = sheet.getCell(x, y);
		if (existing?.type === 'COMPUTED') {
			sc.execute({ type: 'setCell', x, y, cell: undefined, sheetIndex });
			queue.push({ sheetIndex, x, y });
		}
	}
}
