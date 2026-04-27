import sys
from transformers import AutoTokenizer, AutoModel, utils
utils.logging.set_verbosity_error()

model_version = 'bert-base-uncased'
sentence_a = "the rabbit quickly hopped"
sentence_b = "The turtle slowly crawled"

model = AutoModel.from_pretrained(model_version, output_attentions=True)
tokenizer = AutoTokenizer.from_pretrained(model_version)
inputs = tokenizer(sentence_a, sentence_b, return_tensors='pt')

outputs = model(inputs['input_ids'], token_type_ids=inputs['token_type_ids'])
attention1 = outputs[-1]
attention2 = outputs.attentions
print("Attention1 type:", type(attention1))
print("Attention2 type:", type(attention2))

from bertviz.util import num_heads
try:
    print("Num heads with attention1:", num_heads(attention1))
except Exception as e:
    print("Error with attention1:", e)

try:
    print("Num heads with attention2:", num_heads(attention2))
except Exception as e:
    print("Error with attention2:", e)
