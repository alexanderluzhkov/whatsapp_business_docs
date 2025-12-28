"""Main CLI for PDF extraction testing."""
import asyncio
import json
import sys
from pathlib import Path
from typing import List, Optional

import typer
from loguru import logger
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table

from config import settings
from src.compare import ResultComparator
from src.extractors import (
    ExtractionResult,
    ModelType,
    create_extractor,
)
from src.parser import PDFParser, ParsingStrategy

app = typer.Typer(help="PDF Compensation Extraction Testing Tool")
console = Console()


# Configure logging
def setup_logging(verbose: bool = False):
    """Configure logging."""
    logger.remove()  # Remove default handler

    log_level = "DEBUG" if verbose else settings.log_level

    # Console logging
    logger.add(
        sys.stderr,
        format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | <level>{message}</level>",
        level=log_level,
        colorize=True,
    )

    # File logging
    if settings.log_file:
        logger.add(
            settings.log_file,
            format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} | {message}",
            level="DEBUG",
            rotation="10 MB",
            retention="1 week",
        )


def load_prompt(query_type: int) -> str:
    """Load prompt template for query type.

    Args:
        query_type: Query type number (1-5)

    Returns:
        Prompt text
    """
    query_files = {
        1: "1_basic_compensation.txt",
        2: "2_detailed_compensation.txt",
        3: "3_equity_plans.txt",
        4: "4_kpi_metrics.txt",
        5: "5_policies_governance.txt",
    }

    if query_type not in query_files:
        raise ValueError(f"Invalid query type: {query_type}. Must be 1-5.")

    prompt_file = settings.prompts_dir / query_files[query_type]

    if not prompt_file.exists():
        raise FileNotFoundError(f"Prompt file not found: {prompt_file}")

    return prompt_file.read_text(encoding='utf-8')


def get_query_name(query_type: int) -> str:
    """Get human-readable query name."""
    names = {
        1: "Basic Compensation",
        2: "Detailed Compensation",
        3: "Equity Plans",
        4: "KPI Metrics",
        5: "Policies & Governance",
    }
    return names.get(query_type, f"Query {query_type}")


@app.command()
def parse(
    pdf_file: Path = typer.Argument(..., help="Path to PDF file"),
    strategy: str = typer.Option("hi_res", help="Parsing strategy: hi_res, fast, ocr_only, auto"),
    use_api: bool = typer.Option(True, help="Use Unstructured API (False for local)"),
    output: Optional[Path] = typer.Option(None, help="Output file for parsed text"),
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Verbose logging"),
):
    """Parse a PDF file and extract text."""
    setup_logging(verbose)

    if not pdf_file.exists():
        console.print(f"[red]Error: File not found: {pdf_file}[/red]")
        raise typer.Exit(1)

    try:
        strategy_enum = ParsingStrategy(strategy)
    except ValueError:
        console.print(f"[red]Error: Invalid strategy. Use: hi_res, fast, ocr_only, or auto[/red]")
        raise typer.Exit(1)

    async def _parse():
        parser = PDFParser()

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            progress.add_task(description=f"Parsing {pdf_file.name}...", total=None)

            result = await parser.parse(pdf_file, strategy_enum, use_api)

        return result

    # Run async function
    result = asyncio.run(_parse())

    if result.error:
        console.print(f"[red]Error parsing PDF: {result.error}[/red]")
        raise typer.Exit(1)

    # Display results
    console.print(f"\n[green]✓ Successfully parsed {pdf_file.name}[/green]")
    console.print(f"Strategy: {result.strategy.value}")
    console.print(f"Characters: {len(result.text):,}")
    console.print(f"Tokens (est.): {result.token_count:,}")
    console.print(f"Parse time: {result.parse_time:.2f}s")

    if result.elements:
        console.print(f"Elements: {len(result.elements)}")

    # Save output
    if output:
        output.write_text(result.text, encoding='utf-8')
        console.print(f"\n[green]Saved to: {output}[/green]")
    else:
        # Default output location
        output_file = settings.output_dir / f"{pdf_file.stem}_parsed.txt"
        output_file.write_text(result.text, encoding='utf-8')
        console.print(f"\n[green]Saved to: {output_file}[/green]")


@app.command()
def extract(
    text_file: Path = typer.Argument(..., help="Path to parsed text file"),
    query: int = typer.Option(..., "--query", "-q", help="Query type (1-5)"),
    model: str = typer.Option("claude-sonnet", help="Model: claude-sonnet, claude-haiku, gpt-4"),
    output: Optional[Path] = typer.Option(None, help="Output JSON file"),
    verbose: bool = typer.Option(False, "--verbose", "-v"),
):
    """Extract compensation data from parsed text using specified model."""
    setup_logging(verbose)

    if not text_file.exists():
        console.print(f"[red]Error: File not found: {text_file}[/red]")
        raise typer.Exit(1)

    # Load text
    text = text_file.read_text(encoding='utf-8')

    # Load prompt
    try:
        prompt = load_prompt(query)
    except (ValueError, FileNotFoundError) as e:
        console.print(f"[red]Error: {e}[/red]")
        raise typer.Exit(1)

    # Create extractor
    try:
        if model == "claude-sonnet":
            model_type = ModelType.CLAUDE_SONNET
        elif model == "claude-haiku":
            model_type = ModelType.CLAUDE_HAIKU
        elif model == "gpt-4":
            model_type = ModelType.GPT4
        else:
            console.print(f"[red]Error: Invalid model. Use: claude-sonnet, claude-haiku, gpt-4[/red]")
            raise typer.Exit(1)

        extractor = create_extractor(model_type)
    except Exception as e:
        console.print(f"[red]Error creating extractor: {e}[/red]")
        raise typer.Exit(1)

    async def _extract():
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            progress.add_task(
                description=f"Extracting with {model}...",
                total=None
            )

            result = await extractor.extract(
                text=text,
                prompt=prompt,
                query_type=query,
                query_name=get_query_name(query),
            )

        return result

    result = asyncio.run(_extract())

    if result.error:
        console.print(f"[red]Error during extraction: {result.error}[/red]")
        raise typer.Exit(1)

    # Display results
    console.print(f"\n[green]✓ Extraction complete[/green]")
    console.print(f"Model: {result.model}")
    console.print(f"Query: {get_query_name(query)}")
    console.print(f"Tokens: {result.total_tokens:,} (input: {result.prompt_tokens:,}, output: {result.completion_tokens:,})")
    console.print(f"Time: {result.extraction_time:.2f}s")
    console.print(f"Cost: ${result.cost_usd:.4f}")

    # Save output
    if not output:
        output = settings.output_dir / f"{text_file.stem}_q{query}_{model}.json"

    with open(output, 'w', encoding='utf-8') as f:
        json.dump(result.to_dict(), f, indent=2, ensure_ascii=False)

    console.print(f"\n[green]Saved to: {output}[/green]")


@app.command()
def compare(
    pdf_file: Path = typer.Argument(..., help="Path to PDF file"),
    queries: str = typer.Option("1,2,3,4,5", help="Comma-separated query types (e.g., '1,2,3')"),
    all_models: bool = typer.Option(True, "--all-models", help="Test all models"),
    models: Optional[str] = typer.Option(None, help="Specific models (comma-separated)"),
    strategy: str = typer.Option("hi_res", help="PDF parsing strategy"),
    use_api: bool = typer.Option(True, help="Use Unstructured API for parsing"),
    verbose: bool = typer.Option(False, "--verbose", "-v"),
):
    """Compare extraction results across multiple models and queries."""
    setup_logging(verbose)

    if not pdf_file.exists():
        console.print(f"[red]Error: File not found: {pdf_file}[/red]")
        raise typer.Exit(1)

    # Parse query list
    try:
        query_list = [int(q.strip()) for q in queries.split(',')]
        for q in query_list:
            if q not in range(1, 6):
                raise ValueError(f"Invalid query: {q}")
    except ValueError as e:
        console.print(f"[red]Error: {e}. Queries must be 1-5.[/red]")
        raise typer.Exit(1)

    # Determine models to test
    if all_models:
        model_types = [ModelType.CLAUDE_SONNET, ModelType.CLAUDE_HAIKU, ModelType.GPT4]
    elif models:
        model_map = {
            'claude-sonnet': ModelType.CLAUDE_SONNET,
            'claude-haiku': ModelType.CLAUDE_HAIKU,
            'gpt-4': ModelType.GPT4,
        }
        try:
            model_types = [model_map[m.strip()] for m in models.split(',')]
        except KeyError as e:
            console.print(f"[red]Error: Invalid model {e}[/red]")
            raise typer.Exit(1)
    else:
        console.print("[red]Error: Specify --all-models or --models[/red]")
        raise typer.Exit(1)

    async def _compare():
        # Parse PDF once
        console.print(f"\n[bold]Parsing {pdf_file.name}...[/bold]")
        parser = PDFParser()
        parse_result = await parser.parse(
            pdf_file,
            ParsingStrategy(strategy),
            use_api
        )

        if parse_result.error:
            console.print(f"[red]Parse error: {parse_result.error}[/red]")
            return None

        console.print(f"[green]✓ Parsed ({parse_result.token_count:,} tokens)[/green]\n")

        # Run extractions
        results: List[ExtractionResult] = []
        total_extractions = len(query_list) * len(model_types)

        with Progress(console=console) as progress:
            task = progress.add_task(
                "[cyan]Extracting...",
                total=total_extractions
            )

            for query_type in query_list:
                prompt = load_prompt(query_type)
                query_name = get_query_name(query_type)

                for model_type in model_types:
                    extractor = create_extractor(model_type)

                    progress.update(
                        task,
                        description=f"[cyan]{model_type.value} - Query {query_type}"
                    )

                    result = await extractor.extract(
                        text=parse_result.text,
                        prompt=prompt,
                        query_type=query_type,
                        query_name=query_name,
                    )

                    results.append(result)
                    progress.advance(task)

        return results

    results = asyncio.run(_compare())

    if not results:
        raise typer.Exit(1)

    # Generate comparison
    comparator = ResultComparator()
    comparator.add_results(results)

    # Display comparison table
    console.print("\n[bold]Comparison Results[/bold]\n")
    df = comparator.generate_comparison_table()
    console.print(df.to_string(index=False))

    # Display summary
    console.print("\n[bold]Summary by Model[/bold]\n")
    summary = comparator.generate_summary_stats()

    table = Table(show_header=True, header_style="bold magenta")
    table.add_column("Model")
    table.add_column("Avg Completeness")
    table.add_column("Avg Time")
    table.add_column("Total Cost")
    table.add_column("Success Rate")

    for model, stats in summary.items():
        table.add_row(
            model.upper(),
            f"{stats['avg_completeness']:.1%}",
            f"{stats['avg_time']:.2f}s",
            f"${stats['total_cost']:.4f}",
            f"{stats['successful_extractions']}/{stats['successful_extractions'] + stats['failed_extractions']}"
        )

    console.print(table)

    # Save results
    output_base = settings.output_dir / pdf_file.stem
    json_output = output_base.with_suffix('.json')
    md_output = output_base.with_suffix('.md')

    comparator.save_results_json(json_output)
    comparator.generate_markdown_report(md_output, pdf_file.name)

    console.print(f"\n[green]Results saved:[/green]")
    console.print(f"  JSON: {json_output}")
    console.print(f"  Report: {md_output}")


@app.command()
def batch(
    folder: Path = typer.Argument(..., help="Folder containing PDF files"),
    queries: str = typer.Option("1,2,3", help="Comma-separated query types"),
    model: str = typer.Option("claude-sonnet", help="Model to use"),
    strategy: str = typer.Option("hi_res", help="Parsing strategy"),
    use_api: bool = typer.Option(True, help="Use Unstructured API"),
    max_concurrent: int = typer.Option(3, help="Max concurrent processing"),
    verbose: bool = typer.Option(False, "--verbose", "-v"),
):
    """Process multiple PDF files in batch mode."""
    setup_logging(verbose)

    if not folder.exists() or not folder.is_dir():
        console.print(f"[red]Error: Folder not found: {folder}[/red]")
        raise typer.Exit(1)

    # Find PDF files
    pdf_files = list(folder.glob("*.pdf"))

    if not pdf_files:
        console.print(f"[red]No PDF files found in {folder}[/red]")
        raise typer.Exit(1)

    console.print(f"Found {len(pdf_files)} PDF files\n")

    # Parse queries
    try:
        query_list = [int(q.strip()) for q in queries.split(',')]
    except ValueError:
        console.print("[red]Error: Invalid query list[/red]")
        raise typer.Exit(1)

    # Create model
    try:
        model_map = {
            'claude-sonnet': ModelType.CLAUDE_SONNET,
            'claude-haiku': ModelType.CLAUDE_HAIKU,
            'gpt-4': ModelType.GPT4,
        }
        model_type = model_map[model]
    except KeyError:
        console.print(f"[red]Error: Invalid model: {model}[/red]")
        raise typer.Exit(1)

    async def _batch_process():
        parser = PDFParser()
        extractor = create_extractor(model_type)

        total_ops = len(pdf_files) * (1 + len(query_list))

        with Progress(console=console) as progress:
            task = progress.add_task("[cyan]Processing batch...", total=total_ops)

            for pdf_file in pdf_files:
                # Parse
                progress.update(task, description=f"[cyan]Parsing {pdf_file.name}")
                parse_result = await parser.parse(
                    pdf_file,
                    ParsingStrategy(strategy),
                    use_api
                )
                progress.advance(task)

                if parse_result.error:
                    console.print(f"[red]Error parsing {pdf_file.name}: {parse_result.error}[/red]")
                    progress.advance(task, len(query_list))
                    continue

                # Extract for each query
                for query_type in query_list:
                    progress.update(
                        task,
                        description=f"[cyan]{pdf_file.name} - Query {query_type}"
                    )

                    prompt = load_prompt(query_type)
                    result = await extractor.extract(
                        text=parse_result.text,
                        prompt=prompt,
                        query_type=query_type,
                        query_name=get_query_name(query_type),
                    )

                    # Save individual result
                    output_file = settings.output_dir / f"{pdf_file.stem}_q{query_type}_{model}.json"
                    with open(output_file, 'w', encoding='utf-8') as f:
                        json.dump(result.to_dict(), f, indent=2, ensure_ascii=False)

                    progress.advance(task)

        console.print(f"\n[green]✓ Batch processing complete![/green]")
        console.print(f"Results saved to: {settings.output_dir}")

    asyncio.run(_batch_process())


if __name__ == "__main__":
    app()
