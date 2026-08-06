// JavaScript cells, mirroring the modern Quadratic client's semantics:
// the return value of the user's (async) code becomes the cell output,
// arrays spill (1-D down a column, 2-D as rows, arrays of plain objects get
// a header row), console output is captured, q.cells()/q.pos() API.

import { getCellA1Notation, parseCellRef } from '../core/a1';
import type { ArrayOutput } from '../core/types';

export interface JavascriptRunResult {
	success: boolean;
	output_value: string | null;
	array_output?: ArrayOutput | null;
	cells_accessed: [number, number][];
	std_out?: string;
	std_err?: string;
}

type Scalar = string | number | boolean;

function coerce(raw: string | undefined): Scalar | undefined {
	if (raw === undefined || raw === '') return undefined;
	const n = Number(raw);
	if (!Number.isNaN(n) && raw.trim() !== '') return n;
	if (raw === 'TRUE' || raw === 'true' || raw === 'True') return true;
	if (raw === 'FALSE' || raw === 'false' || raw === 'False') return false;
	return raw;
}

export async function runJavascript(
	code: string,
	pos: { x: number; y: number },
	getCellValue: (x: number, y: number) => string | undefined
): Promise<JavascriptRunResult> {
	const accessed: [number, number][] = [];
	const logs: string[] = [];

	const readCell = (x: number, y: number): Scalar | undefined => {
		accessed.push([x, y]);
		return coerce(getCellValue(x, y));
	};

	const readRect = (x0: number, y0: number, x1: number, y1: number) => {
		const rows: (Scalar | undefined)[][] = [];
		for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) {
			const row: (Scalar | undefined)[] = [];
			for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) row.push(readCell(x, y));
			rows.push(row);
		}
		return rows;
	};

	/** q.cells('A0') -> scalar; single row/col -> 1-D array; else 2-D. */
	const qCells = (a1: string) => {
		const parts = String(a1).split(':');
		const first = parseCellRef(parts[0]?.trim() ?? '');
		if (!first) throw new Error(`Invalid cell reference: '${a1}'`);
		if (parts.length === 1) return readCell(first.x, first.y);
		const second = parseCellRef(parts[1]?.trim() ?? '');
		if (!second) throw new Error(`Invalid cell reference: '${a1}'`);
		const rows = readRect(first.x, first.y, second.x, second.y);
		if (rows.length === 1) return rows[0].length === 1 ? rows[0][0] : rows[0];
		if (rows[0].length === 1) return rows.map((r) => r[0]);
		return rows;
	};

	const q = {
		cells: qCells,
		pos: () => ({ x: pos.x, y: pos.y }),
		toA1: (x: number, y: number) => getCellA1Notation(x, y)
	};
	// convenience aliases matching this port's Python cells
	const cell = (x: number, y: number) => readCell(x, y);
	const cells = (p0: [number, number], p1: [number, number]) =>
		readRect(p0[0], p0[1], p1[0], p1[1]);

	const stringify = (v: unknown): string => {
		if (v instanceof Date) return v.toISOString();
		if (typeof v === 'object') {
			try {
				return JSON.stringify(v);
			} catch {
				return String(v);
			}
		}
		return String(v);
	};
	const capturedConsole = {
		log: (...args: unknown[]) => logs.push(args.map(stringify).join(' ')),
		warn: (...args: unknown[]) => logs.push('WARNING: ' + args.map(stringify).join(' ')),
		error: (...args: unknown[]) => logs.push('ERROR: ' + args.map(stringify).join(' '))
	};

	let result: unknown;
	try {
		const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (
			...args: string[]
		) => (...fnArgs: unknown[]) => Promise<unknown>;
		const fn = new AsyncFunction('q', 'cell', 'cells', 'pos', 'console', code);
		result = await fn(q, cell, cells, q.pos, capturedConsole);
	} catch (e) {
		const err = e as Error;
		let message = err?.message ?? String(e);
		// map the stack's <anonymous> position back to a user line number
		const m = /<anonymous>:(\d+):(\d+)/.exec(err?.stack ?? '');
		if (m) message += ` at line ${Math.max(1, parseInt(m[1], 10) - 2)}:${m[2]}`;
		return {
			success: false,
			output_value: null,
			cells_accessed: accessed,
			std_out: logs.length ? logs.join('\n') : undefined,
			std_err: message
		};
	}

	const { output_value, array_output, warning } = convertOutput(result);
	if (warning) logs.push(`WARNING: ${warning}`);
	return {
		success: true,
		output_value,
		array_output,
		cells_accessed: accessed,
		std_out: logs.length ? logs.join('\n') : undefined
	};
}

function sanitizeScalar(v: unknown): Scalar | null {
	if (v === null || v === undefined) return null;
	if (typeof v === 'number') return Number.isFinite(v) ? v : null;
	if (typeof v === 'boolean' || typeof v === 'string') return v;
	if (v instanceof Date) return v.toISOString();
	return null;
}

function convertOutput(result: unknown): {
	output_value: string | null;
	array_output?: ArrayOutput;
	warning?: string;
} {
	if (result === undefined || result === null) return { output_value: null };

	if (Array.isArray(result)) {
		if (result.length === 0) return { output_value: null };
		// array of plain objects: keys become a header row (modern behavior)
		if (
			typeof result[0] === 'object' &&
			result[0] !== null &&
			!Array.isArray(result[0]) &&
			!(result[0] instanceof Date)
		) {
			const keys = Object.keys(result[0] as object);
			const rows: (Scalar | null)[][] = [keys];
			for (const item of result as Record<string, unknown>[]) {
				rows.push(keys.map((k) => sanitizeScalar(item?.[k])));
			}
			return { output_value: String(rows[1]?.[0] ?? ''), array_output: rows as ArrayOutput };
		}
		if (Array.isArray(result[0])) {
			// 2-D: pad short rows to the longest row
			const width = Math.max(...(result as unknown[][]).map((r) => r.length));
			const rows = (result as unknown[][]).map((r) => {
				const row = r.map(sanitizeScalar);
				while (row.length < width) row.push(null);
				return row;
			});
			return { output_value: String(rows[0]?.[0] ?? ''), array_output: rows as ArrayOutput };
		}
		// 1-D spills down a single column
		const column = (result as unknown[]).map(sanitizeScalar);
		return { output_value: String(column[0] ?? ''), array_output: column as ArrayOutput };
	}

	const scalar = sanitizeScalar(result);
	if (scalar === null) {
		if (typeof result === 'number') {
			return { output_value: null, warning: 'NaN or Infinity is not supported as cell output' };
		}
		if (typeof result === 'object' && String(result) === '[object Promise]') {
			return { output_value: null, warning: 'Unawaited Promise returned — did you forget await?' };
		}
		return {
			output_value: null,
			warning: `Unsupported output type: ${typeof result}`
		};
	}
	return {
		output_value: typeof scalar === 'boolean' ? (scalar ? 'TRUE' : 'FALSE') : String(scalar)
	};
}
