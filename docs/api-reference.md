# API Reference

## Vite Proxy

The frontend proxies `/api/*` to the FastAPI backend in development:

```
Browser -> http://localhost:5173/api/visualize
Vite    -> http://localhost:8000/visualize  (strips /api prefix)
```

Configured in `frontend/vite.config.ts`:

```ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      rewrite: (p) => p.replace(/^\/api/, ''),
      changeOrigin: true,
    },
  },
},
```

## Endpoints

### GET /

Returns the standalone BertViz web UI (Jinja2 template). Accessible directly at `http://localhost:8000`.

### POST /visualize

Generates an attention visualization for the given Vietnamese text.

**Content-Type:** `multipart/form-data`

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `view_type` | string | No | `model_view` | `model_view` or `head_view` |
| `sentence_a` | string | Yes | -- | Primary input sentence |
| `sentence_b` | string | No | `None` | Optional second sentence for cross-attention |

**Responses:**

| Status | Body | When |
|--------|------|------|
| 200 | HTML string (BertViz visualization) | Success |
| 400 | Error HTML | `neuron_view` requested (incompatible with PhoBERT) |
| 422 | Validation error JSON | `sentence_a` missing |
| 500 | Error HTML with traceback | Server error |

**Examples:**

```bash
# Model view (default)
curl -X POST http://localhost:8000/visualize \
  -F "sentence_a=Con thỏ bỗng nhảy vọt lên." \
  -o model_view.html

# Head view
curl -X POST http://localhost:8000/visualize \
  -F "view_type=head_view" \
  -F "sentence_a=Con thỏ bỗng nhảy vọt lên." \
  -o head_view.html

# Sentence pair
curl -X POST http://localhost:8000/visualize \
  -F "view_type=head_view" \
  -F "sentence_a=Con thỏ nhảy" \
  -F "sentence_b=Con rùa bò" \
  -o pair_view.html
```

## CORS

The backend allows all origins (`allow_origins=["*"]`) for development. Restrict this in production:

```python
# app.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-domain.com"],
    ...
)
```
