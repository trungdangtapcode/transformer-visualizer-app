# Installation

## Prerequisites

- **Node.js** >= 20.0.0 and **npm** >= 10.0.0
- **Python** >= 3.9
- ~1 GB disk for PhoBERT model weights (downloaded on first backend start)
- ~525 MB for GPT-2 Vietnamese ONNX model chunks (in `transformer-explainer/static/model-v2/`)

## 1. Clone

```bash
git clone <repository-url>
cd <repository-directory>
```

## 2. Python Backend

```bash
python -m venv venv
source venv/bin/activate        # Linux / macOS
# venv\Scripts\activate         # Windows

pip install fastapi uvicorn jinja2 python-multipart
pip install torch transformers sentencepiece
pip install -e .                # installs the local bertviz package
```

Optional: pre-download the PhoBERT model so the first API call doesn't block:

```bash
python -c "from transformers import AutoTokenizer, AutoModel; \
  AutoTokenizer.from_pretrained('vinai/phobert-base'); \
  AutoModel.from_pretrained('vinai/phobert-base')"
```

## 3. Frontend

```bash
cd frontend
npm install
```

One install -- both React and Svelte dependencies live in the same `package.json`.

## 4. GPT-2 ONNX Model (525 MB)

The model chunks are too large for git. Copy them from the transformer-explainer directory:

```bash
cp -r transformer-explainer/static/model-v2 frontend/public/model-v2
```

This creates 53 files (`gpt2.onnx.part0` through `gpt2.onnx.part52`, ~10 MB each). The browser caches them after the first load via the Cache API.

## Verify

```bash
# Backend
source venv/bin/activate
python -c "from bertviz import model_view; print('bertviz OK')"

# Frontend
cd frontend
npm test    # should show 30 passing tests

# Model chunks
ls frontend/public/model-v2/ | wc -l   # should show 53
```

## Run

```bash
./start.sh
# Or manually:
# Terminal 1: source venv/bin/activate && python -m uvicorn app:app --host 0.0.0.0 --port 8000
# Terminal 2: cd frontend && npm run dev -- --host 0.0.0.0
```

Open **http://localhost:5173** (or `http://<VM-IP>:5173` if remote).
