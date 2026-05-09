# Known Issues: Svelte 4 → Svelte 5 Migration

## Status

The React + Svelte single Vite build works for most features. The following issues remain due to Svelte 5's different reactivity model compared to Svelte 4.

## Working Features

- Single Vite build (React 19 + Svelte 5) — one dev server, one port
- Attention Analyzer tab (React + FastAPI) — fully working
- Transformer Explorer tab (Svelte) — partially working:
  - Attention matrix renders correctly (NxN grid)
  - Model loads and runs GPT-2 inference in browser
  - Probabilities display correctly
  - Temperature and sampling controls work
  - Example selection works
  - Sankey flow lines render (opacity fix applied)

## Issue 1: Input Box Token Duplication on Generate

**File:** `frontend/src/svelte/components/InputForm.svelte`

**Symptom:** User clicks Generate, the predicted token gets duplicated. Example:
- Input shows: "Trực quan hóa dữ liệu giúp người dùng" with predicted " dễ" in purple
- Click Generate → becomes "Trực quan hóa dữ liệu giúp người dùng dễ" (correct) with predicted " dàng"
- Click Generate again → becomes "Trực quan hóa dữ liệu giúp người dùng dễ dàng dàng" (WRONG — "dàng" duplicated)

**Root Cause:** Svelte 4 allows `$:` reactive declarations to be temporarily overridden by manual assignment in event handlers. Svelte 5 does NOT — `$:` compiles to `$derived` which is effectively read-only and re-evaluates immediately after manual assignment.

**Specific code pattern that breaks:**

```js
// These two lines work in Svelte 4 but NOT in Svelte 5:
$: inputTextTemp = $inputText || '';
$: predictedTokenTemp = $predictedToken?.token || '';

const onFocusInput = (e) => {
    // In Svelte 4: this merge works because inputTextTemp holds the
    // user's current text and predictedTokenTemp holds the predicted token.
    // After merging, setting predictedTokenTemp = '' sticks until
    // $predictedToken changes.
    let formattedString = (inputTextTemp + predictedTokenTemp).replace(/[\s\n]+/g, ' ');
    inputTextTemp = formattedString;     // ← Svelte 5 IGNORES this assignment
    predictedTokenTemp = '';              // ← Svelte 5 IGNORES this assignment
    inputRef.innerText = inputTextTemp;
};
```

**Why Svelte 5 breaks this:**

In Svelte 5 legacy mode, `$: x = expr` is compiled to something like:

```js
// Svelte 5 internal (simplified)
let inputTextTemp = $derived($inputText || '');  // READ-ONLY derived
```

Manual assignments (`inputTextTemp = formattedString`) are either:
1. Silently ignored (the derived re-evaluates from the store)
2. Briefly accepted then immediately overwritten on the next reactivity cycle

This means:
- `predictedTokenTemp = ''` gets overwritten back to `$predictedToken?.token` immediately
- `inputTextTemp = formattedString` gets overwritten back to `$inputText` immediately
- The merge in `onFocusInput` has no lasting effect
- On next Generate click, `predictedTokenTemp` still has the old predicted token → duplication

**What the original Svelte 4 code does (working):**

1. `$inputText` store holds the base text (e.g., "Trực quan hóa dữ liệu giúp người dùng")
2. Model predicts → `$predictedToken` = { token: " dễ" }
3. `$: predictedTokenTemp = " dễ"` — shown in purple in the UI, separate from input
4. User clicks Generate → `onFocusInput()`:
   - Merges: `inputTextTemp = "Trực quan hóa dữ liệu giúp người dùng" + " dễ"` = "... dùng dễ"
   - Clears: `predictedTokenTemp = ''` — this STICKS in Svelte 4
   - Sets store: `inputText.set("... dùng dễ")`
5. Model runs with new input "... dùng dễ", predicts " dàng"
6. `$: predictedTokenTemp = " dàng"` — shown in purple
7. User clicks Generate → merges correctly: "... dùng dễ" + " dàng" = "... dùng dễ dàng"

**What happens in Svelte 5 (broken):**

Steps 1-3 same. Then:
4. User clicks Generate → `onFocusInput()`:
   - Reads `inputTextTemp` — but `$:` has re-derived it from `$inputText`, so it's "... dùng"
   - Reads `predictedTokenTemp` — `$:` has re-derived it from `$predictedToken`, so it's " dễ"
   - Merges: "... dùng" + " dễ" = "... dùng dễ" (correct so far)
   - Sets `predictedTokenTemp = ''` — Svelte 5 IMMEDIATELY re-derives it back to " dễ"
   - Sets store: `inputText.set("... dùng dễ")`
5. Model runs, `$predictedToken` changes to " dàng"
6. `$: predictedTokenTemp = " dàng"`
7. But `$: inputTextTemp = $inputText` = "... dùng dễ" (correct)
8. User clicks Generate → `onFocusInput()`:
   - `inputTextTemp` = "... dùng dễ" ← BUT Svelte 5 may re-derive from stale `$inputText`
   - The exact stale value depends on effect execution order
   - Duplication or skipping occurs

**Attempted fixes (all failed):**

1. **Use `_lastInputText` tracking variable** — Still broken because `$:` overrides
2. **Use `onMount` + `store.subscribe()`** — Input reverts to example text on Generate
3. **Read `$inputText` directly in handlers** — Still reads stale due to effect ordering
4. **Auto-merge predicted token via `$:` block** — Creates infinite generation loop
5. **Remove predicted token display entirely** — Still duplicates because the merge logic is wrong
6. **Revert to exact original code** — `$:` override doesn't work in Svelte 5
7. **Various combinations of above** — All have the same fundamental issue

**Potential solutions:**

1. **Downgrade to Svelte 4** — Would require downgrading Vite to v5 (Svelte 4's plugin doesn't support Vite 8)
2. **Rewrite InputForm using Svelte 5 runes** (`$state`, `$derived`, `$effect`) — The proper Svelte 5 way, but requires understanding the exact data flow
3. **Use the iframe approach** for the Transformer Explorer tab — Original code runs unchanged in Svelte 4, no reactivity bugs
4. **Use `get()` from svelte/store** to read store values imperatively in handlers, avoid `$:` entirely for mutable variables:

```js
import { get } from 'svelte/store';

// Don't use $: for these — they need to be mutable
let inputTextTemp = get(inputText) || '';
let predictedTokenTemp = '';

// Update display reactively (read-only, for template rendering)
$: displayText = $inputText || '';
$: displayPredicted = $predictedToken?.token || '';

const handleSubmit = (e) => {
    completeCurrentAnimation();
    setTimeout(() => {
        // Read IMPERATIVELY from stores
        const currentInput = get(inputText) || '';
        const currentPredicted = get(predictedToken)?.token || '';
        const merged = (currentInput + currentPredicted).replace(/[\s\n]+/g, ' ');
        inputText.set(merged);
    }, 0);
};
```

## Issue 2: Sankey Flow Lines (Partially Fixed)

**File:** `frontend/src/svelte/components/Sankey.svelte`

**Status:** Flow lines now render after the `opacity-1` Tailwind 4 fix (opacity-1 = 1% in TW4, was ignored in TW3). The coordinate offset fix (`getSvgOffset()`) is applied. Some edge cases may remain with timing of initial draw.

## Issue 3: Other Svelte 5 Reactivity Patterns

Any Svelte component that uses `$: x = expr` AND manually assigns `x = value` in event handlers will have the same class of bug. Known instances:

- `InputForm.svelte` — `inputTextTemp`, `predictedTokenTemp` (Issue 1 above)
- `AttentionMatrix.svelte` — `qkColorScaleDomain` (fixed with spread + Number guard)
- `Matrix.svelte` — `rowLen`, `dimension` (fixed with inline computation in props)

## Architecture Notes

The project uses Svelte 5 with legacy mode (auto-detects Svelte 4 syntax). Most Svelte 4 patterns work, but the `$:` mutation pattern is fundamentally incompatible. The Svelte 5 docs explicitly recommend migrating to runes (`$state`, `$derived`, `$effect`) for mutable reactive state.
