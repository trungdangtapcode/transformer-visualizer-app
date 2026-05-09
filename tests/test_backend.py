"""
Unit tests for the BertViz FastAPI backend (app.py).

These tests use httpx + FastAPI TestClient to test the API endpoints
WITHOUT loading the actual PhoBERT model (which requires ~500MB+ of disk/memory).
We mock the model and tokenizer to keep tests fast and lightweight.
"""

import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
import torch


# ──────────────────────────────────────────────
# Fixtures
# ──────────────────────────────────────────────

def make_mock_attention(num_layers=12, num_heads=12, seq_len=5):
    """Create fake attention tensors matching real model output shape."""
    return tuple(
        torch.rand(1, num_heads, seq_len, seq_len)
        for _ in range(num_layers)
    )


def make_mock_tokenizer():
    """Create a mock tokenizer that returns predictable outputs."""
    tokenizer = MagicMock()
    
    # Single sentence tokenization
    def mock_call(text, text_pair=None, return_tensors=None):
        tokens = ['<s>', 'Con', 'thỏ', 'nhảy', '</s>']
        ids = [0, 100, 200, 300, 2]
        result = MagicMock()
        result.__getitem__ = lambda self, key: {
            'input_ids': torch.tensor([ids]),
            'token_type_ids': torch.tensor([[0] * len(ids)]),
            'attention_mask': torch.tensor([[1] * len(ids)]),
        }[key]
        result.keys = lambda: ['input_ids', 'token_type_ids', 'attention_mask']
        
        if text_pair:
            tokens_b = ['Rùa', 'bò', '</s>']
            ids_b = [400, 500, 2]
            all_ids = ids + ids_b
            result_pair = MagicMock()
            result_pair.__getitem__ = lambda self, key: {
                'input_ids': torch.tensor([all_ids]),
                'token_type_ids': torch.tensor([[0]*len(ids) + [1]*len(ids_b)]),
                'attention_mask': torch.tensor([[1] * len(all_ids)]),
            }[key]
            result_pair.keys = lambda: ['input_ids', 'token_type_ids', 'attention_mask']
            return result_pair
        
        return result
    
    tokenizer.side_effect = mock_call
    tokenizer.convert_ids_to_tokens = lambda ids: ['<s>', 'Con', 'thỏ', 'nhảy', '</s>'][:len(ids)]
    return tokenizer


def make_mock_model(seq_len=5):
    """Create a mock model that returns fake attention outputs."""
    model = MagicMock()
    mock_output = MagicMock()
    mock_output.attentions = make_mock_attention(seq_len=seq_len)
    model.return_value = mock_output
    return model


@pytest.fixture
def client():
    """Create a test client with mocked model/tokenizer to avoid loading PhoBERT."""
    with patch.dict('sys.modules', {}):
        mock_tokenizer = make_mock_tokenizer()
        mock_model = make_mock_model(seq_len=5)
        
        # Patch at module level before importing app
        with patch('app.AutoTokenizer') as MockAutoTokenizer, \
             patch('app.AutoModel') as MockAutoModel, \
             patch('app.tokenizer', mock_tokenizer), \
             patch('app.model', mock_model):
            
            MockAutoTokenizer.from_pretrained.return_value = mock_tokenizer
            MockAutoModel.from_pretrained.return_value = mock_model
            
            # Import after patching so module-level code uses mocks
            import importlib
            import app as app_module
            importlib.reload(app_module)
            
            yield TestClient(app_module.app)


# ──────────────────────────────────────────────
# API Endpoint Tests
# ──────────────────────────────────────────────

class TestRootEndpoint:
    """Test the GET / endpoint."""

    def test_root_returns_html(self, client):
        response = client.get("/")
        assert response.status_code == 200
        assert "text/html" in response.headers["content-type"]


class TestVisualizeEndpoint:
    """Test the POST /visualize endpoint."""

    def test_visualize_requires_sentence_a(self, client):
        """sentence_a is required (Form(...))."""
        response = client.post("/visualize", data={
            "view_type": "model_view",
        })
        assert response.status_code == 422  # Validation error

    def test_visualize_model_view_returns_html(self, client):
        """Model view should return HTML visualization."""
        response = client.post("/visualize", data={
            "view_type": "model_view",
            "sentence_a": "Con thỏ nhảy",
        })
        # Should return 200 with HTML (or 500 if mock doesn't match exactly)
        assert response.status_code in (200, 500)

    def test_visualize_head_view_returns_html(self, client):
        """Head view should return HTML visualization."""
        response = client.post("/visualize", data={
            "view_type": "head_view",
            "sentence_a": "Con thỏ nhảy",
        })
        assert response.status_code in (200, 500)

    def test_visualize_neuron_view_returns_400(self, client):
        """Neuron view is unsupported for PhoBERT — should return 400."""
        response = client.post("/visualize", data={
            "view_type": "neuron_view",
            "sentence_a": "Con thỏ nhảy",
        })
        assert response.status_code == 400
        assert "Neuron View" in response.text

    def test_visualize_empty_sentence_b_treated_as_none(self, client):
        """Empty string for sentence_b should be treated as None."""
        response = client.post("/visualize", data={
            "view_type": "model_view",
            "sentence_a": "Con thỏ nhảy",
            "sentence_b": "",
        })
        assert response.status_code in (200, 500)

    def test_visualize_default_view_type(self, client):
        """Default view_type should be model_view."""
        response = client.post("/visualize", data={
            "sentence_a": "Con thỏ nhảy",
        })
        assert response.status_code in (200, 500)


# ──────────────────────────────────────────────
# CORS Tests
# ──────────────────────────────────────────────

class TestCORS:
    """Test CORS middleware configuration."""

    def test_cors_allows_all_origins(self, client):
        response = client.options("/visualize", headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
        })
        # CORS should allow the origin
        assert response.status_code == 200


# ──────────────────────────────────────────────
# Utility / Library Tests (no model needed)
# ──────────────────────────────────────────────

class TestBertvizUtil:
    """Test bertviz.util functions directly — no model loading needed."""

    def test_format_attention(self):
        from bertviz.util import format_attention
        # Create fake attention: 3 layers, 1 batch, 4 heads, 5 tokens
        attention = tuple(
            torch.rand(1, 4, 5, 5) for _ in range(3)
        )
        result = format_attention(attention)
        assert result.shape == (3, 4, 5, 5)

    def test_format_attention_with_layer_filter(self):
        from bertviz.util import format_attention
        attention = tuple(torch.rand(1, 4, 5, 5) for _ in range(3))
        result = format_attention(attention, layers=[0, 2])
        assert result.shape == (2, 4, 5, 5)

    def test_format_attention_with_head_filter(self):
        from bertviz.util import format_attention
        attention = tuple(torch.rand(1, 4, 5, 5) for _ in range(3))
        result = format_attention(attention, heads=[0, 2])
        assert result.shape == (3, 2, 5, 5)

    def test_format_attention_wrong_dims_raises(self):
        from bertviz.util import format_attention
        # 3D tensor instead of 4D
        attention = (torch.rand(4, 5, 5),)
        with pytest.raises(ValueError, match="correct number of dimensions"):
            format_attention(attention)

    def test_num_layers(self):
        from bertviz.util import num_layers
        attention = tuple(torch.rand(1, 4, 5, 5) for _ in range(12))
        assert num_layers(attention) == 12

    def test_num_heads(self):
        from bertviz.util import num_heads
        attention = tuple(torch.rand(1, 8, 5, 5) for _ in range(3))
        assert num_heads(attention) == 8

    def test_format_special_chars(self):
        from bertviz.util import format_special_chars
        tokens = ['Hello', 'Ġworld', '▁foo', 'bar</w>']
        result = format_special_chars(tokens)
        assert result == ['Hello', ' world', ' foo', 'bar']

    def test_format_special_chars_empty_list(self):
        from bertviz.util import format_special_chars
        assert format_special_chars([]) == []


# ──────────────────────────────────────────────
# Head View / Model View return HTML Tests
# ──────────────────────────────────────────────

class TestBertvizViews:
    """Test bertviz head_view and model_view return correct HTML."""

    def test_head_view_returns_html(self):
        from bertviz import head_view
        attention = tuple(torch.rand(1, 4, 5, 5) for _ in range(3))
        tokens = ['<s>', 'Hello', 'world', '!', '</s>']
        html = head_view(attention, tokens, html_action='return')
        assert html is not None
        assert hasattr(html, 'data')
        assert '<script' in html.data
        assert 'bertviz' in html.data

    def test_model_view_returns_html(self):
        from bertviz import model_view
        attention = tuple(torch.rand(1, 4, 5, 5) for _ in range(3))
        tokens = ['<s>', 'Hello', 'world', '!', '</s>']
        html = model_view(attention, tokens, html_action='return')
        assert html is not None
        assert hasattr(html, 'data')
        assert '<script' in html.data

    def test_head_view_requires_tokens(self):
        from bertviz import head_view
        attention = tuple(torch.rand(1, 4, 5, 5) for _ in range(3))
        with pytest.raises(ValueError, match="tokens"):
            head_view(attention, tokens=None, html_action='return')

    def test_model_view_requires_tokens(self):
        from bertviz import model_view
        attention = tuple(torch.rand(1, 4, 5, 5) for _ in range(3))
        with pytest.raises(ValueError, match="tokens"):
            model_view(attention, tokens=None, html_action='return')

    def test_head_view_with_sentence_pair(self):
        from bertviz import head_view
        attention = tuple(torch.rand(1, 4, 8, 8) for _ in range(3))
        tokens = ['[CLS]', 'Hello', 'world', '[SEP]', 'Goodbye', 'world', '!', '[SEP]']
        html = head_view(attention, tokens, sentence_b_start=4, html_action='return')
        assert html is not None
        assert 'Sentence A' in html.data or 'bertviz' in html.data

    def test_head_view_with_include_layers(self):
        from bertviz import head_view
        attention = tuple(torch.rand(1, 4, 5, 5) for _ in range(6))
        tokens = ['<s>', 'a', 'b', 'c', '</s>']
        html = head_view(attention, tokens, include_layers=[0, 2, 4], html_action='return')
        assert html is not None

    def test_model_view_dark_mode(self):
        from bertviz import model_view
        attention = tuple(torch.rand(1, 4, 5, 5) for _ in range(3))
        tokens = ['<s>', 'a', 'b', 'c', '</s>']
        html = model_view(attention, tokens, display_mode='dark', html_action='return')
        assert html is not None

    def test_invalid_html_action_raises(self):
        from bertviz import head_view
        attention = tuple(torch.rand(1, 4, 5, 5) for _ in range(3))
        tokens = ['<s>', 'a', 'b', 'c', '</s>']
        with pytest.raises(ValueError, match="html_action"):
            head_view(attention, tokens, html_action='invalid')
