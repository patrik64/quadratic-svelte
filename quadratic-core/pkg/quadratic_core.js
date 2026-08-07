/* @ts-self-types="./quadratic_core.d.ts" */

/**
 * @enum {0 | 1 | 2 | 3 | 4 | 5}
 */
export const CellTypes = Object.freeze({
    Text: 0, "0": "Text",
    Formula: 1, "1": "Formula",
    Javascript: 2, "2": "Javascript",
    Python: 3, "3": "Python",
    Sql: 4, "4": "Sql",
    Computed: 5, "5": "Computed",
});

/**
 * Cell position {x, y}.
 */
export class Pos {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PosFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_pos_free(ptr, 0);
    }
    /**
     * Column
     * @returns {bigint}
     */
    get x() {
        const ret = wasm.__wbg_get_pos_x(this.__wbg_ptr);
        return ret;
    }
    /**
     * Row
     * @returns {bigint}
     */
    get y() {
        const ret = wasm.__wbg_get_pos_y(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {bigint} x
     * @param {bigint} y
     */
    constructor(x, y) {
        const ret = wasm.pos_new(x, y);
        this.__wbg_ptr = ret;
        PosFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Column
     * @param {bigint} arg0
     */
    set x(arg0) {
        wasm.__wbg_set_pos_x(this.__wbg_ptr, arg0);
    }
    /**
     * Row
     * @param {bigint} arg0
     */
    set y(arg0) {
        wasm.__wbg_set_pos_y(this.__wbg_ptr, arg0);
    }
}
if (Symbol.dispose) Pos.prototype[Symbol.dispose] = Pos.prototype.free;

/**
 * Rewrites the A1 cell references in a formula after rows or columns are
 * inserted or deleted, preserving `$` absolute markers and `n` negatives.
 *
 * `(cell_x, cell_y)` is the formula cell's position BEFORE the shift;
 * coordinates at or beyond `at` on the given axis move by `delta`.
 * References into a deleted band are left unchanged.
 * @param {string} formula_string
 * @param {number} cell_x
 * @param {number} cell_y
 * @param {boolean} is_column
 * @param {number} at
 * @param {number} delta
 * @returns {string}
 */
export function adjust_formula(formula_string, cell_x, cell_y, is_column, at, delta) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(formula_string, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.adjust_formula(ptr0, len0, cell_x, cell_y, is_column, at, delta);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * Returns a column number from a name, or `null` if it is invalid or out of range.
 * @param {string} s
 * @returns {number | undefined}
 */
export function column_from_name(s) {
    const ptr0 = passStringToWasm0(s, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.column_from_name(ptr0, len0);
    return ret[0] === 0 ? undefined : ret[1];
}

/**
 * Returns a column's name from its number.
 * @param {number} n
 * @returns {string}
 */
export function column_name(n) {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.column_name(n);
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Evaluates a formula and returns a formula result.
 * @param {string} formula_string
 * @param {number} x
 * @param {number} y
 * @param {Function} grid_accessor_fn
 * @returns {Promise<any>}
 */
export function eval_formula(formula_string, x, y, grid_accessor_fn) {
    const ptr0 = passStringToWasm0(formula_string, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.eval_formula(ptr0, len0, x, y, grid_accessor_fn);
    return ret;
}

/**
 * Returns documentation for every formula function, grouped by category,
 * for the in-app formula reference.
 * @returns {any}
 */
export function formula_docs() {
    const ret = wasm.formula_docs();
    return ret;
}

export function hello() {
    wasm.hello();
}

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
 * @param {string} formula_string
 * @param {number} x
 * @param {number} y
 * @returns {Promise<any>}
 */
export function parse_formula(formula_string, x, y) {
    const ptr0 = passStringToWasm0(formula_string, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.parse_formula(ptr0, len0, x, y);
    return ret;
}

/**
 * @param {any} _text_model
 * @param {any} _position
 * @param {any} _context
 * @param {any} _token
 * @returns {any}
 */
export function provideCompletionItems(_text_model, _position, _context, _token) {
    const ret = wasm.provideCompletionItems(_text_model, _position, _context, _token);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * @param {any} text_model
 * @param {any} position
 * @param {any} _token
 * @returns {Promise<any>}
 */
export function provideHover(text_model, position, _token) {
    const ret = wasm.provideHover(text_model, position, _token);
    return ret;
}

/**
 * Rewrites a formula's A1 references for a copy from one cell to another
 * (fill/paste semantics): relative references follow the copy offset,
 * `$` absolute references stay put.
 * @param {string} formula_string
 * @param {number} old_x
 * @param {number} old_y
 * @param {number} new_x
 * @param {number} new_y
 * @returns {string}
 */
export function relocate_formula(formula_string, old_x, old_y, new_x, new_y) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(formula_string, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.relocate_formula(ptr0, len0, old_x, old_y, new_x, new_y);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}
function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg_Error_92b29b0548f8b746: function(arg0, arg1) {
            const ret = Error(getStringFromWasm0(arg0, arg1));
            return ret;
        },
        __wbg___wbindgen_debug_string_c25d447a39f5578f: function(arg0, arg1) {
            const ret = debugString(arg1);
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_is_function_1ff95bcc5517c252: function(arg0) {
            const ret = typeof(arg0) === 'function';
            return ret;
        },
        __wbg___wbindgen_is_undefined_c05833b95a3cf397: function(arg0) {
            const ret = arg0 === undefined;
            return ret;
        },
        __wbg___wbindgen_string_get_b0ca35b86a603356: function(arg0, arg1) {
            const obj = arg1;
            const ret = typeof(obj) === 'string' ? obj : undefined;
            var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_throw_344f42d3211c4765: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbg__wbg_cb_unref_fffb441def202758: function(arg0) {
            arg0._wbg_cb_unref();
        },
        __wbg_bind_7a0202e6587a08e9: function(arg0, arg1, arg2) {
            const ret = arg0.bind(arg1, arg2);
            return ret;
        },
        __wbg_call_8a2dd23819f8a60a: function() { return handleError(function (arg0, arg1) {
            const ret = arg0.call(arg1);
            return ret;
        }, arguments); },
        __wbg_call_a6e5c5dce5018821: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.call(arg1, arg2);
            return ret;
        }, arguments); },
        __wbg_getDate_a1a40c1c5f40fe3b: function(arg0) {
            const ret = arg0.getDate();
            return ret;
        },
        __wbg_getFullYear_6af8b229792ae254: function(arg0) {
            const ret = arg0.getFullYear();
            return ret;
        },
        __wbg_getHours_9f6561095682ce51: function(arg0) {
            const ret = arg0.getHours();
            return ret;
        },
        __wbg_getMinutes_b0d5cd90bf9b8f22: function(arg0) {
            const ret = arg0.getMinutes();
            return ret;
        },
        __wbg_getMonth_fffe29d654d5eb69: function(arg0) {
            const ret = arg0.getMonth();
            return ret;
        },
        __wbg_getSeconds_40c565b3a6cb05fe: function(arg0) {
            const ret = arg0.getSeconds();
            return ret;
        },
        __wbg_get_78f252d074a84d0b: function() { return handleError(function (arg0, arg1) {
            const ret = Reflect.get(arg0, arg1);
            return ret;
        }, arguments); },
        __wbg_log_05075d3dee586810: function(arg0, arg1) {
            console.log(getStringFromWasm0(arg0, arg1));
        },
        __wbg_new_0_3da9e97f24fc69be: function() {
            const ret = new Date();
            return ret;
        },
        __wbg_new_32b398fb48b6d94a: function() {
            const ret = new Array();
            return ret;
        },
        __wbg_new_da52cf8fe3429cb2: function() {
            const ret = new Object();
            return ret;
        },
        __wbg_new_typed_1824d93f294193e5: function(arg0, arg1) {
            try {
                var state0 = {a: arg0, b: arg1};
                var cb0 = (arg0, arg1) => {
                    const a = state0.a;
                    state0.a = 0;
                    try {
                        return wasm_bindgen_8ed4c97c0d6408cb___convert__closures_____invoke___js_sys_21067679b5512d8c___Function_fn_wasm_bindgen_8ed4c97c0d6408cb___JsValue_____wasm_bindgen_8ed4c97c0d6408cb___sys__Undefined___js_sys_21067679b5512d8c___Function_fn_wasm_bindgen_8ed4c97c0d6408cb___JsValue_____wasm_bindgen_8ed4c97c0d6408cb___sys__Undefined_______true_(a, state0.b, arg0, arg1);
                    } finally {
                        state0.a = a;
                    }
                };
                const ret = new Promise(cb0);
                return ret;
            } finally {
                state0.a = 0;
            }
        },
        __wbg_queueMicrotask_0ab5b2d2393e99b9: function(arg0) {
            const ret = arg0.queueMicrotask;
            return ret;
        },
        __wbg_queueMicrotask_6a09b7bc46549209: function(arg0) {
            queueMicrotask(arg0);
        },
        __wbg_resolve_2191a4dfe481c25b: function(arg0) {
            const ret = Promise.resolve(arg0);
            return ret;
        },
        __wbg_set_8a16b38e4805b298: function(arg0, arg1, arg2) {
            arg0[arg1 >>> 0] = arg2;
        },
        __wbg_set_d1cb61e9f39c870f: function(arg0, arg1, arg2) {
            arg0[arg1] = arg2;
        },
        __wbg_static_accessor_GLOBAL_4ef717fb391d88b7: function() {
            const ret = typeof global === 'undefined' ? null : global;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_GLOBAL_THIS_8d1badc68b5a74f4: function() {
            const ret = typeof globalThis === 'undefined' ? null : globalThis;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_SELF_146583524fe1469b: function() {
            const ret = typeof self === 'undefined' ? null : self;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_WINDOW_f2829a2234d7819e: function() {
            const ret = typeof window === 'undefined' ? null : window;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_then_16d107c451e9905d: function(arg0, arg1, arg2) {
            const ret = arg0.then(arg1, arg2);
            return ret;
        },
        __wbg_then_6ec10ae38b3e92f7: function(arg0, arg1) {
            const ret = arg0.then(arg1);
            return ret;
        },
        __wbindgen_cast_0000000000000001: function(arg0, arg1) {
            // Cast intrinsic for `Closure(Closure { owned: true, function: Function { arguments: [Externref], shim_idx: 709, ret: Result(Unit), inner_ret: Some(Result(Unit)) }, mutable: true }) -> Externref`.
            const ret = makeMutClosure(arg0, arg1, wasm_bindgen_8ed4c97c0d6408cb___convert__closures_____invoke___wasm_bindgen_8ed4c97c0d6408cb___JsValue__core_9b3796e30d99ddb7___result__Result_____wasm_bindgen_8ed4c97c0d6408cb___JsError___true_);
            return ret;
        },
        __wbindgen_cast_0000000000000002: function(arg0) {
            // Cast intrinsic for `F64 -> Externref`.
            const ret = arg0;
            return ret;
        },
        __wbindgen_cast_0000000000000003: function(arg0) {
            // Cast intrinsic for `I64 -> Externref`.
            const ret = arg0;
            return ret;
        },
        __wbindgen_cast_0000000000000004: function(arg0, arg1) {
            // Cast intrinsic for `Ref(String) -> Externref`.
            const ret = getStringFromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_cast_0000000000000005: function(arg0) {
            // Cast intrinsic for `U64 -> Externref`.
            const ret = BigInt.asUintN(64, arg0);
            return ret;
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        },
    };
    return {
        __proto__: null,
        "./quadratic_core_bg.js": import0,
    };
}

function wasm_bindgen_8ed4c97c0d6408cb___convert__closures_____invoke___wasm_bindgen_8ed4c97c0d6408cb___JsValue__core_9b3796e30d99ddb7___result__Result_____wasm_bindgen_8ed4c97c0d6408cb___JsError___true_(arg0, arg1, arg2) {
    const ret = wasm.wasm_bindgen_8ed4c97c0d6408cb___convert__closures_____invoke___wasm_bindgen_8ed4c97c0d6408cb___JsValue__core_9b3796e30d99ddb7___result__Result_____wasm_bindgen_8ed4c97c0d6408cb___JsError___true_(arg0, arg1, arg2);
    if (ret[1]) {
        throw takeFromExternrefTable0(ret[0]);
    }
}

function wasm_bindgen_8ed4c97c0d6408cb___convert__closures_____invoke___js_sys_21067679b5512d8c___Function_fn_wasm_bindgen_8ed4c97c0d6408cb___JsValue_____wasm_bindgen_8ed4c97c0d6408cb___sys__Undefined___js_sys_21067679b5512d8c___Function_fn_wasm_bindgen_8ed4c97c0d6408cb___JsValue_____wasm_bindgen_8ed4c97c0d6408cb___sys__Undefined_______true_(arg0, arg1, arg2, arg3) {
    wasm.wasm_bindgen_8ed4c97c0d6408cb___convert__closures_____invoke___js_sys_21067679b5512d8c___Function_fn_wasm_bindgen_8ed4c97c0d6408cb___JsValue_____wasm_bindgen_8ed4c97c0d6408cb___sys__Undefined___js_sys_21067679b5512d8c___Function_fn_wasm_bindgen_8ed4c97c0d6408cb___JsValue_____wasm_bindgen_8ed4c97c0d6408cb___sys__Undefined_______true_(arg0, arg1, arg2, arg3);
}

const PosFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_pos_free(ptr, 1));

function addToExternrefTable0(obj) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_externrefs.set(idx, obj);
    return idx;
}

const CLOSURE_DTORS = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(state => wasm.__wbindgen_destroy_closure(state.a, state.b));

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return  `${val}`;
    }
    if (type == 'string') {
        return `"${val}"`;
    }
    if (type == 'symbol') {
        const description = val.description;
        if (description == null) {
            return 'Symbol';
        } else {
            return `Symbol(${description})`;
        }
    }
    if (type == 'function') {
        const name = val.name;
        if (typeof name == 'string' && name.length > 0) {
            return `Function(${name})`;
        } else {
            return 'Function';
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for(let i = 1; i < length; i++) {
            debug += ', ' + debugString(val[i]);
        }
        debug += ']';
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches && builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        } catch (_) {
            return 'Object';
        }
    }
    // errors
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

function getStringFromWasm0(ptr, len) {
    return decodeText(ptr >>> 0, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        const idx = addToExternrefTable0(e);
        wasm.__wbindgen_exn_store(idx);
    }
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

function makeMutClosure(arg0, arg1, f) {
    const state = { a: arg0, b: arg1, cnt: 1 };
    const real = (...args) => {

        // First up with a closure we increment the internal reference
        // count. This ensures that the Rust closure environment won't
        // be deallocated while we're invoking it.
        state.cnt++;
        const a = state.a;
        state.a = 0;
        try {
            return f(a, state.b, ...args);
        } finally {
            state.a = a;
            real._wbg_cb_unref();
        }
    };
    real._wbg_cb_unref = () => {
        if (--state.cnt === 0) {
            wasm.__wbindgen_destroy_closure(state.a, state.b);
            state.a = 0;
            CLOSURE_DTORS.unregister(state);
        }
    };
    CLOSURE_DTORS.register(real, state, state);
    return real;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasmInstance, wasm;
function __wbg_finalize_init(instance, module) {
    wasmInstance = instance;
    wasm = instance.exports;
    wasmModule = module;
    cachedDataViewMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = module.ok && expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('quadratic_core_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
