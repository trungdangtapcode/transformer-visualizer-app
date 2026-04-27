from fastapi import FastAPI, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import uvicorn
from transformers import AutoTokenizer, AutoModel, utils
from bertviz import model_view, head_view
from bertviz.neuron_view import show as neuron_view_show
from bertviz.transformers_neuron_view import RobertaModel as NeuronRobertaModel

utils.logging.set_verbosity_error()

app = FastAPI(title="BertViz UI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

templates = Jinja2Templates(directory="templates")

model_version = 'vinai/phobert-base'

print(f"Loading standard models for model_view & head_view ({model_version})...")
tokenizer = AutoTokenizer.from_pretrained(model_version)
model = AutoModel.from_pretrained(model_version, output_attentions=True)

print("All Models loaded successfully.")

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse(request=request, name="index.html")

@app.post("/visualize", response_class=HTMLResponse)
async def generate_visualization(
    view_type: str = Form("model_view"),
    sentence_a: str = Form(...),
    sentence_b: str = Form(None)
):
    try:
        if sentence_b and sentence_b.strip() == "":
            sentence_b = None
            
        if view_type == 'neuron_view':
            return HTMLResponse(content="<div style='color:#f87171; font-family:sans-serif;'><h3>Error:</h3><p>Neuron View is custom-built for basic English BERT/RoBERTa and does not support PhoBERT architecture.</p></div>", status_code=400)

        # For model_view and head_view
        if sentence_b:
            inputs = tokenizer(sentence_a, sentence_b, return_tensors='pt')
            input_ids = inputs['input_ids']
            token_type_ids = inputs['token_type_ids']
            attention = model(input_ids, token_type_ids=token_type_ids).attentions
            sentence_b_start = token_type_ids[0].tolist().index(1)
            token_ids = input_ids[0].tolist()
            tokens = tokenizer.convert_ids_to_tokens(token_ids)
            
            if view_type == 'head_view':
                html_obj = head_view(attention, tokens, sentence_b_start=sentence_b_start, html_action='return')
            else:
                html_obj = model_view(attention, tokens, sentence_b_start=sentence_b_start, html_action='return')
        else:
            inputs = tokenizer(sentence_a, return_tensors='pt')
            input_ids = inputs['input_ids']
            attention = model(input_ids).attentions
            token_ids = input_ids[0].tolist()
            tokens = tokenizer.convert_ids_to_tokens(token_ids)
            
            if view_type == 'head_view':
                html_obj = head_view(attention, tokens, html_action='return')
            else:
                html_obj = model_view(attention, tokens, html_action='return')
            
        return HTMLResponse(content=html_obj.data)
    except Exception as e:
        import traceback
        err_msg = traceback.format_exc()
        return HTMLResponse(content=f"<div style='color:#f87171; font-family:sans-serif;'><h3>Error computing visualization:</h3><pre>{err_msg}</pre></div>", status_code=500)

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
