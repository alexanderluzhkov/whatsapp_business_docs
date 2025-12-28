# Примеры использования

Этот документ содержит практические примеры использования PDF Extraction Test для различных сценариев.

## Содержание

- [Быстрый старт](#быстрый-старт)
- [Базовые операции](#базовые-операции)
- [Продвинутые сценарии](#продвинутые-сценарии)
- [Оптимизация затрат](#оптимизация-затрат)
- [Использование как библиотеки](#использование-как-библиотеки)

## Быстрый старт

### 1. Первое извлечение данных

```bash
# Положите PDF в data/input/
cp ~/Downloads/apple_proxy_2024.pdf data/input/

# Запустите сравнение моделей
python main.py compare data/input/apple_proxy_2024.pdf

# Результаты в data/output/
ls -lh data/output/
```

### 2. Тестирование одной модели

```bash
# Только Claude Haiku для экономии
python main.py compare data/input/apple_proxy_2024.pdf \
    --no-all-models \
    --models "claude-haiku"
```

## Базовые операции

### Парсинг PDF

```bash
# Высокое качество (медленно, точно)
python main.py parse data/input/report.pdf --strategy hi_res

# Быстрый парсинг
python main.py parse data/input/report.pdf --strategy fast

# Локальный парсинг (без API)
python main.py parse data/input/report.pdf --no-use-api --strategy fast

# Сохранить в конкретный файл
python main.py parse data/input/report.pdf --output my_parsed.txt
```

### Извлечение данных

```bash
# Базовая информация о компенсациях
python main.py extract data/output/report_parsed.txt \
    --query 1 \
    --model claude-sonnet

# Детальные компенсации с GPT-4
python main.py extract data/output/report_parsed.txt \
    --query 2 \
    --model gpt-4

# Все запросы с одной моделью
for i in {1..5}; do
    python main.py extract data/output/report_parsed.txt \
        --query $i \
        --model claude-haiku
done
```

### Сравнение моделей

```bash
# Сравнить все модели на всех запросах
python main.py compare data/input/report.pdf

# Только базовая информация
python main.py compare data/input/report.pdf --queries "1"

# Несколько запросов
python main.py compare data/input/report.pdf --queries "1,2,3"

# Конкретные модели
python main.py compare data/input/report.pdf \
    --no-all-models \
    --models "claude-sonnet,claude-haiku"
```

## Продвинутые сценарии

### Batch обработка множества файлов

```bash
# Создайте папку с PDF файлами
mkdir -p data/input/batch_2024
cp ~/proxy_statements/*.pdf data/input/batch_2024/

# Обработайте все файлы
python main.py batch data/input/batch_2024/ \
    --queries "1,2" \
    --model claude-haiku \
    --max-concurrent 3

# Проверьте результаты
ls -lh data/output/
```

### Сравнение затрат разных моделей

```bash
# Создайте скрипт для сравнения
cat > compare_costs.sh << 'EOF'
#!/bin/bash
PDF="data/input/test_report.pdf"

echo "Testing Claude Haiku (cheapest)..."
python main.py compare "$PDF" \
    --queries "1,2" \
    --no-all-models \
    --models "claude-haiku" \
    -v

echo ""
echo "Testing Claude Sonnet (best quality)..."
python main.py compare "$PDF" \
    --queries "1,2" \
    --no-all-models \
    --models "claude-sonnet" \
    -v

echo ""
echo "Testing GPT-4 (most expensive)..."
python main.py compare "$PDF" \
    --queries "1,2" \
    --no-all-models \
    --models "gpt-4" \
    -v
EOF

chmod +x compare_costs.sh
./compare_costs.sh
```

### Оптимизация для скорости

```bash
# Быстрый парсинг + быстрая модель
python main.py compare data/input/report.pdf \
    --strategy fast \
    --no-all-models \
    --models "claude-haiku" \
    --queries "1"
```

### Проверка качества извлечения

```bash
# Извлечь с разными моделями и сравнить
python main.py compare data/input/report.pdf \
    --queries "1,2,3,4,5"

# Посмотреть детальный отчёт
cat data/output/report.md

# Посмотреть JSON с данными
jq '.results[0].extracted_data' data/output/report.json
```

## Оптимизация затрат

### Стратегия 1: Haiku для всего

Самый дешёвый вариант - использовать Claude Haiku для всех запросов:

```bash
# ~$0.10 за весь отчёт (все 5 запросов)
python main.py compare data/input/report.pdf \
    --no-all-models \
    --models "claude-haiku"
```

**Когда использовать:**
- Тестирование и разработка
- Простые отчёты с чёткой структурой
- Бюджетные ограничения

### Стратегия 2: Haiku для простых, Sonnet для сложных

```bash
# Простые запросы (1,2) - Haiku
python main.py compare data/input/report.pdf \
    --queries "1,2" \
    --no-all-models \
    --models "claude-haiku"

# Сложные запросы (3,4,5) - Sonnet
python main.py compare data/input/report.pdf \
    --queries "3,4,5" \
    --no-all-models \
    --models "claude-sonnet"
```

**Когда использовать:**
- Баланс цена/качество
- Важна точность сложных данных (equity, KPI)

### Стратегия 3: Локальный парсинг

Экономьте на парсинге:

```bash
# Без Unstructured API
python main.py compare data/input/report.pdf \
    --no-use-api \
    --strategy fast
```

**Экономия:** $0.02 на документ

### Сравнение затрат

| Стратегия | Парсинг | Извлечение | Итого | Качество |
|-----------|---------|------------|-------|----------|
| Все Haiku | $0.02 | $0.09 | **$0.11** | 85% |
| Haiku+Sonnet | $0.02 | $0.25 | **$0.27** | 92% |
| Все Sonnet | $0.02 | $0.56 | **$0.58** | 95% |
| Все GPT-4 | $0.02 | $0.95 | **$0.97** | 93% |

## Использование как библиотеки

### Пример 1: Простое извлечение

```python
import asyncio
from pathlib import Path
from src.parser import PDFParser, ParsingStrategy
from src.extractors import create_extractor, ModelType
from config import settings

async def extract_basic_info(pdf_path: Path):
    # Парсинг PDF
    parser = PDFParser()
    parse_result = await parser.parse(
        pdf_path,
        ParsingStrategy.HI_RES
    )

    # Загрузить промпт
    prompt = (settings.prompts_dir / "1_basic_compensation.txt").read_text()

    # Извлечение
    extractor = create_extractor(ModelType.CLAUDE_SONNET)
    result = await extractor.extract(
        text=parse_result.text,
        prompt=prompt,
        query_type=1,
        query_name="Basic Compensation"
    )

    return result.extracted_data

# Использование
data = asyncio.run(extract_basic_info(Path("data/input/report.pdf")))
print(data)
```

### Пример 2: Batch обработка с прогрессом

```python
import asyncio
from pathlib import Path
from src.parser import PDFParser
from src.extractors import create_extractor, ModelType
from config import settings

async def process_multiple_pdfs(pdf_folder: Path):
    parser = PDFParser()
    extractor = create_extractor(ModelType.CLAUDE_HAIKU)

    pdf_files = list(pdf_folder.glob("*.pdf"))
    prompt = (settings.prompts_dir / "1_basic_compensation.txt").read_text()

    results = []

    for i, pdf_file in enumerate(pdf_files, 1):
        print(f"Processing {i}/{len(pdf_files)}: {pdf_file.name}")

        # Парсинг
        parse_result = await parser.parse(pdf_file)

        # Извлечение
        extract_result = await extractor.extract(
            text=parse_result.text,
            prompt=prompt,
            query_type=1,
            query_name="Basic"
        )

        results.append({
            'file': pdf_file.name,
            'data': extract_result.extracted_data,
            'cost': extract_result.cost_usd
        })

    return results

# Использование
results = asyncio.run(process_multiple_pdfs(Path("data/input/")))
total_cost = sum(r['cost'] for r in results)
print(f"Processed {len(results)} files for ${total_cost:.2f}")
```

### Пример 3: Сравнение моделей программно

```python
import asyncio
from pathlib import Path
from src.parser import PDFParser
from src.extractors import ModelType, create_extractor
from src.compare import ResultComparator
from config import settings

async def compare_models_on_pdf(pdf_path: Path):
    # Парсинг один раз
    parser = PDFParser()
    parse_result = await parser.parse(pdf_path)

    # Промпт
    prompt = (settings.prompts_dir / "1_basic_compensation.txt").read_text()

    # Тестировать все модели
    models = [
        ModelType.CLAUDE_SONNET,
        ModelType.CLAUDE_HAIKU,
        ModelType.GPT4
    ]

    results = []
    for model_type in models:
        extractor = create_extractor(model_type)
        result = await extractor.extract(
            text=parse_result.text,
            prompt=prompt,
            query_type=1,
            query_name="Basic"
        )
        results.append(result)

    # Сравнение
    comparator = ResultComparator()
    comparator.add_results(results)

    # Генерация отчёта
    report = comparator.generate_markdown_report(pdf_name=pdf_path.name)
    print(report)

    return comparator.calculate_metrics()

# Использование
metrics = asyncio.run(compare_models_on_pdf(Path("data/input/report.pdf")))
for m in metrics:
    print(f"{m.model}: {m.completeness_score:.1%} complete, ${m.cost_usd:.4f}")
```

## Работа с результатами

### Анализ JSON результатов

```bash
# Установить jq для работы с JSON
# sudo apt install jq  # Linux
# brew install jq      # Mac

# Показать все компании
jq '.results[].extracted_data.company_name' data/output/report.json

# Показать CEO компенсации
jq '.results[0].extracted_data.executives[] | select(.title | contains("CEO"))' \
    data/output/report.json

# Сравнить стоимость запросов
jq '.results[] | {query: .query_type, cost: .cost_usd}' \
    data/output/report.json

# Суммарная стоимость
jq '.results | map(.cost_usd) | add' data/output/report.json
```

### Экспорт в CSV

```python
import json
import pandas as pd
from pathlib import Path

# Загрузить результаты
results_file = Path("data/output/report.json")
with open(results_file) as f:
    data = json.load(f)

# Конвертировать в DataFrame
records = []
for result in data['results']:
    if result['extracted_data'] and 'executives' in result['extracted_data']:
        for exec in result['extracted_data']['executives']:
            records.append({
                'Model': result['model'],
                'Query': result['query_name'],
                'Name': exec.get('name'),
                'Title': exec.get('title'),
                'Base Salary': exec.get('base_salary', {}).get('amount'),
                'Total Comp': exec.get('total_compensation', {}).get('amount')
            })

df = pd.DataFrame(records)
df.to_csv('data/output/executives_comparison.csv', index=False)
print(f"Exported {len(df)} records to CSV")
```

## Troubleshooting Examples

### Проблема: Timeout при парсинге больших PDF

```bash
# Увеличить timeout в .env
echo "API_TIMEOUT=300" >> .env

# Или использовать fast стратегию
python main.py parse huge_report.pdf --strategy fast
```

### Проблема: Rate limit errors

```bash
# Уменьшить параллельность
python main.py batch data/input/ --max-concurrent 1

# Или настроить rate limits в .env
echo "ANTHROPIC_RPM=30" >> .env
echo "OPENAI_RPM=40" >> .env
```

### Проблема: Низкое качество извлечения

```bash
# 1. Используйте hi_res парсинг
python main.py parse report.pdf --strategy hi_res

# 2. Используйте лучшую модель
python main.py extract report_parsed.txt \
    --query 2 \
    --model claude-sonnet

# 3. Проверьте качество PDF
pdfinfo data/input/report.pdf
```

## Полезные скрипты

### Мониторинг затрат

```bash
# watch_costs.sh
#!/bin/bash
echo "Monitoring extraction costs..."
while true; do
    clear
    echo "=== Total Costs ==="
    jq '.results | map(.cost_usd) | add' data/output/*.json 2>/dev/null | \
        awk '{sum+=$1} END {printf "Total: $%.4f\n", sum}'

    echo ""
    echo "=== By Model ==="
    jq -r '.results[] | "\(.model): $\(.cost_usd)"' data/output/*.json 2>/dev/null | \
        awk '{a[$1]+=$2} END {for(i in a) printf "%s $%.4f\n", i, a[i]}'

    sleep 5
done
```

### Автоматическое сравнение

```bash
# auto_compare.sh
#!/bin/bash
for pdf in data/input/*.pdf; do
    echo "Processing: $pdf"
    python main.py compare "$pdf" --queries "1,2,3"
    echo "---"
done

echo "All PDFs processed. Check data/output/ for results."
```
