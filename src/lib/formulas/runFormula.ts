// Glue to the Rust/WASM formula engine (quadratic-core), port of the
// original's src/grid/computations/formulas/runFormula.ts.

import init, {
	adjust_formula,
	eval_formula,
	formula_docs,
	hello
} from '../../../quadratic-core/pkg/quadratic_core.js';
import wasmUrl from '../../../quadratic-core/pkg/quadratic_core_bg.wasm?url';

export interface FormulaDoc {
	category: string;
	name: string;
	usages: string[];
	examples: string[];
	doc: string;
}

export interface RunFormulaResult {
	cells_accessed: [number, number][];
	success: boolean;
	error_span: [number, number] | null;
	error_msg: string | null;
	output_value: string | null;
	array_output: string[][] | null;
}

let initPromise: Promise<void> | undefined;

export function loadFormulaCore(): Promise<void> {
	if (!initPromise) {
		// explicit asset URL so Vite serves/bundles the wasm in dev and build
		initPromise = init({ module_or_path: wasmUrl }).then(() => hello());
	}
	return initPromise;
}

/** Rewrites A1 refs in a formula after a row/column shift (Rust core). */
export async function adjustFormula(
	code: string,
	cell: { x: number; y: number },
	axis: 'x' | 'y',
	at: number,
	delta: number
): Promise<string> {
	await loadFormulaCore();
	return adjust_formula(code, cell.x, cell.y, axis === 'x', at, delta);
}

let docsCache: FormulaDoc[] | undefined;

/** Documentation for every formula function, from the Rust core. */
export async function getFormulaDocs(): Promise<FormulaDoc[]> {
	if (!docsCache) {
		await loadFormulaCore();
		docsCache = formula_docs() as FormulaDoc[];
	}
	return docsCache;
}

export async function runFormula(
	formula_code: string,
	pos: { x: number; y: number },
	getCellValue: (x: number, y: number) => string | undefined
): Promise<RunFormulaResult> {
	await loadFormulaCore();

	// Same contract as the original's GetCellsDB: an async rect accessor
	// returning the existing cells with their values. The core awaits it and
	// reads `[0].value`; an empty array means the cell is empty.
	const gridAccessor = async (x0: number, y0: number, x1: number, y1: number) => {
		const cells: { x: number; y: number; value: string }[] = [];
		for (let y = y0; y <= y1; y++) {
			for (let x = x0; x <= x1; x++) {
				const value = getCellValue(x, y);
				if (value !== undefined && value !== '') cells.push({ x, y, value });
			}
		}
		return cells;
	};

	const output = await eval_formula(formula_code, pos.x, pos.y, gridAccessor);
	return output as RunFormulaResult;
}
