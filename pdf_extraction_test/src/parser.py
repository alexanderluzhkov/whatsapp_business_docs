"""PDF parser using Unstructured API."""
import asyncio
import time
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional

import aiofiles
from loguru import logger
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)

try:
    from unstructured_client import UnstructuredClient
    from unstructured_client.models import shared
    from unstructured_client.models.errors import SDKError
    UNSTRUCTURED_AVAILABLE = True
except ImportError:
    UNSTRUCTURED_AVAILABLE = False
    logger.warning("unstructured-client not installed. API parsing will not be available.")

from config import settings


class ParsingStrategy(str, Enum):
    """PDF parsing strategies."""
    HI_RES = "hi_res"
    FAST = "fast"
    OCR_ONLY = "ocr_only"
    AUTO = "auto"


@dataclass
class ParseResult:
    """Result of PDF parsing."""
    file_path: Path
    strategy: ParsingStrategy
    text: str
    elements: Optional[List[Dict]] = None
    metadata: Optional[Dict] = None
    parse_time: float = 0.0
    token_count: Optional[int] = None
    error: Optional[str] = None


class RateLimiter:
    """Simple async rate limiter."""

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


class PDFParser:
    """PDF parser with multiple strategies and retry logic."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        api_url: Optional[str] = None,
        rate_limit: Optional[int] = None,
    ):
        """Initialize PDF parser.

        Args:
            api_key: Unstructured API key (or from settings)
            api_url: Unstructured API URL (or from settings)
            rate_limit: Requests per minute (or from settings)
        """
        self.api_key = api_key or settings.unstructured_api_key
        self.api_url = api_url or settings.unstructured_api_url

        rpm = rate_limit or settings.unstructured_rpm
        self.rate_limiter = RateLimiter(rpm)

        if UNSTRUCTURED_AVAILABLE and self.api_key:
            self.client = UnstructuredClient(
                api_key_auth=self.api_key,
                server_url=self.api_url,
            )
            logger.info("Unstructured API client initialized")
        else:
            self.client = None
            if not UNSTRUCTURED_AVAILABLE:
                logger.warning("Unstructured client not available - install with: pip install unstructured-client")
            else:
                logger.warning("No API key provided - only local parsing available")

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=60),
        retry=retry_if_exception_type((SDKError, asyncio.TimeoutError)) if UNSTRUCTURED_AVAILABLE else retry_if_exception_type(asyncio.TimeoutError),
        reraise=True,
    )
    async def _parse_with_api(
        self,
        file_path: Path,
        strategy: ParsingStrategy = ParsingStrategy.HI_RES,
    ) -> ParseResult:
        """Parse PDF using Unstructured API with retry logic.

        Args:
            file_path: Path to PDF file
            strategy: Parsing strategy to use

        Returns:
            ParseResult with extracted text and metadata
        """
        if not self.client:
            raise RuntimeError("Unstructured API client not initialized")

        await self.rate_limiter.acquire()

        start_time = time.time()

        try:
            logger.info(f"Parsing {file_path.name} with strategy: {strategy.value}")

            # Read file
            async with aiofiles.open(file_path, 'rb') as f:
                file_content = await f.read()

            # Prepare request - run in thread pool since SDK is sync
            loop = asyncio.get_event_loop()

            def _sync_partition():
                req = shared.PartitionParameters(
                    files=shared.Files(
                        content=file_content,
                        file_name=file_path.name,
                    ),
                    strategy=strategy.value,
                    languages=["eng", "rus"],  # Support English and Russian
                    split_pdf_page=True,
                    split_pdf_allow_failed=True,
                    split_pdf_concurrency_level=10,
                )
                return self.client.general.partition(req)

            # Run sync SDK call in thread pool
            response = await asyncio.wait_for(
                loop.run_in_executor(None, _sync_partition),
                timeout=settings.api_timeout,
            )

            parse_time = time.time() - start_time

            # Extract elements
            elements = []
            full_text_parts = []

            if hasattr(response, 'elements') and response.elements:
                for element in response.elements:
                    elem_dict = {
                        'type': element.type if hasattr(element, 'type') else None,
                        'text': element.text if hasattr(element, 'text') else '',
                        'metadata': element.metadata if hasattr(element, 'metadata') else {},
                    }
                    elements.append(elem_dict)

                    if elem_dict['text']:
                        full_text_parts.append(elem_dict['text'])

            full_text = '\n\n'.join(full_text_parts)

            # Estimate token count (rough approximation: 1 token ≈ 4 chars)
            token_count = len(full_text) // 4

            logger.info(
                f"Parsed {file_path.name}: {len(elements)} elements, "
                f"~{token_count} tokens, {parse_time:.2f}s"
            )

            return ParseResult(
                file_path=file_path,
                strategy=strategy,
                text=full_text,
                elements=elements,
                metadata={
                    'num_elements': len(elements),
                    'file_size': file_path.stat().st_size,
                },
                parse_time=parse_time,
                token_count=token_count,
            )

        except Exception as e:
            logger.error(f"Error parsing {file_path.name}: {str(e)}")
            return ParseResult(
                file_path=file_path,
                strategy=strategy,
                text="",
                parse_time=time.time() - start_time,
                error=str(e),
            )

    async def _parse_local(
        self,
        file_path: Path,
        strategy: ParsingStrategy = ParsingStrategy.FAST,
    ) -> ParseResult:
        """Parse PDF locally using unstructured library.

        Args:
            file_path: Path to PDF file
            strategy: Parsing strategy to use

        Returns:
            ParseResult with extracted text
        """
        start_time = time.time()

        try:
            from unstructured.partition.pdf import partition_pdf

            logger.info(f"Parsing {file_path.name} locally with strategy: {strategy.value}")

            # Run in thread pool since partition_pdf is blocking
            loop = asyncio.get_event_loop()
            elements = await loop.run_in_executor(
                None,
                lambda: partition_pdf(
                    filename=str(file_path),
                    strategy=strategy.value,
                    languages=["eng", "rus"],
                )
            )

            parse_time = time.time() - start_time

            # Extract text
            text_parts = [str(elem) for elem in elements if str(elem).strip()]
            full_text = '\n\n'.join(text_parts)

            token_count = len(full_text) // 4

            logger.info(
                f"Parsed {file_path.name} locally: {len(elements)} elements, "
                f"~{token_count} tokens, {parse_time:.2f}s"
            )

            return ParseResult(
                file_path=file_path,
                strategy=strategy,
                text=full_text,
                elements=[{'type': type(e).__name__, 'text': str(e)} for e in elements],
                metadata={'num_elements': len(elements)},
                parse_time=parse_time,
                token_count=token_count,
            )

        except ImportError:
            error_msg = "Local parsing requires: pip install unstructured[pdf]"
            logger.error(error_msg)
            return ParseResult(
                file_path=file_path,
                strategy=strategy,
                text="",
                parse_time=time.time() - start_time,
                error=error_msg,
            )
        except Exception as e:
            logger.error(f"Error parsing {file_path.name} locally: {str(e)}")
            return ParseResult(
                file_path=file_path,
                strategy=strategy,
                text="",
                parse_time=time.time() - start_time,
                error=str(e),
            )

    async def parse(
        self,
        file_path: Path,
        strategy: ParsingStrategy = ParsingStrategy.HI_RES,
        use_api: bool = True,
    ) -> ParseResult:
        """Parse a PDF file.

        Args:
            file_path: Path to PDF file
            strategy: Parsing strategy
            use_api: Whether to use API (True) or local parsing (False)

        Returns:
            ParseResult with extracted text and metadata
        """
        if not file_path.exists():
            logger.error(f"File not found: {file_path}")
            return ParseResult(
                file_path=file_path,
                strategy=strategy,
                text="",
                error="File not found",
            )

        if use_api and self.client:
            return await self._parse_with_api(file_path, strategy)
        else:
            return await self._parse_local(file_path, strategy)

    async def parse_batch(
        self,
        file_paths: List[Path],
        strategy: ParsingStrategy = ParsingStrategy.HI_RES,
        use_api: bool = True,
        max_concurrent: int = 5,
    ) -> List[ParseResult]:
        """Parse multiple PDF files concurrently.

        Args:
            file_paths: List of PDF file paths
            strategy: Parsing strategy
            use_api: Whether to use API or local parsing
            max_concurrent: Maximum concurrent parsing operations

        Returns:
            List of ParseResults
        """
        semaphore = asyncio.Semaphore(max_concurrent)

        async def parse_with_semaphore(path: Path) -> ParseResult:
            async with semaphore:
                return await self.parse(path, strategy, use_api)

        tasks = [parse_with_semaphore(path) for path in file_paths]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Handle exceptions
        parsed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Error parsing {file_paths[i]}: {str(result)}")
                parsed_results.append(
                    ParseResult(
                        file_path=file_paths[i],
                        strategy=strategy,
                        text="",
                        error=str(result),
                    )
                )
            else:
                parsed_results.append(result)

        return parsed_results
