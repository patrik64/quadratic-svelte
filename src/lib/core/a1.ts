// A1-notation helpers matching Quadratic's convention:
// column A = 0, row labels are the raw y values (row 0 exists),
// negatives are prefixed with `n` (nA = column -1, n5 = row -5).

function numberToLetters(column: number): string {
	const letters: string[] = [];
	let block = column;
	while (block >= 0) {
		letters.unshift(String.fromCharCode((block % 26) + 65));
		block = Math.floor(block / 26) - 1;
	}
	return letters.join('');
}

function lettersToNumber(letters: string): number {
	let n = 0;
	for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
	return n - 1;
}

export function getColumnA1Notation(column: number): string {
	if (column < 0) return `n${numberToLetters(-column - 1)}`;
	return numberToLetters(column);
}

export function getRowA1Notation(row: number): string {
	if (row < 0) return `n${-row}`;
	return row.toString();
}

export function getCellA1Notation(x: number, y: number): string {
	return `${getColumnA1Notation(x)}${getRowA1Notation(y)}`;
}

/** Regex for one cell reference, e.g. B7, nB7, BnA7, An1 */
export const CELL_REF_RE = /^(n?)([A-Z]+)(n?)(\d+)$/;

export function parseCellRef(ref: string): { x: number; y: number } | undefined {
	const m = CELL_REF_RE.exec(ref.toUpperCase());
	if (!m) return undefined;
	const [, colNeg, letters, rowNeg, digits] = m;
	const col = lettersToNumber(letters);
	const x = colNeg ? -col - 1 : col;
	const row = parseInt(digits, 10);
	const y = rowNeg ? -row : row;
	return { x, y };
}
