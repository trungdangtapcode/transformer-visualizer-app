# Migration Log: Iframe to Single Vite Build

This documents every change made to combine the React and Svelte apps into one build.

## Before

```
3 servers, 3 ports:
  React shell (5173) --iframe--> Svelte app (5180)
                     --fetch---> FastAPI (8000)
```

## After

```
2 servers, 2 ports:
  React + Svelte (5173) --proxy--> FastAPI (8000)
```

## Files Created

| File | Purpose |
|------|---------|
| `frontend/svelte.config.js` | Svelte preprocessor config + warning filters |
| `frontend/src/SvelteMount.tsx` | React wrapper that mounts Svelte into DOM (28 lines) |
| `frontend/src/svelte/TransformerApp.svelte` | Merged root component (replaces +page.svelte + +layout.svelte) |
| `frontend/src/svelte/resolveConfig.ts` | Shim for `tailwindcss/resolveConfig` (Tailwind 4 compat) |
| `frontend/src/svelte/tailwind.config.ts` | Shim for runtime theme color access |
| `frontend/src/svelte/components/**` | All 50 Svelte components (copied from transformer-explainer/src/) |
| `frontend/src/svelte/store/**` | Svelte stores (copied) |
| `frontend/src/svelte/utils/**` | Utility modules (copied) |
| `frontend/src/svelte/constants/**` | Constants (copied) |
| `frontend/src/svelte/styles/**` | SCSS + CSS (copied) |
| `frontend/src/svelte/types/**` | Type declarations (copied) |
| `frontend/public/model-v2` | Symlink to transformer-explainer/static/model-v2 |
| `frontend/public/article_assets` | Symlink to transformer-explainer/static/article_assets |

## Files Modified

| File | Change |
|------|--------|
| `frontend/vite.config.ts` | Added `svelte()` plugin, `~` alias, `resolveConfig` alias, SCSS `@use` + `modern-compiler`, `/api` proxy |
| `frontend/package.json` | Added: svelte, @sveltejs/vite-plugin-svelte, sass, d3, gsap, onnxruntime-web, @xenova/transformers, katex, classnames, flowbite-svelte, flowbite-svelte-icons, bignumber.js, d3-color, d3-sankey, @types/d3, @types/d3-sankey, @testing-library/dom |
| `frontend/tsconfig.json` | Added `~/` path alias |
| `frontend/tsconfig.app.json` | Added `~/` path alias, excluded `.svelte` files |
| `frontend/src/App.tsx` | Removed iframe-based `TransformerExplorerTab`, replaced with `<SvelteMount />`. Changed fetch URL from `http://127.0.0.1:8000/visualize` to `/api/visualize` |
| `frontend/src/svelte/components/Topbar.svelte` | Removed `import { page } from '$app/stores'`, hardcoded `isAboutPage = false` |
| `frontend/src/svelte/styles/app.css` | Replaced Tailwind 3 `@tailwind` directives with `@import "tailwindcss"` |
| `frontend/src/test/App.test.tsx` | Rewrote 26 tests: mock SvelteMount, update assertions for new architecture, test proxy URL, test tab switching |
| `start.sh` | Removed Svelte dev server process (3 processes to 2) |

## Batch Changes (no manual editing)

| Change | Files | Count |
|--------|-------|-------|
| `theme('colors.X.Y')` to `var(--color-X-Y)` | All `.svelte` files | 174 replacements |
| `theme('fontFamily.mono')` to `var(--font-mono)` | 1 `.svelte` file | 1 replacement |
| Relative `tailwind.config` imports to `~/tailwind.config` | 16 files (.svelte, .ts) | 16 replacements |

## Dependencies Added to frontend/package.json

### Runtime
```
svelte, @sveltejs/vite-plugin-svelte, onnxruntime-web, @xenova/transformers,
gsap, katex, d3, d3-sankey, d3-color, classnames, bignumber.js,
flowbite, flowbite-svelte, flowbite-svelte-icons
```

### Dev
```
sass, @types/d3, @types/d3-sankey, @testing-library/dom
```

## Version Constraints

| Package | Version | Reason |
|---------|---------|--------|
| `svelte` | 5.x (not 4.x) | `@sveltejs/vite-plugin-svelte@7` requires Svelte 5+ for Vite 8 compat |
| `@sveltejs/vite-plugin-svelte` | 7.x (not 3.x) | v3 requires Vite 5, v7 supports Vite 8 |
| `flowbite-svelte` | 0.46.x | Installed with `--legacy-peer-deps` (declares Svelte 4 peer dep) |
| `sass` | latest | Needed for `<style lang="scss">` preprocessing |
