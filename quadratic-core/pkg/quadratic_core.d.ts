/* tslint:disable */
/* eslint-disable */

export enum CellTypes {
    Text = 0,
    Formula = 1,
    Javascript = 2,
    Python = 3,
    Sql = 4,
    Computed = 5,
}

/**
 * Cell position {x, y}.
 */
export class Pos {
    free(): void;
    [Symbol.dispose](): void;
    constructor(x: bigint, y: bigint);
    /**
     * Column
     */
    x: bigint;
    /**
     * Row
     */
    y: bigint;
}

/**
 * Rewrites the A1 cell references in a formula after rows or columns are
 * inserted or deleted, preserving `$` absolute markers and `n` negatives.
 *
 * `(cell_x, cell_y)` is the formula cell's position BEFORE the shift;
 * coordinates at or beyond `at` on the given axis move by `delta`.
 * References into a deleted band are left unchanged.
 */
export function adjust_formula(formula_string: string, cell_x: number, cell_y: number, is_column: boolean, at: number, delta: number): string;

/**
 * Returns a column number from a name, or `null` if it is invalid or out of range.
 */
export function column_from_name(s: string): number | undefined;

/**
 * Returns a column's name from its number.
 */
export function column_name(n: number): string;

/**
 * Evaluates a formula and returns a formula result.
 */
export function eval_formula(formula_string: string, x: number, y: number, grid_accessor_fn: Function): Promise<any>;

/**
 * Returns documentation for every formula function, grouped by category,
 * for the in-app formula reference.
 */
export function formula_docs(): any;

export function hello(): void;

/**
 * Parses a formula and returns a partial result.
 *
 * Example output:
 * ```json
 * {
 *   "parse_error_msg": "Bad argument count",
 *   "parse_error_span": { "start": 12, "end": 46 },
 *   "cell_refs": [
 *     {
 *       "span": { "start": 1, "end": 4 },
 *       "cell_ref": {
 *         "Cell": {
 *           "x": { "Relative": 0 },
 *           "y": { "Absolute": 1 }
 *         }
 *       }
 *     },
 *     {
 *       "span": { "start": 15, "end": 25 },
 *       "cell_ref": {
 *         "CellRange": [
 *           {
 *             "x": { "Absolute": 0 },
 *             "y": { "Relative": -2 }
 *           },
 *           {
 *             "x": { "Absolute": 0 },
 *             "y": { "Relative": 2 }
 *           }
 *         ]
 *       }
 *     }
 *   ]
 * }
 * ```
 *
 * `parse_error_msg` may be null, and `parse_error_span` may be null. Even if
 * `parse_error_span`, `parse_error_msg` may still be present.
 */
export function parse_formula(formula_string: string, x: number, y: number): Promise<any>;

export function provideCompletionItems(_text_model: any, _position: any, _context: any, _token: any): any;

export function provideHover(text_model: any, position: any, _token: any): Promise<any>;

/**
 * Rewrites a formula's A1 references for a copy from one cell to another
 * (fill/paste semantics): relative references follow the copy offset,
 * `$` absolute references stay put.
 */
export function relocate_formula(formula_string: string, old_x: number, old_y: number, new_x: number, new_y: number): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_get_pos_x: (a: number) => bigint;
    readonly __wbg_get_pos_y: (a: number) => bigint;
    readonly __wbg_pos_free: (a: number, b: number) => void;
    readonly __wbg_set_pos_x: (a: number, b: bigint) => void;
    readonly __wbg_set_pos_y: (a: number, b: bigint) => void;
    readonly pos_new: (a: bigint, b: bigint) => number;
    readonly adjust_formula: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number];
    readonly column_from_name: (a: number, b: number) => [number, number];
    readonly column_name: (a: number) => [number, number];
    readonly eval_formula: (a: number, b: number, c: number, d: number, e: any) => any;
    readonly formula_docs: () => any;
    readonly hello: () => void;
    readonly parse_formula: (a: number, b: number, c: number, d: number) => any;
    readonly relocate_formula: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number];
    readonly provideCompletionItems: (a: any, b: any, c: any, d: any) => [number, number, number];
    readonly provideHover: (a: any, b: any, c: any) => any;
    readonly wasm_bindgen_8ed4c97c0d6408cb___convert__closures_____invoke___wasm_bindgen_8ed4c97c0d6408cb___JsValue__core_9b3796e30d99ddb7___result__Result_____wasm_bindgen_8ed4c97c0d6408cb___JsError___true_: (a: number, b: number, c: any) => [number, number];
    readonly wasm_bindgen_8ed4c97c0d6408cb___convert__closures_____invoke___js_sys_21067679b5512d8c___Function_fn_wasm_bindgen_8ed4c97c0d6408cb___JsValue_____wasm_bindgen_8ed4c97c0d6408cb___sys__Undefined___js_sys_21067679b5512d8c___Function_fn_wasm_bindgen_8ed4c97c0d6408cb___JsValue_____wasm_bindgen_8ed4c97c0d6408cb___sys__Undefined_______true_: (a: number, b: number, c: any, d: any) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_destroy_closure: (a: number, b: number) => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
