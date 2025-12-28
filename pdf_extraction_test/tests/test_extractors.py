"""Tests for extractors module."""
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.extractors import (
    BaseExtractor,
    ClaudeExtractor,
    ExtractionResult,
    ModelType,
    OpenAIExtractor,
    RateLimiter,
)


@pytest.mark.asyncio
async def test_rate_limiter():
    """Test rate limiter functionality."""
    import time

    limiter = RateLimiter(requests_per_minute=60)  # 1 per second

    start = time.time()

    # First request should be immediate
    await limiter.acquire()
    first_time = time.time() - start
    assert first_time < 0.1

    # Second request should wait ~1 second
    await limiter.acquire()
    second_time = time.time() - start
    assert second_time >= 0.9  # Should wait at least 0.9s


def test_base_extractor_calculate_cost():
    """Test cost calculation."""

    class TestExtractor(BaseExtractor):
        async def extract(self, text, prompt, query_type, query_name):
            pass

    extractor = TestExtractor(model_name="test", rate_limit=60)

    # Test Claude Sonnet pricing ($3/M input, $15/M output)
    cost = extractor._calculate_cost(
        prompt_tokens=1000,
        completion_tokens=1000,
        model="claude-sonnet-4-20250514"
    )
    expected = (1000 / 1_000_000 * 3.0) + (1000 / 1_000_000 * 15.0)
    assert cost == pytest.approx(expected, abs=0.000001)

    # Test Claude Haiku pricing ($0.25/M input, $1.25/M output)
    cost = extractor._calculate_cost(
        prompt_tokens=1000,
        completion_tokens=1000,
        model="claude-3-5-haiku-20241022"
    )
    expected = (1000 / 1_000_000 * 0.25) + (1000 / 1_000_000 * 1.25)
    assert cost == pytest.approx(expected, abs=0.000001)


def test_parse_json_response():
    """Test JSON parsing from various response formats."""

    class TestExtractor(BaseExtractor):
        async def extract(self, text, prompt, query_type, query_name):
            pass

    extractor = TestExtractor(model_name="test", rate_limit=60)

    # Direct JSON
    response = '{"key": "value"}'
    result = extractor._parse_json_response(response)
    assert result == {"key": "value"}

    # JSON in markdown code block
    response = '```json\n{"key": "value"}\n```'
    result = extractor._parse_json_response(response)
    assert result == {"key": "value"}

    # JSON in code block without language
    response = '```\n{"key": "value"}\n```'
    result = extractor._parse_json_response(response)
    assert result == {"key": "value"}

    # JSON embedded in text
    response = 'Here is the data: {"key": "value"} as requested.'
    result = extractor._parse_json_response(response)
    assert result == {"key": "value"}

    # Invalid JSON
    response = 'This is not JSON'
    result = extractor._parse_json_response(response)
    assert result is None


def test_extraction_result_to_dict():
    """Test ExtractionResult serialization."""
    result = ExtractionResult(
        model="claude-sonnet-4",
        query_type=1,
        query_name="Test Query",
        extracted_data={"test": "data"},
        raw_response='{"test": "data"}',
        prompt_tokens=100,
        completion_tokens=50,
        total_tokens=150,
        extraction_time=5.0,
        cost_usd=0.01,
        error=None,
        metadata={"extra": "info"}
    )

    result_dict = result.to_dict()

    assert result_dict["model"] == "claude-sonnet-4"
    assert result_dict["query_type"] == 1
    assert result_dict["extracted_data"] == {"test": "data"}
    assert result_dict["tokens"]["total"] == 150
    assert result_dict["cost_usd"] == 0.01


@pytest.mark.asyncio
@patch('src.extractors.AsyncAnthropic')
async def test_claude_extractor_extract(mock_anthropic):
    """Test Claude extraction."""
    # Mock response
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text='{"extracted": "data"}')]
    mock_response.usage = MagicMock(
        input_tokens=1000,
        output_tokens=500
    )
    mock_response.stop_reason = "end_turn"

    mock_client = AsyncMock()
    mock_client.messages.create = AsyncMock(return_value=mock_response)
    mock_anthropic.return_value = mock_client

    extractor = ClaudeExtractor(model_type=ModelType.CLAUDE_SONNET)
    extractor.client = mock_client

    result = await extractor.extract(
        text="Test document",
        prompt="Extract data",
        query_type=1,
        query_name="Test"
    )

    assert result.extracted_data == {"extracted": "data"}
    assert result.prompt_tokens == 1000
    assert result.completion_tokens == 500
    assert result.error is None
    assert result.cost_usd > 0


@pytest.mark.asyncio
@patch('src.extractors.AsyncOpenAI')
async def test_openai_extractor_extract(mock_openai):
    """Test OpenAI extraction."""
    # Mock response
    mock_choice = MagicMock()
    mock_choice.message.content = '{"extracted": "data"}'
    mock_choice.finish_reason = "stop"

    mock_response = MagicMock()
    mock_response.choices = [mock_choice]
    mock_response.usage = MagicMock(
        prompt_tokens=1000,
        completion_tokens=500,
        total_tokens=1500
    )

    mock_client = AsyncMock()
    mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
    mock_openai.return_value = mock_client

    extractor = OpenAIExtractor()
    extractor.client = mock_client

    result = await extractor.extract(
        text="Test document",
        prompt="Extract data",
        query_type=1,
        query_name="Test"
    )

    assert result.extracted_data == {"extracted": "data"}
    assert result.prompt_tokens == 1000
    assert result.completion_tokens == 500
    assert result.total_tokens == 1500
    assert result.error is None
    assert result.cost_usd > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
