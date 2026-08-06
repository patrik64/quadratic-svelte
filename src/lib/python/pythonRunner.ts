import { writable } from 'svelte/store';
import type { ArrayOutput } from '../core/types';

// Pyodide-backed Python cells, mirroring quadratic's run_python.py API:
// getCell/c/cell, getCells((x0,y0),(x1,y1)) -> pandas DataFrame, cells[...],
// last expression (or assignment) is the cell's output.

export interface PythonRunResult {
	success: boolean;
	output_value: string | null;
	array_output?: ArrayOutput | null;
	cells_accessed: [number, number][];
	std_out?: string;
	std_err?: string;
}

export interface PythonStatus {
	state: 'idle' | 'loading' | 'ready' | 'error';
	version?: string;
	error?: string;
}

export const pythonStatus = writable<PythonStatus>({ state: 'idle' });

const PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.mjs';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Pyodide = any;

let loadPromise: Promise<Pyodide> | undefined;

// set per run so the GetCellsDB JS module reads from the live sheet
let currentGetCellValue: (x: number, y: number) => string | undefined = () => undefined;
let currentAccessed: [number, number][] = [];

function coerce(raw: string | undefined): string | number | boolean | null {
	if (raw === undefined || raw === '') return null;
	const n = Number(raw);
	if (!Number.isNaN(n) && raw.trim() !== '') return n;
	if (raw === 'TRUE' || raw === 'True' || raw === 'true') return true;
	if (raw === 'FALSE' || raw === 'False' || raw === 'false') return false;
	return raw;
}

const PRELUDE = `
import re as _re
import GetCellsDB

async def getCell(x, y):
    return GetCellsDB.getCellValue(x, y)

c = getCell
cell = getCell

async def getCells(p0, p1, first_row_header=False):
    import pandas as pd
    data = GetCellsDB.getRect(p0[0], p0[1], p1[0], p1[1]).to_py()
    df = pd.DataFrame(data)
    if first_row_header and len(df) > 0:
        df.columns = df.iloc[0]
        df = df.drop(df.index[0]).reset_index(drop=True)
    return df

class _Cells:
    def __call__(self, p0, p1, first_row_header=False):
        return getCells(p0, p1, first_row_header)
    def __getitem__(self, key):
        if isinstance(key, tuple) and len(key) == 2:
            r, col = key
            if isinstance(r, int) and isinstance(col, int):
                return getCell(r, col)
            r0 = r.start if isinstance(r, slice) else r
            r1 = (r.stop - 1) if isinstance(r, slice) else r
            c0 = col.start if isinstance(col, slice) else col
            c1 = (col.stop - 1) if isinstance(col, slice) else col
            return getCells((r0, c0), (r1, c1))
        raise IndexError('use cells[x, y] or cells[x0:x1, y0:y1]')

cells = _Cells()

def _sanitize(v):
    import math
    if v is None:
        return None
    if isinstance(v, float):
        if math.isnan(v) or math.isinf(v):
            return None
        return v
    if isinstance(v, (int, str, bool)):
        return v
    return str(v)

async def _quadratic_run(code):
    import io, json, traceback
    from contextlib import redirect_stdout
    import pyodide.code

    # allow synchronous-looking use of the async-free API (kept for parity)
    code = _re.sub(r'\\bawait await\\b', 'await', code)

    out = io.StringIO()
    try:
        with redirect_stdout(out):
            value = await pyodide.code.eval_code_async(
                code,
                globals=globals(),
                return_mode='last_expr_or_assign',
                quiet_trailing_semicolon=False,
            )
    except Exception:
        return json.dumps({
            'success': False,
            'output_value': None,
            'array_output': None,
            'std_out': out.getvalue(),
            'std_err': traceback.format_exc(),
        })

    array_output = None
    output_value = None
    try:
        import pandas as pd
        import numpy as np
        if isinstance(value, pd.DataFrame):
            vals = [[_sanitize(v) for v in row] for row in value.values.tolist()]
            if not isinstance(value.columns, pd.RangeIndex):
                vals = [[_sanitize(v) for v in value.columns.tolist()]] + vals
            array_output = vals
            value = None
        elif isinstance(value, pd.Series):
            array_output = [_sanitize(v) for v in value.to_numpy().tolist()]
            value = None
        elif isinstance(value, np.ndarray):
            array_output = [[_sanitize(v) for v in row] for row in value.tolist()] if value.ndim > 1 else [_sanitize(v) for v in value.tolist()]
            value = None
    except ModuleNotFoundError:
        pass

    if array_output is None and isinstance(value, (list, tuple)):
        array_output = [
            [_sanitize(v) for v in row] if isinstance(row, (list, tuple)) else _sanitize(row)
            for row in value
        ]
        value = None

    if value is not None:
        if isinstance(value, bool):
            output_value = 'TRUE' if value else 'FALSE'
        else:
            output_value = str(value)

    return json.dumps({
        'success': True,
        'output_value': output_value,
        'array_output': array_output,
        'std_out': out.getvalue(),
        'std_err': None,
    })
`;

async function loadPython(): Promise<Pyodide> {
	if (loadPromise) return loadPromise;
	loadPromise = (async () => {
		pythonStatus.set({ state: 'loading' });
		try {
			const { loadPyodide } = await import(/* @vite-ignore */ PYODIDE_URL);
			const py = await loadPyodide();
			py.registerJsModule('GetCellsDB', {
				getCellValue: (x: number, y: number) => {
					currentAccessed.push([x, y]);
					return coerce(currentGetCellValue(x, y));
				},
				getRect: (x0: number, y0: number, x1: number, y1: number) => {
					const rows: (string | number | boolean | null)[][] = [];
					for (let y = y0; y <= y1; y++) {
						const row: (string | number | boolean | null)[] = [];
						for (let x = x0; x <= x1; x++) {
							currentAccessed.push([x, y]);
							row.push(coerce(currentGetCellValue(x, y)));
						}
						rows.push(row);
					}
					return rows;
				}
			});
			await py.loadPackage(['numpy', 'pandas', 'micropip']);
			await py.runPythonAsync(PRELUDE);
			const version = py.runPython('import sys; sys.version.split()[0]') as string;
			pythonStatus.set({ state: 'ready', version });
			return py;
		} catch (e) {
			pythonStatus.set({ state: 'error', error: String(e) });
			loadPromise = undefined;
			throw e;
		}
	})();
	return loadPromise;
}

/** Insert `await` before the cell-API calls so users can write them synchronously. */
function attemptFixAwait(code: string): string {
	let fixed = code.replace(/(?<!await\s)\b(cells?|c|getCells?|getCell)(\s*[([])/g, 'await $1$2');
	fixed = fixed.replace(/await\s+await/g, 'await');
	return fixed;
}

export async function runPython(
	code: string,
	getCellValue: (x: number, y: number) => string | undefined
): Promise<PythonRunResult> {
	try {
		const py = await loadPython();
		currentGetCellValue = getCellValue;
		currentAccessed = [];
		await py.loadPackagesFromImports(code);
		const runner = py.globals.get('_quadratic_run');
		const resultJson: string = await runner(attemptFixAwait(code));
		const parsed = JSON.parse(resultJson);
		return {
			success: parsed.success,
			output_value: parsed.output_value,
			array_output: parsed.array_output,
			cells_accessed: currentAccessed,
			std_out: parsed.std_out || undefined,
			std_err: parsed.std_err || undefined
		};
	} catch (e) {
		return {
			success: false,
			output_value: null,
			cells_accessed: currentAccessed,
			std_err: `Failed to run Python: ${String(e)}`
		};
	}
}
