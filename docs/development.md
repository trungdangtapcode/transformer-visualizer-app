# Development

## Running

### Option A: start.sh (both services)

```bash
./start.sh
```

Launches FastAPI (port 8000) and the Vite dev server (port 5173) as background processes. `Ctrl+C` stops both.

### Option B: manual (two terminals)

```bash
# Terminal 1
source venv/bin/activate
python -m uvicorn app:app --host 0.0.0.0 --port 8000

# Terminal 2
cd frontend
npm run dev
```

Open **http://localhost:5173**.

## Project Structure

```
frontend/src/
  ├── App.tsx                 # React shell -- tabs, Attention Analyzer UI
  ├── App.css                 # React global styles
  ├── SvelteMount.tsx         # React component that mounts Svelte into DOM
  ├── main.tsx                # React entry point
  ├── components/ui/          # shadcn/ui (Select, Label, Button, etc.)
  ├── test/
  │   ├── App.test.tsx        # 26 Vitest tests
  │   └── setup.ts            # jsdom setup
  └── svelte/                 # All Svelte source (ported from transformer-explainer)
      ├── TransformerApp.svelte   # Root component
      ├── resolveConfig.ts        # tailwindcss/resolveConfig shim
      ├── tailwind.config.ts      # Runtime theme color config
      ├── components/             # 50 Svelte components
      ├── store/index.ts          # Svelte stores
      ├── utils/                  # Data, animation, ONNX, tokenizer
      ├── constants/              # Example data, gradients, opacity
      ├── styles/                 # SCSS variables, global styles
      └── types/                  # TypeScript declarations
```

## HMR

Both frameworks have hot module replacement:
- Edit a `.tsx` file -- React fast refresh updates the component
- Edit a `.svelte` file -- Svelte HMR updates the component

Both work simultaneously because Vite runs both plugins in the same dev server.

## Path Aliases

| Alias | Resolves to | Used by |
|-------|-------------|---------|
| `@/` | `frontend/src/` | React components |
| `~/` | `frontend/src/svelte/` | Svelte components, stores, utils |

Configured in `vite.config.ts` and `tsconfig.app.json`.

## Static Assets

The GPT-2 ONNX model chunks (525 MB) are stored in `transformer-explainer/static/model-v2/`. The frontend accesses them via symlinks:

```
frontend/public/model-v2       -> ../../transformer-explainer/static/model-v2
frontend/public/article_assets -> ../../transformer-explainer/static/article_assets
```

Vite serves files in `public/` at the root, so the Svelte app loads chunks from `/model-v2/gpt2.onnx.part0`, etc.

## Adding a New Svelte Component

1. Create the file in `frontend/src/svelte/components/`
2. Import with `import MyComponent from '~/components/MyComponent.svelte'`
3. Use in any other `.svelte` file as normal

## Adding a New React Component

1. Create the file in `frontend/src/components/`
2. Import with `import MyComponent from '@/components/MyComponent'`
3. Use in `.tsx` files as normal

## Linting

```bash
cd frontend
npm run lint
```

## Build for Production

```bash
cd frontend
npm run build    # outputs to frontend/dist/
npm run preview  # preview the production build
```

Note: production builds need a reverse proxy (nginx, Caddy) to route `/api/*` to the FastAPI backend since the Vite proxy only works in dev mode.
