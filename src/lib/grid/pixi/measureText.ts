// Text measurement for wrapped cells, shared by the Pixi renderer (line
// clipping) and the state layer (row autofit). Uses Pixi's own measurer so
// the numbers match what the labels actually render.

import { CanvasTextMetrics, TextStyle } from 'pixi.js';

export const FONT_SIZE = 14;
export const CELL_TEXT_MARGIN_LEFT = 3;

export function wrappedTextStyle(opts?: {
	bold?: boolean;
	italic?: boolean;
	colWidth?: number;
	align?: string;
	fill?: string;
}): TextStyle {
	return new TextStyle({
		fontFamily: 'OpenSans, sans-serif',
		fontSize: FONT_SIZE,
		fill: opts?.fill ?? '#000000',
		fontWeight: opts?.bold ? 'bold' : 'normal',
		fontStyle: opts?.italic ? 'italic' : 'normal',
		...(opts?.colWidth !== undefined
			? {
					wordWrap: true,
					wordWrapWidth: Math.max(8, opts.colWidth - CELL_TEXT_MARGIN_LEFT * 2),
					breakWords: true,
					align: (opts?.align ?? 'left') as 'left' | 'center' | 'right'
				}
			: {})
	});
}

/** Wrapped lines and their metrics for a cell's text at a column width. */
export function measureWrapped(
	text: string,
	colWidth: number,
	opts?: { bold?: boolean; italic?: boolean }
): { lines: string[]; lineHeight: number; height: number } {
	const m = CanvasTextMetrics.measureText(text, wrappedTextStyle({ ...opts, colWidth }));
	return { lines: m.lines, lineHeight: m.lineHeight, height: m.height };
}
