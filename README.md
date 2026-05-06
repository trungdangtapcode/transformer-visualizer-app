# Vietnamese NLP Visualizer

Interactive visualization of Transformer models for Vietnamese text. Two tools, one app:

- **Transformer Explorer** -- GPT-2 Vietnamese, runs in-browser (Svelte)
- **Attention Analyzer** -- PhoBERT attention patterns via BertViz (React + FastAPI)

Both frameworks (React 19 + Svelte 5) compile in a single Vite build. No iframes, no multi-port setup.

## Quick Start

```bash
# 1. Python backend
source venv/bin/activate
pip install -e . && pip install fastapi uvicorn torch transformers sentencepiece python-multipart

# 2. Frontend
cd frontend && npm install

# 3. Run
./start.sh          # or: uvicorn app:app --port 8000  &  cd frontend && npm run dev
```

Open **http://localhost:5173**.

## Documentation

| Doc | What it covers |
|-----|----------------|
| [Architecture](docs/architecture.md) | System design, service layout, how the two tabs work |
| [Combining React + Svelte](docs/combining-react-svelte.md) | The core technical guide -- Vite config, SvelteMount bridge, shims |
| [Installation](docs/installation.md) | Prerequisites, Python setup, npm setup |
| [Development](docs/development.md) | Running dev servers, HMR, project structure |
| [API Reference](docs/api-reference.md) | FastAPI endpoints, Vite proxy, curl examples |
| [Testing](docs/testing.md) | 26 frontend tests, backend tests, mocking strategy |
| [Migration Log](docs/migration-log.md) | Full changelog: iframe to single build, every file touched |
| [Troubleshooting](docs/troubleshooting.md) | Common errors and fixes |

## License

Apache 2.0 -- see [LICENSE](LICENSE).
