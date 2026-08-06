import { Sheet } from '../core/Sheet';
import type { SheetController } from '../core/SheetController';
import type { GridFile } from '../core/types';

export const DEFAULT_FILE_NAME = 'Untitled';
const LEGACY_LOCAL_STORAGE_KEY = 'quadratic-svelte-file';
const DB_NAME = 'quadratic-svelte';
const DB_STORE = 'files';
const CURRENT_FILE_KEY = 'current-file';

export function exportGridFile(sc: SheetController, filename: string, id: string): GridFile {
	return {
		sheets: sc.sheets.map((sheet, order) => {
			const data = sheet.export();
			return {
				name: sheet.name,
				order,
				color: sheet.color,
				borders: [],
				cells: data.cells,
				formats: data.formats,
				columns: data.columns,
				rows: data.rows,
				cell_dependency: data.cell_dependency
			};
		}),
		created: Date.now(),
		filename,
		id,
		modified: Date.now(),
		version: '1.3'
	};
}

export function importGridFile(sc: SheetController, file: GridFile): void {
	// v1.3 files nest content under sheets[]; v1.0–1.2 keep it at the top level
	const legacy = file as unknown as {
		cells?: unknown[];
		formats?: unknown[];
		columns?: unknown[];
		rows?: unknown[];
		cell_dependency?: string;
	};
	const sheetDatas =
		file.sheets && file.sheets.length > 0 ? file.sheets : legacy.cells ? [legacy] : undefined;
	if (!sheetDatas) throw new Error('Grid file has no sheets');

	sc.sheets = sheetDatas.map((raw, i) => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const f = raw as any;
		const sheet = new Sheet();
		sheet.name = f.name ?? `Sheet${i + 1}`;
		sheet.color = f.color ?? undefined;
		sheet.import({
			cells: f.cells ?? [],
			formats: f.formats ?? [],
			columns: f.columns ?? [],
			rows: f.rows ?? [],
			cell_dependency: typeof f.cell_dependency === 'string' ? f.cell_dependency : '[]'
		});
		// files from the original app store borders separately, one entry per
		// cell with `horizontal` = top edge and `vertical` = left edge; fold
		// them into our per-format borders
		if (Array.isArray(f.borders)) {
			for (const b of f.borders as {
				x: number;
				y: number;
				horizontal?: { color?: string };
				vertical?: { color?: string };
			}[]) {
				if (!b || (b.horizontal === undefined && b.vertical === undefined)) continue;
				const existing = sheet.getFormat(b.x, b.y) ?? { x: b.x, y: b.y };
				const borders = { ...(existing.borders ?? {}) };
				if (b.horizontal)
					borders.top = typeof b.horizontal.color === 'string' ? b.horizontal.color : '#000000';
				if (b.vertical)
					borders.left = typeof b.vertical.color === 'string' ? b.vertical.color : '#000000';
				sheet.setFormat(b.x, b.y, { ...existing, borders });
			}
		}
		sheet.rebuildDependencies();
		return sheet;
	});
	sc.currentSheetIndex = 0;
}

// IndexedDB persistence (localStorage's ~5MB quota silently truncated
// larger sheets — the Monte Carlo example alone is ~3MB on disk).
function openDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, 1);
		req.onupgradeneeded = () => {
			if (!req.result.objectStoreNames.contains(DB_STORE)) {
				req.result.createObjectStore(DB_STORE);
			}
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
	});
}

/** Persists the current file. Throws on failure so callers can surface it. */
export async function saveCurrentFile(file: GridFile): Promise<void> {
	const db = await openDb();
	try {
		await new Promise<void>((resolve, reject) => {
			const tx = db.transaction(DB_STORE, 'readwrite');
			tx.objectStore(DB_STORE).put(file, CURRENT_FILE_KEY);
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write failed'));
			tx.onabort = () => reject(tx.error ?? new Error('IndexedDB write aborted'));
		});
	} finally {
		db.close();
	}
}

/** Loads the persisted file, migrating any pre-IndexedDB localStorage copy. */
export async function loadCurrentFile(): Promise<GridFile | undefined> {
	try {
		const db = await openDb();
		try {
			const stored = await new Promise<GridFile | undefined>((resolve, reject) => {
				const tx = db.transaction(DB_STORE, 'readonly');
				const req = tx.objectStore(DB_STORE).get(CURRENT_FILE_KEY);
				req.onsuccess = () => resolve(req.result as GridFile | undefined);
				req.onerror = () => reject(req.error ?? new Error('IndexedDB read failed'));
			});
			if (stored) return stored;
		} finally {
			db.close();
		}
	} catch {
		// fall through to the legacy copy
	}
	try {
		const raw = localStorage.getItem(LEGACY_LOCAL_STORAGE_KEY);
		if (!raw) return undefined;
		const legacy = JSON.parse(raw) as GridFile;
		await saveCurrentFile(legacy).catch(() => {});
		localStorage.removeItem(LEGACY_LOCAL_STORAGE_KEY);
		return legacy;
	} catch {
		return undefined;
	}
}

export function downloadGridFile(file: GridFile): void {
	const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `${file.filename}.grid`;
	a.click();
	URL.revokeObjectURL(url);
}

/** Minimal CSV parser (quotes, escaped quotes, CRLF). */
export function parseCSV(text: string): string[][] {
	const rows: string[][] = [];
	let row: string[] = [];
	let field = '';
	let inQuotes = false;
	for (let i = 0; i < text.length; i++) {
		const ch = text[i];
		if (inQuotes) {
			if (ch === '"') {
				if (text[i + 1] === '"') {
					field += '"';
					i++;
				} else inQuotes = false;
			} else field += ch;
		} else if (ch === '"') {
			inQuotes = true;
		} else if (ch === ',') {
			row.push(field);
			field = '';
		} else if (ch === '\n' || ch === '\r') {
			if (ch === '\r' && text[i + 1] === '\n') i++;
			row.push(field);
			field = '';
			rows.push(row);
			row = [];
		} else field += ch;
	}
	if (field !== '' || row.length > 0) {
		row.push(field);
		rows.push(row);
	}
	return rows.filter((r) => !(r.length === 1 && r[0] === ''));
}
