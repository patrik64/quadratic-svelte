import { CELL_HEIGHT, CELL_WIDTH, type Heading } from './types';

/**
 * Maps between cell coordinates and world (pixel) coordinates, supporting
 * per-column widths and per-row heights (sparse; defaults elsewhere).
 * Port of Quadratic's GridOffsets without the incremental cache.
 */
export class GridOffsets {
	private columns = new Map<number, number>(); // column index -> width
	private rows = new Map<number, number>(); // row index -> height

	getColumnWidth(x: number): number {
		return this.columns.get(x) ?? CELL_WIDTH;
	}

	getRowHeight(y: number): number {
		return this.rows.get(y) ?? CELL_HEIGHT;
	}

	setColumnWidth(x: number, width: number | undefined): void {
		if (width === undefined || width === CELL_WIDTH) this.columns.delete(x);
		else this.columns.set(x, Math.max(10, width));
	}

	setRowHeight(y: number, height: number | undefined): void {
		if (height === undefined || height === CELL_HEIGHT) this.rows.delete(y);
		else this.rows.set(y, Math.max(10, height));
	}

	/** World x of the left edge of column x (column 0 starts at 0). */
	getColumnX(x: number): number {
		let pos = 0;
		if (x >= 0) {
			for (let i = 0; i < x; i++) pos += this.getColumnWidth(i);
		} else {
			for (let i = x; i < 0; i++) pos -= this.getColumnWidth(i);
		}
		return pos;
	}

	/** World y of the top edge of row y. */
	getRowY(y: number): number {
		let pos = 0;
		if (y >= 0) {
			for (let i = 0; i < y; i++) pos += this.getRowHeight(i);
		} else {
			for (let i = y; i < 0; i++) pos -= this.getRowHeight(i);
		}
		return pos;
	}

	/** Column containing world coordinate wx. */
	getColumnIndex(wx: number): number {
		if (wx >= 0) {
			let pos = 0;
			let i = 0;
			for (;;) {
				const w = this.getColumnWidth(i);
				if (wx < pos + w) return i;
				pos += w;
				i++;
			}
		} else {
			let pos = 0;
			let i = -1;
			for (;;) {
				pos -= this.getColumnWidth(i);
				if (wx >= pos) return i;
				i--;
			}
		}
	}

	/** Row containing world coordinate wy. */
	getRowIndex(wy: number): number {
		if (wy >= 0) {
			let pos = 0;
			let i = 0;
			for (;;) {
				const h = this.getRowHeight(i);
				if (wy < pos + h) return i;
				pos += h;
				i++;
			}
		} else {
			let pos = 0;
			let i = -1;
			for (;;) {
				pos -= this.getRowHeight(i);
				if (wy >= pos) return i;
				i--;
			}
		}
	}

	/** Screen rectangle of the cell at (x, y) in world coordinates. */
	getCellRect(x: number, y: number): { x: number; y: number; w: number; h: number } {
		return {
			x: this.getColumnX(x),
			y: this.getRowY(y),
			w: this.getColumnWidth(x),
			h: this.getRowHeight(y)
		};
	}

	exportColumns(): Heading[] {
		return [...this.columns.entries()].map(([id, size]) => ({ id, size }));
	}

	exportRows(): Heading[] {
		return [...this.rows.entries()].map(([id, size]) => ({ id, size }));
	}

	importHeadings(columns: Heading[], rows: Heading[]): void {
		this.columns.clear();
		this.rows.clear();
		for (const c of columns) if (c.size !== undefined) this.columns.set(c.id, c.size);
		for (const r of rows) if (r.size !== undefined) this.rows.set(r.id, r.size);
	}
}
