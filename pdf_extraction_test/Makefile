.PHONY: help install test clean run-example lint format

help:
	@echo "Available commands:"
	@echo "  make install       - Install dependencies"
	@echo "  make test          - Run tests"
	@echo "  make test-cov      - Run tests with coverage"
	@echo "  make lint          - Run linters"
	@echo "  make format        - Format code"
	@echo "  make clean         - Clean temporary files"
	@echo "  make run-example   - Run example extraction"

install:
	pip install -r requirements.txt

test:
	pytest tests/ -v

test-cov:
	pytest tests/ --cov=src --cov-report=html --cov-report=term

lint:
	@echo "Running flake8..."
	-flake8 src/ tests/ --max-line-length=100 --ignore=E203,W503
	@echo "Running mypy..."
	-mypy src/ --ignore-missing-imports

format:
	@echo "Formatting with black..."
	black src/ tests/ --line-length=100
	@echo "Sorting imports with isort..."
	isort src/ tests/ --profile black

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".mypy_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "htmlcov" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name ".coverage" -delete

run-example:
	@echo "Note: Place a PDF file in data/input/ first"
	@echo "Example: cp /path/to/report.pdf data/input/"
	@echo ""
	@echo "Running quick extraction test..."
	python main.py compare data/input/*.pdf --queries "1" --models "claude-haiku"
