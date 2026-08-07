// Fill-series detection for the fill handle and cmd+D/R, extracted from
// state.svelte.ts so it stays pure and unit-testable.

const TEXT_SERIES: string[][] = [
	['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
	['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
	['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
	['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
];

/** Continuation of `values` at 0-based `step` past the end, or undefined. */
export function seriesNext(values: string[], step: number): string | undefined {
	// arithmetic series over numbers
	if (values.length > 0 && values.every((v) => v.trim() !== '' && !Number.isNaN(Number(v)))) {
		const nums = values.map(Number);
		const delta = nums.length > 1 ? nums[1] - nums[0] : 0;
		if (nums.every((n, i) => i === 0 || Math.abs(n - nums[i - 1] - delta) < 1e-9)) {
			const value = nums[nums.length - 1] + delta * (step + 1);
			return String(Math.abs(value) < 1e-12 ? 0 : parseFloat(value.toPrecision(13)));
		}
		return undefined;
	}
	// day/month name series (case of the first sample wins)
	for (const series of TEXT_SERIES) {
		const idx = values.map((v) => series.findIndex((s) => s.toLowerCase() === v.toLowerCase()));
		if (idx.some((i) => i < 0)) continue;
		const consecutive = idx.every((v, i) => i === 0 || v === (idx[i - 1] + 1) % series.length);
		if (!consecutive) continue;
		const next = series[(idx[idx.length - 1] + 1 + step) % series.length];
		const sample = values[0];
		if (sample === sample.toUpperCase()) return next.toUpperCase();
		if (sample === sample.toLowerCase()) return next.toLowerCase();
		return next;
	}
	return undefined;
}
