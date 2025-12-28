"""Configuration module for PDF extraction testing."""
import os
from pathlib import Path
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with environment variable support."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    # API Keys
    anthropic_api_key: str = Field(..., alias="ANTHROPIC_API_KEY")
    openai_api_key: str = Field(..., alias="OPENAI_API_KEY")
    unstructured_api_key: Optional[str] = Field(None, alias="UNSTRUCTURED_API_KEY")
    unstructured_api_url: str = Field(
        "https://api.unstructured.io/general/v0/general",
        alias="UNSTRUCTURED_API_URL"
    )

    # Model configurations
    claude_sonnet_model: str = "claude-sonnet-4-20250514"
    claude_haiku_model: str = "claude-3-5-haiku-20241022"
    openai_gpt4_model: str = "gpt-4-turbo-preview"

    # Rate limiting (requests per minute)
    anthropic_rpm: int = 50
    openai_rpm: int = 60
    unstructured_rpm: int = 30

    # Retry configuration
    max_retries: int = 3
    retry_min_wait: int = 1  # seconds
    retry_max_wait: int = 60  # seconds

    # Timeouts (seconds)
    api_timeout: int = 120

    # Token limits
    max_input_tokens: int = 100000
    max_output_tokens: int = 4096

    # Paths
    project_root: Path = Path(__file__).parent
    data_dir: Path = project_root / "data"
    input_dir: Path = data_dir / "input"
    output_dir: Path = data_dir / "output"
    prompts_dir: Path = project_root / "prompts"

    # Logging
    log_level: str = "INFO"
    log_file: Optional[Path] = project_root / "logs" / "pdf_extraction.log"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Create directories if they don't exist
        self.input_dir.mkdir(parents=True, exist_ok=True)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        if self.log_file:
            self.log_file.parent.mkdir(parents=True, exist_ok=True)


# Global settings instance
settings = Settings()
