"""Tests for comparison module."""
import pytest

from src.compare import (
    ComparisonMetrics,
    ResultComparator,
    compare_single_query_results,
)
from src.extractors import ExtractionResult


def test_result_comparator_count_fields():
    """Test field counting in nested structures."""
    comparator = ResultComparator()

    # Simple dict
    data = {"name": "John", "age": 30, "city": "NYC"}
    assert comparator._count_fields(data) == 3

    # Nested dict
    data = {
        "person": {
            "name": "John",
            "age": 30
        },
        "city": "NYC"
    }
    assert comparator._count_fields(data) == 3

    # With null values
    data = {
        "name": "John",
        "age": None,
        "city": "NYC"
    }
    assert comparator._count_fields(data) == 2

    # With arrays
    data = {
        "executives": [
            {"name": "CEO", "salary": 1000000},
            {"name": "CFO", "salary": 800000}
        ]
    }
    assert comparator._count_fields(data) == 4


def test_calculate_metrics():
    """Test metrics calculation."""
    comparator = ResultComparator()

    # Add some test results
    result1 = ExtractionResult(
        model="claude-sonnet",
        query_type=1,
        query_name="Basic",
        extracted_data={
            "company": "Test Corp",
            "year": "2024",
            "executives": [
                {"name": "CEO", "salary": 1000000}
            ]
        },
        prompt_tokens=1000,
        completion_tokens=500,
        total_tokens=1500,
        extraction_time=5.0,
        cost_usd=0.05
    )

    result2 = ExtractionResult(
        model="claude-haiku",
        query_type=1,
        query_name="Basic",
        extracted_data={
            "company": "Test Corp",
            "year": "2024"
        },
        prompt_tokens=1000,
        completion_tokens=300,
        total_tokens=1300,
        extraction_time=2.0,
        cost_usd=0.01
    )

    comparator.add_results([result1, result2])
    metrics = comparator.calculate_metrics()

    assert len(metrics) == 2
    assert metrics[0].model == "claude-sonnet"
    assert metrics[0].fields_extracted == 4  # company, year, name, salary
    assert metrics[1].fields_extracted == 2  # company, year
    assert metrics[0].completeness_score > metrics[1].completeness_score


def test_generate_summary_stats():
    """Test summary statistics generation."""
    comparator = ResultComparator()

    results = [
        ExtractionResult(
            model="claude-sonnet-4",
            query_type=1,
            query_name="Basic",
            extracted_data={"field1": "value1", "field2": "value2"},
            prompt_tokens=1000,
            completion_tokens=500,
            total_tokens=1500,
            extraction_time=5.0,
            cost_usd=0.05
        ),
        ExtractionResult(
            model="claude-sonnet-4",
            query_type=2,
            query_name="Detailed",
            extracted_data={"field1": "value1"},
            prompt_tokens=1200,
            completion_tokens=600,
            total_tokens=1800,
            extraction_time=6.0,
            cost_usd=0.06
        ),
        ExtractionResult(
            model="claude-haiku",
            query_type=1,
            query_name="Basic",
            extracted_data={"field1": "value1"},
            prompt_tokens=1000,
            completion_tokens=300,
            total_tokens=1300,
            extraction_time=2.0,
            cost_usd=0.01
        ),
    ]

    comparator.add_results(results)
    summary = comparator.generate_summary_stats()

    assert "4" in summary or "sonnet" in summary  # Model key
    assert len(summary) >= 1

    # Check structure
    for model, stats in summary.items():
        assert "avg_completeness" in stats
        assert "avg_time" in stats
        assert "total_tokens" in stats
        assert "total_cost" in stats
        assert "successful_extractions" in stats
        assert stats["successful_extractions"] > 0


def test_generate_comparison_table():
    """Test comparison table generation."""
    comparator = ResultComparator()

    results = [
        ExtractionResult(
            model="claude-sonnet",
            query_type=1,
            query_name="Basic",
            extracted_data={"a": 1, "b": 2},
            prompt_tokens=1000,
            completion_tokens=500,
            total_tokens=1500,
            extraction_time=5.0,
            cost_usd=0.05
        ),
        ExtractionResult(
            model="claude-haiku",
            query_type=1,
            query_name="Basic",
            extracted_data={"a": 1},
            prompt_tokens=1000,
            completion_tokens=300,
            total_tokens=1300,
            extraction_time=2.0,
            cost_usd=0.01
        ),
    ]

    comparator.add_results(results)
    df = comparator.generate_comparison_table()

    assert len(df) == 2
    assert "Model" in df.columns
    assert "Query" in df.columns
    assert "Fields" in df.columns
    assert "Completeness" in df.columns
    assert "Cost ($)" in df.columns


def test_generate_markdown_report():
    """Test markdown report generation."""
    comparator = ResultComparator()

    results = [
        ExtractionResult(
            model="claude-sonnet-4",
            query_type=1,
            query_name="Basic",
            extracted_data={"test": "data"},
            prompt_tokens=1000,
            completion_tokens=500,
            total_tokens=1500,
            extraction_time=5.0,
            cost_usd=0.05
        ),
    ]

    comparator.add_results(results)
    report = comparator.generate_markdown_report(pdf_name="test.pdf")

    assert "# PDF Extraction Comparison Report" in report
    assert "test.pdf" in report
    assert "Summary by Model" in report
    assert "Recommendations" in report


def test_compare_single_query_results():
    """Test single query comparison."""
    results = [
        ExtractionResult(
            model="claude-sonnet",
            query_type=1,
            query_name="Basic",
            extracted_data={"a": 1, "b": 2, "c": 3},
            prompt_tokens=1000,
            completion_tokens=500,
            total_tokens=1500,
            extraction_time=5.0,
            cost_usd=0.05
        ),
        ExtractionResult(
            model="claude-haiku",
            query_type=1,
            query_name="Basic",
            extracted_data={"a": 1, "b": 2},
            prompt_tokens=1000,
            completion_tokens=300,
            total_tokens=1300,
            extraction_time=2.0,
            cost_usd=0.01
        ),
        ExtractionResult(
            model="gpt-4",
            query_type=1,
            query_name="Basic",
            extracted_data={"a": 1},
            prompt_tokens=1000,
            completion_tokens=400,
            total_tokens=1400,
            extraction_time=4.0,
            cost_usd=0.10
        ),
    ]

    comparison = compare_single_query_results(results, query_type=1)

    assert comparison["query_type"] == 1
    assert comparison["models_compared"] == 3
    assert len(comparison["metrics"]) == 3
    assert "best_by_completeness" in comparison
    assert "best_by_cost" in comparison
    assert "best_by_speed" in comparison

    # Check best selections
    assert comparison["best_by_cost"] == "claude-haiku"
    assert comparison["best_by_speed"] == "claude-haiku"


def test_comparison_with_errors():
    """Test comparison handling of errors."""
    comparator = ResultComparator()

    results = [
        ExtractionResult(
            model="claude-sonnet",
            query_type=1,
            query_name="Basic",
            extracted_data={"test": "data"},
            prompt_tokens=1000,
            completion_tokens=500,
            total_tokens=1500,
            extraction_time=5.0,
            cost_usd=0.05,
            error=None
        ),
        ExtractionResult(
            model="claude-haiku",
            query_type=1,
            query_name="Basic",
            extracted_data=None,
            extraction_time=0.5,
            error="Timeout"
        ),
    ]

    comparator.add_results(results)
    summary = comparator.generate_summary_stats()

    # Should only count successful extractions
    for model, stats in summary.items():
        if "haiku" in model.lower():
            assert stats["failed_extractions"] == 1
            assert stats["successful_extractions"] == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
