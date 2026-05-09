# Combining React + Svelte in a Single Vite Build

This is the core technical document explaining how two incompatible frontend frameworks are compiled and served from one Vite dev server.

## Why This Was Needed

The original project ran 3 separate servers:
- React frontend on port 5173
- Svelte/SvelteKit app on port 5180
- FastAPI backend on port 8000

The React shell embedded the Svelte app via `<iframe src="http://localhost:5180/">`. This caused:
- 3 processes to manage
- Cross-origin iframe issues
- No shared DOM (can't inspect, style, or interact across the boundary)
- Deployment complexity

## The Approach

Vite supports multiple framework plugins. Adding `@sveltejs/vite-plugin-svelte` alongside `@vitejs/plugin-react` lets Vite compile both `.tsx` and `.svelte` files in one build with shared HMR.

## Step-by-Step Breakdown

### 1. Vite Config (vite.config.ts)

```ts
plugins: [
  react(),       // compiles .tsx/.jsx
  svelte(),      // compiles .svelte
  tailwindcss(), // Tailwind CSS 4
],
resolve: {
  alias: {
    "@": "./src",                                    // React alias
    "~": "./src/svelte",                             // Svelte alias
    "tailwindcss/resolveConfig": "./src/svelte/resolveConfig.ts",  // shim
  },
},
css: {
  preprocessorOptions: {
    scss: {
      additionalData: `@use ".../variables.scss" as *;\n`,  // inject SCSS vars
      api: 'modern-compiler',                                // fix Dart Sass warning
    },
  },
},
server: {
  proxy: {
    '/api': { target: 'http://localhost:8000', rewrite: p => p.replace(/^\/api/, '') },
  },
},
```

What each piece does:
- **Two plugins**: Vite routes `.svelte` to the Svelte plugin, `.tsx` to React. No conflicts.
- **`~` alias**: All 50 Svelte components import `~/store`, `~/utils`, etc. This alias resolves to `frontend/src/svelte/`.
- **`resolveConfig` alias**: Redirects a Tailwind 3 API import to our shim (see section 5).
- **SCSS `additionalData`**: Injects z-index variables (`$VECTOR_INDEX`, `$TOP_BAR_INDEX`, etc.) into every `<style lang="scss">` block.
- **Vite proxy**: Frontend calls `/api/visualize` instead of hardcoded `http://127.0.0.1:8000`.

### 2. React-Svelte Bridge (SvelteMount.tsx)

A React component that mounts Svelte directly into the DOM:

```tsx
import { useRef, useEffect } from 'react'
import { mount, unmount } from 'svelte'
import TransformerApp from './svelte/TransformerApp.svelte'

export default function SvelteMount() {
  const containerRef = useRef<HTMLDivElement>(null)
  const instanceRef = useRef<ReturnType<typeof mount> | null>(null)

  useEffect(() => {
    if (containerRef.current && !instanceRef.current) {
      instanceRef.current = mount(TransformerApp, { target: containerRef.current })
    }
    return () => {
      if (instanceRef.current) {
        unmount(instanceRef.current)
        instanceRef.current = null
      }
    }
  }, [])

  return <div ref={containerRef} className="w-full h-full" />
}
```

How it works:
- `mount()` is Svelte 5's API to imperatively create a component instance on a DOM node.
- `unmount()` cleans it up when React unmounts the wrapper.
- The Svelte app renders directly in React's DOM tree. No iframe.

In `App.tsx`, the transformer tab just renders:

```tsx
function TransformerExplorerTab() {
  return <SvelteMount />
}
```

### 3. SvelteKit Removal

The original app was a SvelteKit project. Only 3 files used SvelteKit APIs:

| File | SvelteKit import | Replacement |
|------|-----------------|-------------|
| `+page.svelte` | `import { base } from '$app/paths'` | Hardcoded `/model-v2/...` |
| `+layout.svelte` | `import { page } from '$app/stores'` | `new URL(window.location.href).searchParams` |
| `Topbar.svelte` | `import { page } from '$app/stores'` | `isAboutPage = false` (no router in embedded context) |

The two route files (`+page.svelte` + `+layout.svelte`) were merged into one `TransformerApp.svelte`:
- Layout's `<slot />` was replaced by inlining the page content
- Layout's `onMount` and page's `onMount` were merged into one
- Flowbite's `<Spinner>` was replaced with a CSS spinner (avoids the import)

No other Svelte component needed changes. Everything else (`~/store`, `~/utils`, `~/components`) worked as-is.

### 4. SCSS Migration

**Problem**: `@import` is deprecated in Dart Sass 2.0.

The Svelte project injected SCSS variables globally:
```js
// Old
scss: { additionalData: `@import 'src/styles/variables.scss';` }
```

**Fix**:
```js
// New
scss: {
  additionalData: `@use ".../variables.scss" as *;\n`,
  api: 'modern-compiler',
}
```

`@use ... as *` makes all variables available without a namespace, so `$VECTOR_INDEX` still works everywhere without touching any component code.

### 5. Tailwind CSS 3 to 4

**Problem**: 174 SCSS blocks used `theme('colors.gray.400')` which doesn't exist in Tailwind 4.

**Fix**: Batch replace to CSS custom properties:
```scss
// Old
color: theme('colors.gray.400');

// New
color: var(--color-gray-400);
```

Also updated `app.css`:
```css
/* Old (Tailwind 3) */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* New (Tailwind 4) */
@import "tailwindcss";
```

### 6. tailwindcss/resolveConfig Shim

**Problem**: 12 files import `tailwindcss/resolveConfig` for runtime JS access to theme colors (D3 scales, canvas). Tailwind 4 removed this export.

**Fix**: A shim at `src/svelte/resolveConfig.ts` that exports all default Tailwind colors:

```ts
const defaultColors = {
  gray:  { 50:'#f9fafb', 100:'#f3f4f6', ..., 950:'#030712' },
  blue:  { 50:'#eff6ff', ..., 950:'#172554' },
  // ... all 22 color scales
}

export default function resolveConfig(config) {
  return { theme: { colors: { ...defaultColors, ...config?.theme?.extend?.colors } } }
}
```

A Vite alias redirects the import transparently -- zero changes to the Svelte component code:
```ts
"tailwindcss/resolveConfig": "./src/svelte/resolveConfig.ts"
```

### 7. Svelte 4 to 5

**Problem**: `@sveltejs/vite-plugin-svelte@7` (needed for Vite 8) requires Svelte 5. The Transformer Explorer was written for Svelte 4.

**Fix**: Svelte 5 auto-detects Svelte 4 syntax and runs in legacy mode. All patterns work:

| Pattern | Works in Svelte 5 |
|---------|-------------------|
| `$:` reactive statements | Yes (legacy mode) |
| `export let` props | Yes |
| `on:click` handlers | Yes |
| `<slot />` | Yes |
| `$store` subscriptions | Yes |
| `transition:fade` | Yes |

`svelte.config.js` suppresses non-critical warnings:
```js
warningFilter: (warning) => {
  if (warning.code?.startsWith('a11y')) return false
  if (warning.code?.startsWith('legacy')) return false
  return true
}
```

`flowbite-svelte@0.46` (declares Svelte 4 peer dep) was installed with `--legacy-peer-deps` and works under legacy mode.

## Summary of Changes

| Area | Files changed | Effort |
|------|--------------|--------|
| Vite config | 1 file | Low |
| Svelte config | 1 new file | Low |
| SvelteMount bridge | 1 new file (28 lines) | Low |
| TransformerApp root | 1 new file (merged from 2) | Medium |
| SvelteKit removal | 1 component (Topbar.svelte) | Low |
| SCSS @import to @use | 0 component files (config only) | Low |
| Tailwind theme() | 174 replacements (batch sed) | Low |
| resolveConfig shim | 1 new file + 16 import path fixes | Low |
| tailwind.config shim | 1 new file | Low |
| App.tsx | iframe removed, SvelteMount added, proxy URL | Low |
| Tests | 26 tests updated | Medium |
| start.sh | 3 processes to 2 | Low |
