# Testing

## Frontend Tests

```bash
cd frontend
npm test           # run once
npm run test:watch # watch mode
```

### 26 tests in `src/test/App.test.tsx`

**Rendering & Layout (7)**
- Renders app logo with correct text and Jersey 10 font
- Renders both tab buttons and sublabels (GPT-2 Vietnamese, PhoBERT)
- Renders the mocked Svelte mount in the transformer tab
- Renders GitHub and Paper links with correct URLs
- Links open in new tab (`target="_blank"`)

**Theme (2)**
- White background (`bg-white`)
- Gray text (`text-gray-900`)

**Tab Switching (3)**
- Transformer tab selected by default
- Clicking Attention Analyzer switches tabs
- Both tabs remain mounted in DOM (hidden via CSS)

**Attention Analyzer (4)**
- Input field with default Vietnamese text
- PhoBERT status badge (appears in tab sublabel + badge = 2 elements)
- Generate button enabled
- Empty state placeholder visible when no result

**Interactions (1)**
- Typing in sentence A input

**Form Submission (3)**
- Loading state shown (spinner, disabled button, Vietnamese text)
- Sends correct FormData to `/api/visualize` (proxy URL)
- Button re-enables after submission

**BertViz Output (3)**
- HTML injected into iframe srcdoc
- Light theme CSS injected (white background, Inter font)
- Empty state hidden after successful submit

**Error Handling (2)**
- Network error shown in iframe
- HTTP 500 error shown in iframe

### Svelte Mocking Strategy

The Svelte app (ONNX Runtime, WASM, web workers) cannot run in jsdom. `SvelteMount` is mocked:

```ts
vi.mock('../SvelteMount', () => ({
  default: () => <div data-testid="svelte-mount">Transformer Explorer (Svelte)</div>,
}))
```

This lets all React-level tests (rendering, tab switching, API calls) run without Svelte compilation in the test environment.

### Test Config

`vite.config.ts`:
```ts
test: {
  globals: true,
  environment: 'jsdom',
  setupFiles: './src/test/setup.ts',
  css: true,
}
```

## Backend Tests

```bash
source venv/bin/activate
pytest tests/ -v
```

### Tests in `tests/test_backend.py`

Uses mocked PhoBERT model/tokenizer (no 500 MB download needed):

**API Endpoints**
- `GET /` returns HTML
- `POST /visualize` requires `sentence_a` (422 if missing)
- Model view returns HTML
- Head view returns HTML
- Neuron view returns 400 (incompatible with PhoBERT)
- Empty `sentence_b` treated as None
- Default `view_type` is `model_view`

**CORS**
- Allows all origins (OPTIONS preflight succeeds)

**BertViz Utilities**
- `format_attention`: correct output shape, layer/head filtering, wrong dimensions raise
- `num_layers`, `num_heads`: correct counts
- `format_special_chars`: handles Ġ, ▁, </w> prefixes

**View Generation**
- `head_view` and `model_view` return HTML with `<script>` tags
- Sentence pair support with `sentence_b_start`
- Layer filtering with `include_layers`
- Dark mode support
- Invalid `html_action` raises ValueError
- Missing tokens raises ValueError
