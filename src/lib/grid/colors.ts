// Quadratic's palette, updated to the modern client's theme
// (quadratic-client/src/app/theme/colors.ts @ v0.24).
export const colors = {
	gridLines: '#233143', // modern slate; drawn with zoom-faded alpha
	cellFontColor: '#000000',
	cellColorUserText: '#8ecb89',
	cellColorUserPython: '#3776ab',
	cellColorUserFormula: '#8c1a6a',
	cellColorUserJavascript: '#ca8a04',
	cellColorError: '#f25f5c',
	cursorCell: '#2463eb', // modern accent blue (was #6cd4ff)
	independence: '#5d576b',
	headerBackground: '#ffffff',
	headerSelectedBackground: 'rgba(36, 99, 235, 0.18)',
	lightGray: '#f6f8fa',
	mediumGray: '#cfd7de',
	darkGray: '#55606b',
	quadraticPrimary: '#6cd4ff',
	quadraticSecondary: '#8ecb89',
	error: '#f25f5c'
};

export type CodeEditorMode = 'FORMULA' | 'PYTHON' | 'JAVASCRIPT';

export function editorModeColor(mode: CodeEditorMode): string {
	if (mode === 'FORMULA') return colors.cellColorUserFormula;
	if (mode === 'JAVASCRIPT') return colors.cellColorUserJavascript;
	return colors.cellColorUserPython;
}

/** Modern gridline fade: lines dim as you zoom out and vanish below 10%. */
export function gridLineAlpha(scale: number): number {
	if (scale < 0.1) return 0;
	if (scale < 0.6) return scale * 2 - 0.2;
	return 1;
}
