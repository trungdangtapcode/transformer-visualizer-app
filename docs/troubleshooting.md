# Troubleshooting

## PhoBERT model download is slow or fails

The first backend start downloads `vinai/phobert-base` (~500 MB). Pre-download it:

```bash
source venv/bin/activate
python -c "from transformers import AutoTokenizer, AutoModel; \
  AutoTokenizer.from_pretrained('vinai/phobert-base'); \
  AutoModel.from_pretrained('vinai/phobert-base')"
```

## Port already in use

```bash
lsof -ti:5173 | xargs kill -9   # Frontend
lsof -ti:8000 | xargs kill -9   # Backend
```

## Sass @import deprecation warnings

If you see `Deprecation Warning [import]: Sass @import rules are deprecated`:

Ensure `vite.config.ts` has:
```ts
scss: {
  additionalData: `@use "..." as *;\n`,
  api: 'modern-compiler',
}
```

If any new SCSS code is added, use `@use` instead of `@import`.

## Sass legacy-js-api warning

`Deprecation Warning [legacy-js-api]: The legacy JS API is deprecated`

Set `api: 'modern-compiler'` in the SCSS preprocessor options (already done in `vite.config.ts`).

## tailwindcss/resolveConfig error

`Error: "./resolveConfig" is not exported from package tailwindcss`

This means the Vite alias is not working. Check that `vite.config.ts` has:
```ts
resolve: {
  alias: {
    "tailwindcss/resolveConfig": path.resolve(__dirname, "./src/svelte/resolveConfig.ts"),
  }
}
```

## theme() function errors in Svelte styles

`Could not resolve value for theme function: theme(colors.gray.400)`

The `theme()` function is Tailwind CSS 3 syntax. In Tailwind 4, replace with CSS variables:
```scss
// Old
color: theme('colors.gray.400');

// New
color: var(--color-gray-400);
```

## Svelte legacy mode warnings in console

Messages like `Component is using legacy mode` are informational. Svelte 5 auto-detects Svelte 4 syntax. The `svelte.config.js` `warningFilter` suppresses most of these in build output.

## flowbite-svelte peer dependency warning

`npm warn peer dep: svelte@"^4.0.0"` when installing. This is expected -- `flowbite-svelte@0.46` declares Svelte 4 as a peer dep but works under Svelte 5's legacy mode. Install with `--legacy-peer-deps`.

## "Neuron View" returns an error

Expected behavior. Neuron view requires custom model wrappers only built for standard English BERT/GPT-2/RoBERTa. PhoBERT's architecture is not compatible. The UI returns a 400 error with an explanation.

## Tests hang or timeout

If `npm test` hangs, the `SvelteMount` mock may not be working. Ensure the test file has:
```ts
vi.mock('../SvelteMount', () => ({
  default: () => <div data-testid="svelte-mount">Transformer Explorer</div>,
}))
```

The mock must be declared before `import App from '../App'`.

## Missing @testing-library/dom

```
Error: Cannot find module '@testing-library/dom'
```

```bash
cd frontend
npm install -D @testing-library/dom --legacy-peer-deps
```

## ONNX model chunks not loading in dev

Check that the symlinks exist:
```bash
ls -la frontend/public/model-v2
# Should show: model-v2 -> ../../transformer-explainer/static/model-v2
```

If broken, recreate:
```bash
cd frontend/public
ln -sf ../../transformer-explainer/static/model-v2 model-v2
ln -sf ../../transformer-explainer/static/article_assets article_assets
```

## Backend returns CORS errors

Verify `app.py` has:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

In production, use the Vite proxy (`/api/*`) so the browser never makes cross-origin requests.
