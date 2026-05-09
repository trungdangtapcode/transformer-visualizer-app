# Architecture

## Overview

Two processes serve the entire application:

```
┌────────────────────────────────────────────────────────────────┐
│            Single Vite Dev Server (port 5173)                  │
│     React 19 + Svelte 5 -- one build, one process              │
│                                                                │
│  ┌────────────────────────┐  ┌───────────────────────────────┐ │
│  │ Tab 1: Transformer     │  │ Tab 2: Attention Analyzer     │ │
│  │        Explorer        │  │                               │ │
│  │                        │  │ sentence input                │ │
│  │ SvelteMount.tsx        │  │   -> POST /api/visualize      │ │
│  │   -> mount(Svelte)     │  │   -> FastAPI backend          │ │
│  │   -> direct DOM        │  │   -> BertViz HTML             │ │
│  │   (no iframe)          │  │   -> <iframe srcdoc>          │ │
│  └────────────────────────┘  └───────────────┬───────────────┘ │
└──────────────────────────────────────────────┼─────────────────┘
                                               │ Vite proxy /api/*
                                               v
                                    ┌──────────────────────┐
                                    │  FastAPI (port 8000)  │
                                    │  PhoBERT model        │
                                    │  BertViz rendering    │
                                    └──────────────────────┘
```

## Services

| Service | Port | Stack | Role |
|---------|------|-------|------|
| Frontend | 5173 | React 19, Svelte 5, Vite 8, Tailwind CSS 4 | Unified app with tab navigation |
| Backend | 8000 | FastAPI, PyTorch, HuggingFace Transformers, BertViz | PhoBERT inference and attention HTML |

## Tab 1: Transformer Explorer

- Built with **Svelte** (50 components, ported from [transformer-explainer](https://github.com/poloclub/transformer-explainer))
- Mounted into the React DOM via `SvelteMount.tsx` -- no iframe
- Runs GPT-2 Vietnamese inference **in the browser** using ONNX Runtime Web
- Visualizations: Sankey diagrams, attention matrices, block transitions (D3.js + GSAP)
- Tokenization: `@xenova/transformers` with `NlpHUST/gpt2-vietnamese`

## Tab 2: Attention Analyzer

- Built with **React** (shadcn/ui components)
- Sends `POST /api/visualize` to FastAPI (proxied by Vite from `/api/*` to `localhost:8000`)
- Backend runs PhoBERT (`vinai/phobert-base`), extracts attention weights
- BertViz generates self-contained HTML, injected into an `<iframe srcdoc>`
- Supports Model View and Head View (Neuron View is incompatible with PhoBERT)

## Tab Switching

Both tabs stay mounted in the DOM. The inactive tab is hidden via CSS `hidden` class. Switching is instant -- no reload, no lost state.

```tsx
<div className={activeTab === "transformer" ? "" : "hidden"}>
  <SvelteMount />
</div>
<div className={activeTab === "attention" ? "" : "hidden"}>
  <AttentionAnalyzerTab />
</div>
```

## Data Flow

### Transformer Explorer
```
User types Vietnamese text
  -> Svelte store updates
  -> ONNX Runtime Web runs GPT-2 forward pass in browser
  -> D3.js renders Sankey / attention visualizations
  -> GSAP animates transitions
```

### Attention Analyzer
```
User types text + clicks Generate
  -> React sends POST /api/visualize (FormData)
  -> Vite proxy forwards to FastAPI on port 8000
  -> FastAPI tokenizes with PhoBERT, runs forward pass
  -> BertViz renders attention HTML
  -> React injects HTML into <iframe srcdoc>
```

## Key Dependencies

### Frontend (single package.json)

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | 19 | UI framework (Attention Analyzer, shell) |
| `svelte` | 5 | UI framework (Transformer Explorer, legacy mode) |
| `vite` | 8 | Build tool (both frameworks) |
| `@sveltejs/vite-plugin-svelte` | 7 | Svelte compilation in Vite |
| `@vitejs/plugin-react` | 6 | React compilation in Vite |
| `tailwindcss` + `@tailwindcss/vite` | 4 | Styling |
| `onnxruntime-web` | 1.23+ | In-browser GPT-2 inference |
| `d3` / `d3-sankey` | 7.9 | Data visualization |
| `gsap` | 3.12+ | Animation |
| `flowbite-svelte` | 0.46 | Svelte UI components (popovers, tooltips) |

### Backend

| Package | Purpose |
|---------|---------|
| `fastapi` + `uvicorn` | HTTP server |
| `torch` + `transformers` | PhoBERT model loading and inference |
| `bertviz` (local) | Attention visualization HTML generation |
