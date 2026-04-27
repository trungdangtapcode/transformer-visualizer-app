from transformers import AutoTokenizer, AutoModel, utils
utils.logging.set_verbosity_error()

model_version = 'bert-base-uncased'
sentence_a = "the rabbit quickly hopped"
sentence_b = "The turtle slowly crawled"

model = AutoModel.from_pretrained(model_version, output_attentions=True, return_dict=False)
tokenizer = AutoTokenizer.from_pretrained(model_version)
inputs = tokenizer(sentence_a, sentence_b, return_tensors='pt')

input_ids = inputs['input_ids']
token_type_ids = inputs['token_type_ids'] 
print("Running model...")
outputs = model(input_ids, token_type_ids=token_type_ids)
print("Outputs len:", len(outputs))
for i, o in enumerate(outputs):
    if type(o) is tuple:
        print(f"Output {i} is a tuple of length {len(o)}")
    else:
        print(f"Output {i} type: {type(o)}")

attention = outputs[-1]
from bertviz.util import num_heads
try:
    print("Num heads:", num_heads(attention))
    print("Success with return_dict=False")
except Exception as e:
    print("Error:", e)
