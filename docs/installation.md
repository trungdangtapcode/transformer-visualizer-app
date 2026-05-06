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

## Verify

```bash
# Backend
source venv/bin/activate
python -c "from bertviz import model_view; print('bertviz OK')"

# Frontend
cd frontend
npm test    # should show 26 passing tests
```
