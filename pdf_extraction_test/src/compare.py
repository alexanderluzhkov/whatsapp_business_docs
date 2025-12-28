"""Comparison and analysis of extraction results."""
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd
from loguru import logger

from src.extractors import ExtractionResult


@dataclass
class ComparisonMetrics:
    """Metrics for comparing extraction results."""
    model: str
    query_type: int
    fields_extracted: int
    total_fields_possible: int
    completeness_score: float  # 0-1
    extraction_time: float
    total_tokens: int
    cost_usd: float
    error: Optional[str] = None


class ResultComparator:
    """Compare and analyze extraction results from different models."""

    def __init__(self):
        self.results: List[ExtractionResult] = []

    def add_result(self, result: ExtractionResult):
        """Add an extraction result for comparison."""
        self.results.append(result)

    def add_results(self, results: List[ExtractionResult]):
        """Add multiple extraction results."""
        self.results.extend(results)

    def _count_fields(self, data: Any, path: str = "") -> int:
        """Recursively count non-null fields in extracted data."""
        if data is None:
            return 0

        count = 0

        if isinstance(data, dict):
            for key, value in data.items():
                if value is not None:
                    if isinstance(value, (dict, list)):
                        count += self._count_fields(value, f"{path}.{key}" if path else key)
                    else:
                        count += 1
        elif isinstance(data, list):
            for i, item in enumerate(data):
                count += self._count_fields(item, f"{path}[{i}]")

        return count

    def _get_expected_field_counts(self) -> Dict[int, int]:
        """Get expected field counts for each query type.

        These are approximate based on the prompt templates.
        """
        return {
            1: 15,   # Basic compensation: company, year, 3-5 executives * ~3 fields
            2: 50,   # Detailed compensation: many components per executive
            3: 40,   # Equity plans: plans + grants with vesting
            4: 60,   # KPI metrics: STI + LTI metrics with targets
            5: 70,   # Policies & governance: extensive policy details
        }

    def calculate_metrics(self) -> List[ComparisonMetrics]:
        """Calculate comparison metrics for all results.

        Returns:
            List of ComparisonMetrics for each result
        """
        expected_fields = self._get_expected_field_counts()
        metrics_list = []

        for result in self.results:
            fields_extracted = 0
            if result.extracted_data:
                fields_extracted = self._count_fields(result.extracted_data)

            total_fields = expected_fields.get(result.query_type, 50)

            # Completeness score (capped at 1.0)
            completeness = min(fields_extracted / total_fields, 1.0) if total_fields > 0 else 0.0

            metrics = ComparisonMetrics(
                model=result.model,
                query_type=result.query_type,
                fields_extracted=fields_extracted,
                total_fields_possible=total_fields,
                completeness_score=completeness,
                extraction_time=result.extraction_time,
                total_tokens=result.total_tokens,
                cost_usd=result.cost_usd,
                error=result.error,
            )
            metrics_list.append(metrics)

        return metrics_list

    def generate_comparison_table(self) -> pd.DataFrame:
        """Generate a comparison table as DataFrame.

        Returns:
            DataFrame with comparison metrics
        """
        metrics = self.calculate_metrics()

        data = []
        for m in metrics:
            data.append({
                'Model': m.model.split('-')[-1].upper() if '-' in m.model else m.model,
                'Query': m.query_type,
                'Fields': m.fields_extracted,
                'Completeness': f"{m.completeness_score:.1%}",
                'Time (s)': f"{m.extraction_time:.2f}",
                'Tokens': m.total_tokens,
                'Cost ($)': f"${m.cost_usd:.4f}",
                'Error': m.error or '-',
            })

        return pd.DataFrame(data)

    def generate_summary_stats(self) -> Dict[str, Any]:
        """Generate summary statistics across all results.

        Returns:
            Dictionary with summary statistics
        """
        metrics = self.calculate_metrics()

        if not metrics:
            return {}

        # Group by model
        by_model: Dict[str, List[ComparisonMetrics]] = {}
        for m in metrics:
            model_key = m.model.split('-')[-1] if '-' in m.model else m.model
            if model_key not in by_model:
                by_model[model_key] = []
            by_model[model_key].append(m)

        summary = {}
        for model, model_metrics in by_model.items():
            successful = [m for m in model_metrics if not m.error]

            if successful:
                summary[model] = {
                    'avg_completeness': sum(m.completeness_score for m in successful) / len(successful),
                    'avg_time': sum(m.extraction_time for m in successful) / len(successful),
                    'total_tokens': sum(m.total_tokens for m in successful),
                    'total_cost': sum(m.cost_usd for m in successful),
                    'successful_extractions': len(successful),
                    'failed_extractions': len(model_metrics) - len(successful),
                }

        return summary

    def generate_markdown_report(
        self,
        output_path: Optional[Path] = None,
        pdf_name: str = "Unknown",
    ) -> str:
        """Generate a markdown report comparing all results.

        Args:
            output_path: Optional path to save report
            pdf_name: Name of the PDF file being analyzed

        Returns:
            Markdown report as string
        """
        comparison_table = self.generate_comparison_table()
        summary_stats = self.generate_summary_stats()

        # Build markdown
        lines = [
            "# PDF Extraction Comparison Report",
            "",
            f"**PDF File:** {pdf_name}",
            f"**Total Extractions:** {len(self.results)}",
            "",
            "## Summary by Model",
            "",
        ]

        # Add summary stats
        for model, stats in summary_stats.items():
            lines.extend([
                f"### {model.upper()}",
                "",
                f"- **Average Completeness:** {stats['avg_completeness']:.1%}",
                f"- **Average Time:** {stats['avg_time']:.2f}s",
                f"- **Total Tokens:** {stats['total_tokens']:,}",
                f"- **Total Cost:** ${stats['total_cost']:.4f}",
                f"- **Success Rate:** {stats['successful_extractions']}/{stats['successful_extractions'] + stats['failed_extractions']}",
                "",
            ])

        # Add detailed comparison table
        lines.extend([
            "## Detailed Comparison",
            "",
            comparison_table.to_markdown(index=False),
            "",
        ])

        # Add query type breakdown
        lines.extend([
            "## Query Type Breakdown",
            "",
        ])

        query_names = {
            1: "Basic Compensation",
            2: "Detailed Compensation",
            3: "Equity Plans",
            4: "KPI Metrics",
            5: "Policies & Governance",
        }

        for query_type in sorted(set(r.query_type for r in self.results)):
            query_results = [r for r in self.results if r.query_type == query_type]
            metrics = [m for m in self.calculate_metrics()
                      if m.query_type == query_type and not m.error]

            if metrics:
                avg_completeness = sum(m.completeness_score for m in metrics) / len(metrics)
                avg_cost = sum(m.cost_usd for m in metrics) / len(metrics)

                lines.extend([
                    f"### Query {query_type}: {query_names.get(query_type, 'Unknown')}",
                    "",
                    f"- **Average Completeness:** {avg_completeness:.1%}",
                    f"- **Average Cost:** ${avg_cost:.4f}",
                    f"- **Models Tested:** {len(metrics)}",
                    "",
                ])

        # Add recommendations
        lines.extend([
            "## Recommendations",
            "",
        ])

        if summary_stats:
            # Find best model by completeness
            best_completeness = max(
                summary_stats.items(),
                key=lambda x: x[1]['avg_completeness']
            )

            # Find most cost-effective
            best_cost = min(
                summary_stats.items(),
                key=lambda x: x[1]['total_cost']
            )

            # Find fastest
            best_speed = min(
                summary_stats.items(),
                key=lambda x: x[1]['avg_time']
            )

            lines.extend([
                f"- **Best Completeness:** {best_completeness[0].upper()} "
                f"({best_completeness[1]['avg_completeness']:.1%})",
                f"- **Most Cost-Effective:** {best_cost[0].upper()} "
                f"(${best_cost[1]['total_cost']:.4f} total)",
                f"- **Fastest:** {best_speed[0].upper()} "
                f"({best_speed[1]['avg_time']:.2f}s avg)",
                "",
            ])

        report = "\n".join(lines)

        # Save if path provided
        if output_path:
            output_path.write_text(report, encoding='utf-8')
            logger.info(f"Report saved to {output_path}")

        return report

    def save_results_json(self, output_path: Path):
        """Save all results to JSON file.

        Args:
            output_path: Path to output JSON file
        """
        data = {
            'results': [r.to_dict() for r in self.results],
            'metrics': [
                {
                    'model': m.model,
                    'query_type': m.query_type,
                    'fields_extracted': m.fields_extracted,
                    'completeness_score': m.completeness_score,
                    'extraction_time': m.extraction_time,
                    'total_tokens': m.total_tokens,
                    'cost_usd': m.cost_usd,
                    'error': m.error,
                }
                for m in self.calculate_metrics()
            ],
            'summary': self.generate_summary_stats(),
        }

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        logger.info(f"Results saved to {output_path}")


def compare_single_query_results(
    results: List[ExtractionResult],
    query_type: int,
) -> Dict[str, Any]:
    """Compare results for a single query across models.

    Args:
        results: List of extraction results for the same query
        query_type: Query type number

    Returns:
        Comparison dictionary
    """
    comparator = ResultComparator()
    comparator.add_results(results)

    metrics = comparator.calculate_metrics()

    return {
        'query_type': query_type,
        'models_compared': len(results),
        'metrics': [
            {
                'model': m.model,
                'completeness': m.completeness_score,
                'time': m.extraction_time,
                'cost': m.cost_usd,
                'tokens': m.total_tokens,
            }
            for m in metrics
        ],
        'best_by_completeness': max(metrics, key=lambda x: x.completeness_score).model,
        'best_by_cost': min(metrics, key=lambda x: x.cost_usd).model,
        'best_by_speed': min(metrics, key=lambda x: x.extraction_time).model,
    }
