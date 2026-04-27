from transformers import AutoTokenizer, AutoModel
import torch

model_name = "vinai/phobert-base"
try:
    print(f"Loading {model_name} standard...")
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModel.from_pretrained(model_name, output_attentions=True)
    
    inputs = tokenizer("Tôi là sinh viên", return_tensors='pt')
    outputs = model(**inputs)
    attention = outputs.attentions
    print("Standard model worked, attention layers:", len(attention))

except Exception as e:
    import traceback
    traceback.print_exc()

try:
    print(f"Loading {model_name} neuron_view...")
    from bertviz.transformers_neuron_view import RobertaModel, RobertaTokenizer
    neuron_tokenizer = RobertaTokenizer.from_pretrained(model_name)
    neuron_model = RobertaModel.from_pretrained(model_name, output_attentions=True)
    inputs = neuron_tokenizer("Tôi là sinh viên", return_tensors='pt')
    outputs = neuron_model(inputs['input_ids'])
    print("Neuron model worked, types:", type(outputs))
except Exception as e:
    import traceback
    traceback.print_exc()

