"""LLM extractors for compensation data."""
import asyncio
import json
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional

from anthropic import AsyncAnthropic
from loguru import logger
from openai import AsyncOpenAI
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)

from config import settings


class ModelType(str, Enum):
    """Supported LLM models."""
    CLAUDE_SONNET = "claude-sonnet"
    CLAUDE_HAIKU = "claude-haiku"
    GPT4 = "gpt-4"


@dataclass
class ExtractionResult:
    """Result of LLM extraction."""
    model: str
    query_type: int
    query_name: str
    extracted_data: Optional[Dict[str, Any]] = None
    raw_response: str = ""
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    extraction_time: float = 0.0
    cost_usd: float = 0.0
    error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'model': self.model,
            'query_type': self.query_type,
            'query_name': self.query_name,
            'extracted_data': self.extracted_data,
            'raw_response': self.raw_response,
            'tokens': {
                'prompt': self.prompt_tokens,
                'completion': self.completion_tokens,
                'total': self.total_tokens,
            },
            'extraction_time': self.extraction_time,
            'cost_usd': self.cost_usd,
            'error': self.error,
            'metadata': self.metadata,
        }


class RateLimiter:
    """Token bucket rate limiter for API requests."""

    def __init__(self, requests_per_minute: int):
        self.requests_per_minute = requests_per_minute
        self.min_interval = 60.0 / requests_per_minute
        self.last_request_time = 0.0
        self._lock = asyncio.Lock()

    async def acquire(self):
        """Wait if necessary to maintain rate limit."""
        async with self._lock:
            now = time.time()
            time_since_last = now - self.last_request_time
            if time_since_last < self.min_interval:
                wait_time = self.min_interval - time_since_last
                logger.debug(f"Rate limiting: waiting {wait_time:.2f}s")
                await asyncio.sleep(wait_time)
            self.last_request_time = time.time()


class BaseExtractor(ABC):
    """Base class for LLM extractors."""

    def __init__(self, model_name: str, rate_limit: int):
        self.model_name = model_name
        self.rate_limiter = RateLimiter(rate_limit)

    @abstractmethod
    async def extract(
        self,
        text: str,
        prompt: str,
        query_type: int,
        query_name: str,
    ) -> ExtractionResult:
        """Extract data from text using the model."""
        pass

    def _calculate_cost(
        self,
        prompt_tokens: int,
        completion_tokens: int,
        model: str,
    ) -> float:
        """Calculate API cost in USD.

        Pricing as of 2024 (approximate):
        - Claude Sonnet 4: $3/M input, $15/M output
        - Claude Haiku: $0.25/M input, $1.25/M output
        - GPT-4 Turbo: $10/M input, $30/M output
        """
        pricing = {
            'claude-sonnet': (3.0, 15.0),
            'claude-haiku': (0.25, 1.25),
            'gpt-4': (10.0, 30.0),
        }

        # Determine model category
        model_key = None
        if 'sonnet' in model.lower():
            model_key = 'claude-sonnet'
        elif 'haiku' in model.lower():
            model_key = 'claude-haiku'
        elif 'gpt-4' in model.lower() or 'gpt4' in model.lower():
            model_key = 'gpt-4'

        if model_key and model_key in pricing:
            input_price, output_price = pricing[model_key]
            cost = (prompt_tokens / 1_000_000 * input_price +
                   completion_tokens / 1_000_000 * output_price)
            return round(cost, 6)

        return 0.0

    def _parse_json_response(self, response_text: str) -> Optional[Dict[str, Any]]:
        """Parse JSON from LLM response, handling markdown code blocks."""
        try:
            # Try direct parsing first
            return json.loads(response_text)
        except json.JSONDecodeError:
            # Try to extract JSON from markdown code block
            import re
            json_match = re.search(r'```(?:json)?\s*\n(.*?)\n```', response_text, re.DOTALL)
            if json_match:
                try:
                    return json.loads(json_match.group(1))
                except json.JSONDecodeError:
                    pass

            # Try to find JSON object in text
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                try:
                    return json.loads(json_match.group(0))
                except json.JSONDecodeError:
                    pass

            logger.warning("Could not parse JSON from response")
            return None


class ClaudeExtractor(BaseExtractor):
    """Extractor using Claude API."""

    def __init__(
        self,
        model_type: ModelType = ModelType.CLAUDE_SONNET,
        api_key: Optional[str] = None,
        rate_limit: Optional[int] = None,
    ):
        model_name = (
            settings.claude_sonnet_model if model_type == ModelType.CLAUDE_SONNET
            else settings.claude_haiku_model
        )
        rpm = rate_limit or settings.anthropic_rpm
        super().__init__(model_name, rpm)

        self.client = AsyncAnthropic(api_key=api_key or settings.anthropic_api_key)
        self.model_type = model_type

        logger.info(f"Claude extractor initialized: {model_name}")

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=60),
        retry=retry_if_exception_type((asyncio.TimeoutError, Exception)),
        reraise=True,
    )
    async def extract(
        self,
        text: str,
        prompt: str,
        query_type: int,
        query_name: str,
    ) -> ExtractionResult:
        """Extract data using Claude.

        Args:
            text: Parsed PDF text
            prompt: System prompt for extraction
            query_type: Query type number (1-5)
            query_name: Query name

        Returns:
            ExtractionResult
        """
        await self.rate_limiter.acquire()

        start_time = time.time()

        try:
            logger.info(f"Extracting with Claude ({self.model_type.value}): query {query_type}")

            # Build messages
            user_message = f"{prompt}\n\nDocument text:\n\n{text}"

            response = await asyncio.wait_for(
                self.client.messages.create(
                    model=self.model_name,
                    max_tokens=settings.max_output_tokens,
                    messages=[
                        {"role": "user", "content": user_message}
                    ],
                    temperature=0,  # Deterministic for data extraction
                ),
                timeout=settings.api_timeout,
            )

            extraction_time = time.time() - start_time

            # Extract response text
            response_text = ""
            if response.content:
                response_text = response.content[0].text

            # Parse JSON
            extracted_data = self._parse_json_response(response_text)

            # Calculate cost
            prompt_tokens = response.usage.input_tokens
            completion_tokens = response.usage.output_tokens
            total_tokens = prompt_tokens + completion_tokens
            cost = self._calculate_cost(prompt_tokens, completion_tokens, self.model_name)

            logger.info(
                f"Claude extraction complete: {total_tokens} tokens, "
                f"${cost:.4f}, {extraction_time:.2f}s"
            )

            return ExtractionResult(
                model=self.model_name,
                query_type=query_type,
                query_name=query_name,
                extracted_data=extracted_data,
                raw_response=response_text,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens,
                extraction_time=extraction_time,
                cost_usd=cost,
                metadata={
                    'stop_reason': response.stop_reason,
                    'model_type': self.model_type.value,
                },
            )

        except asyncio.TimeoutError:
            error_msg = f"Timeout after {settings.api_timeout}s"
            logger.error(error_msg)
            return ExtractionResult(
                model=self.model_name,
                query_type=query_type,
                query_name=query_name,
                extraction_time=time.time() - start_time,
                error=error_msg,
            )
        except Exception as e:
            logger.error(f"Claude extraction error: {str(e)}")
            return ExtractionResult(
                model=self.model_name,
                query_type=query_type,
                query_name=query_name,
                extraction_time=time.time() - start_time,
                error=str(e),
            )


class OpenAIExtractor(BaseExtractor):
    """Extractor using OpenAI API."""

    def __init__(
        self,
        model_name: Optional[str] = None,
        api_key: Optional[str] = None,
        rate_limit: Optional[int] = None,
    ):
        model = model_name or settings.openai_gpt4_model
        rpm = rate_limit or settings.openai_rpm
        super().__init__(model, rpm)

        self.client = AsyncOpenAI(api_key=api_key or settings.openai_api_key)

        logger.info(f"OpenAI extractor initialized: {model}")

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=60),
        retry=retry_if_exception_type((asyncio.TimeoutError, Exception)),
        reraise=True,
    )
    async def extract(
        self,
        text: str,
        prompt: str,
        query_type: int,
        query_name: str,
    ) -> ExtractionResult:
        """Extract data using OpenAI GPT-4.

        Args:
            text: Parsed PDF text
            prompt: System prompt for extraction
            query_type: Query type number (1-5)
            query_name: Query name

        Returns:
            ExtractionResult
        """
        await self.rate_limiter.acquire()

        start_time = time.time()

        try:
            logger.info(f"Extracting with OpenAI ({self.model_name}): query {query_type}")

            # Build messages
            response = await asyncio.wait_for(
                self.client.chat.completions.create(
                    model=self.model_name,
                    messages=[
                        {"role": "system", "content": prompt},
                        {"role": "user", "content": f"Document text:\n\n{text}"}
                    ],
                    temperature=0,
                    max_tokens=settings.max_output_tokens,
                    response_format={"type": "json_object"},  # Request JSON output
                ),
                timeout=settings.api_timeout,
            )

            extraction_time = time.time() - start_time

            # Extract response text
            response_text = ""
            if response.choices and response.choices[0].message.content:
                response_text = response.choices[0].message.content

            # Parse JSON
            extracted_data = self._parse_json_response(response_text)

            # Calculate cost
            prompt_tokens = response.usage.prompt_tokens
            completion_tokens = response.usage.completion_tokens
            total_tokens = response.usage.total_tokens
            cost = self._calculate_cost(prompt_tokens, completion_tokens, self.model_name)

            logger.info(
                f"OpenAI extraction complete: {total_tokens} tokens, "
                f"${cost:.4f}, {extraction_time:.2f}s"
            )

            return ExtractionResult(
                model=self.model_name,
                query_type=query_type,
                query_name=query_name,
                extracted_data=extracted_data,
                raw_response=response_text,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens,
                extraction_time=extraction_time,
                cost_usd=cost,
                metadata={
                    'finish_reason': response.choices[0].finish_reason,
                },
            )

        except asyncio.TimeoutError:
            error_msg = f"Timeout after {settings.api_timeout}s"
            logger.error(error_msg)
            return ExtractionResult(
                model=self.model_name,
                query_type=query_type,
                query_name=query_name,
                extraction_time=time.time() - start_time,
                error=error_msg,
            )
        except Exception as e:
            logger.error(f"OpenAI extraction error: {str(e)}")
            return ExtractionResult(
                model=self.model_name,
                query_type=query_type,
                query_name=query_name,
                extraction_time=time.time() - start_time,
                error=str(e),
            )


def create_extractor(model_type: ModelType) -> BaseExtractor:
    """Factory function to create appropriate extractor.

    Args:
        model_type: Type of model to use

    Returns:
        Appropriate extractor instance
    """
    if model_type in (ModelType.CLAUDE_SONNET, ModelType.CLAUDE_HAIKU):
        return ClaudeExtractor(model_type=model_type)
    elif model_type == ModelType.GPT4:
        return OpenAIExtractor()
    else:
        raise ValueError(f"Unknown model type: {model_type}")
