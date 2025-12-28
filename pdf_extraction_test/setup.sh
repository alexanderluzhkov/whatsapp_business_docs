#!/bin/bash
# Setup script for PDF Extraction Test project

set -e

echo "🚀 Setting up PDF Extraction Test project..."

# Check Python version
echo "Checking Python version..."
python_version=$(python --version 2>&1 | awk '{print $2}')
required_version="3.9"

if [ "$(printf '%s\n' "$required_version" "$python_version" | sort -V | head -n1)" != "$required_version" ]; then
    echo "❌ Error: Python $required_version or higher is required (found $python_version)"
    exit 1
fi
echo "✓ Python $python_version detected"

# Create virtual environment
echo ""
echo "Creating virtual environment..."
if [ ! -d "venv" ]; then
    python -m venv venv
    echo "✓ Virtual environment created"
else
    echo "✓ Virtual environment already exists"
fi

# Activate virtual environment
echo ""
echo "Activating virtual environment..."
source venv/bin/activate
echo "✓ Virtual environment activated"

# Install dependencies
echo ""
echo "Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt
echo "✓ Dependencies installed"

# Create .env from template
echo ""
if [ ! -f ".env" ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "✓ .env file created"
    echo ""
    echo "⚠️  IMPORTANT: Edit .env file and add your API keys:"
    echo "   - ANTHROPIC_API_KEY"
    echo "   - OPENAI_API_KEY"
    echo "   - UNSTRUCTURED_API_KEY (optional)"
else
    echo "✓ .env file already exists"
fi

# Create directories
echo ""
echo "Creating data directories..."
mkdir -p data/input data/output logs
echo "✓ Directories created"

# Run tests
echo ""
echo "Running tests..."
if pytest tests/ -v; then
    echo "✓ All tests passed"
else
    echo "⚠️  Some tests failed - check test output above"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Activate virtual environment: source venv/bin/activate"
echo "2. Edit .env file and add your API keys"
echo "3. Place PDF files in data/input/"
echo "4. Run: python main.py compare data/input/your_file.pdf"
echo ""
echo "For help: python main.py --help"
