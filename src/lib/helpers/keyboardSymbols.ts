const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);

export const KeyboardSymbols = {
	Cmd: isMac ? '⌘' : 'Ctrl+',
	Shift: '⇧',
	Enter: '↵',
	Escape: '⎋'
};
