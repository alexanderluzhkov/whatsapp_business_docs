# Архитектура проекта PDF Extraction Test

## Обзор

Проект разработан как модульная система для тестирования различных LLM моделей при извлечении структурированных данных из PDF документов о вознаграждениях топ-менеджмента.

## Основные компоненты

### 1. Парсинг PDF (`src/parser.py`)

**Класс: `PDFParser`**

Отвечает за преобразование PDF файлов в текст с использованием Unstructured API или локальной библиотеки.

**Ключевые особенности:**
- Асинхронная обработка с `asyncio`
- Поддержка множественных стратегий парсинга (hi_res, fast, ocr_only, auto)
- Rate limiting для соблюдения API limits
- Retry logic с экспоненциальным backoff
- Batch обработка с контролем параллелизма

**Поток данных:**
```
PDF File → PDFParser → ParseResult
                      ↓
                   text (string)
                   elements (list)
                   metadata (dict)
```

**Пример использования:**
```python
parser = PDFParser()
result = await parser.parse(
    file_path=Path("report.pdf"),
    strategy=ParsingStrategy.HI_RES,
    use_api=True
)
```

### 2. Извлечение данных (`src/extractors.py`)

**Базовая архитектура:**
```
BaseExtractor (ABC)
    ├── ClaudeExtractor
    │   ├── Claude Sonnet 4
    │   └── Claude Haiku
    └── OpenAIExtractor
        └── GPT-4 Turbo
```

**Класс: `BaseExtractor`**

Абстрактный базовый класс для всех extractors с общим функционалом:
- Rate limiting
- Расчёт стоимости API calls
- Парсинг JSON из ответов LLM
- Обработка ошибок

**Класс: `ClaudeExtractor`**

Специализированный extractor для Anthropic Claude API:
- Асинхронные запросы через `AsyncAnthropic`
- Поддержка Sonnet и Haiku моделей
- Точный подсчёт токенов и стоимости
- Детерминированная температура (0) для консистентности

**Класс: `OpenAIExtractor`**

Extractor для OpenAI API:
- Асинхронные запросы через `AsyncOpenAI`
- JSON mode для структурированных ответов
- Поддержка GPT-4 Turbo

**Поток данных:**
```
Parsed Text + Prompt → Extractor → ExtractionResult
                                    ↓
                                extracted_data (JSON)
                                tokens, cost, time
                                metadata
```

### 3. Сравнение результатов (`src/compare.py`)

**Класс: `ResultComparator`**

Анализирует и сравнивает результаты различных моделей.

**Метрики:**
- **Completeness Score**: Процент извлечённых полей от ожидаемых
- **Extraction Time**: Время выполнения запроса
- **Token Usage**: Использованные input/output токены
- **Cost**: Стоимость в USD
- **Error Rate**: Процент неудачных извлечений

**Функции:**
```
ResultComparator
    ├── calculate_metrics()      # Вычисление метрик
    ├── generate_comparison_table() # DataFrame для визуализации
    ├── generate_summary_stats()    # Агрегированная статистика
    ├── generate_markdown_report()  # Markdown отчёт
    └── save_results_json()         # JSON экспорт
```

### 4. CLI интерфейс (`main.py`)

**Фреймворк: Typer + Rich**

Красивый CLI с прогресс-барами, таблицами и цветным выводом.

**Команды:**
- `parse` - Парсинг PDF в текст
- `extract` - Извлечение данных из текста
- `compare` - Сравнение моделей
- `batch` - Batch обработка множества файлов

**Архитектура команд:**
```
CLI Command
    ↓
Setup Logging → Load Config → Execute Async Operation
    ↓
Display Results (Rich tables/progress)
    ↓
Save to data/output/
```

## Конфигурация (`config.py`)

**Класс: `Settings`** (Pydantic BaseSettings)

Централизованная конфигурация с автоматической валидацией:
- API ключи из environment variables
- Model configurations
- Rate limits
- Retry settings
- Timeouts
- Paths

**Загрузка:**
```
.env file → Pydantic validation → Settings object → Global settings instance
```

## Промпты (`prompts/`)

5 специализированных промптов для различных типов данных:

1. **Basic Compensation** - Базовая информация (зарплата, бонусы, total)
2. **Detailed Compensation** - Детальный breakdown всех компонентов
3. **Equity Plans** - Долгосрочные планы (RSU, PSU, опционы)
4. **KPI Metrics** - Performance metrics и targets
5. **Policies & Governance** - Clawback, ownership requirements, etc.

**Структура промпта:**
```
Role Definition
    ↓
Task Description
    ↓
JSON Schema (expected output)
    ↓
Requirements & Constraints
```

## Асинхронная архитектура

### Concurrency Model

```
main.py (sync)
    ↓
asyncio.run() - создаёт event loop
    ↓
Async functions (parse, extract, compare)
    ↓
    ├── Rate Limiter (async locks)
    ├── API Calls (httpx async)
    └── File I/O (aiofiles)
```

### Параллелизм

**Уровень 1: Batch парсинг**
```python
tasks = [parse_pdf(pdf) for pdf in pdfs]
results = await asyncio.gather(*tasks)
```

**Уровень 2: Множественные модели**
```python
extractors = [create_extractor(m) for m in models]
tasks = [e.extract(text, prompt) for e in extractors]
results = await asyncio.gather(*tasks)
```

**Семафоры для контроля:**
```python
semaphore = asyncio.Semaphore(max_concurrent)
async with semaphore:
    result = await process()
```

## Обработка ошибок

### Retry Logic

Используется библиотека `tenacity`:

```python
@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=60),
    retry=retry_if_exception_type((SDKError, asyncio.TimeoutError)),
)
async def api_call():
    ...
```

### Error Propagation

```
API Error
    ↓
Caught by retry logic (max 3 attempts)
    ↓
If still fails → ExtractionResult with error field
    ↓
Comparator handles errors gracefully
    ↓
Report shows error rate
```

## Rate Limiting

### Token Bucket Algorithm

```python
class RateLimiter:
    def __init__(self, requests_per_minute):
        self.min_interval = 60.0 / requests_per_minute

    async def acquire(self):
        # Wait if necessary
        time_since_last = now - self.last_request
        if time_since_last < self.min_interval:
            await asyncio.sleep(self.min_interval - time_since_last)
```

### Per-API Rate Limits

- **Anthropic**: 50 RPM (default)
- **OpenAI**: 60 RPM (default)
- **Unstructured**: 30 RPM (default)

Настраивается через `.env`:
```env
ANTHROPIC_RPM=50
OPENAI_RPM=60
```

## Расчёт стоимости

### Pricing Model (на январь 2025)

```python
PRICING = {
    'claude-sonnet': (3.0, 15.0),    # input/output per 1M tokens
    'claude-haiku': (0.25, 1.25),
    'gpt-4': (10.0, 30.0),
}

cost = (input_tokens / 1M * input_price) +
       (output_tokens / 1M * output_price)
```

### Cost Tracking

Каждый `ExtractionResult` содержит:
- `prompt_tokens` - входные токены
- `completion_tokens` - выходные токены
- `cost_usd` - рассчитанная стоимость

Агрегация в `ResultComparator`:
```python
total_cost = sum(r.cost_usd for r in results)
```

## Data Flow

### Полный цикл обработки

```
1. PDF File (data/input/)
    ↓
2. PDFParser.parse()
    ↓ ParsingStrategy (hi_res/fast)
    ↓ Unstructured API / Local
3. ParseResult.text
    ↓
4. Extractor.extract()
    ↓ LLM API (Claude/OpenAI)
    ↓ JSON parsing
5. ExtractionResult.extracted_data
    ↓
6. ResultComparator
    ↓ Metrics calculation
7. Reports (data/output/)
    ├── JSON (structured data)
    └── Markdown (human-readable)
```

## Тестирование

### Test Structure

```
tests/
├── test_extractors.py    # Unit tests для extractors
└── test_compare.py       # Unit tests для comparator
```

### Mocking Strategy

```python
@patch('src.extractors.AsyncAnthropic')
async def test_claude_extractor(mock_anthropic):
    mock_client = AsyncMock()
    mock_response = MagicMock(...)
    mock_client.messages.create = AsyncMock(return_value=mock_response)
```

### Test Coverage

- Unit tests для всех классов
- Async тестирование с `pytest-asyncio`
- Mocking внешних API calls
- Edge cases (errors, timeouts, empty data)

## Logging

### Loguru Configuration

```python
logger.add(
    sys.stderr,
    format="<green>{time:HH:mm:ss}</green> | <level>{level}</level> | <level>{message}</level>",
    level="INFO"
)

logger.add(
    "logs/pdf_extraction.log",
    rotation="10 MB",
    retention="1 week"
)
```

### Log Levels

- **DEBUG**: Детальная информация о rate limiting, API calls
- **INFO**: Основные операции (парсинг начат, извлечение завершено)
- **WARNING**: Неожиданные ситуации (JSON parsing failed)
- **ERROR**: Ошибки API, timeouts

## Performance Optimizations

### 1. Async I/O

- `aiofiles` для асинхронного чтения файлов
- `httpx` для async HTTP requests (в SDK)
- Параллельная обработка множества файлов

### 2. Caching

- Парсинг PDF сохраняется в файл
- Повторное использование parsed text для разных queries
- Избегание повторного парсинга

### 3. Batch Processing

- Семафоры для контроля параллелизма
- Rate limiting предотвращает throttling
- Graceful degradation при ошибках

## Security Considerations

### 1. API Keys

- Загрузка из environment variables
- Не хардкодятся в коде
- `.env` в `.gitignore`

### 2. Input Validation

- Pydantic для валидации конфигурации
- Path validation перед файловыми операциями
- JSON schema validation для промптов

### 3. Error Handling

- Не раскрывает API ключи в логах
- Безопасная обработка исключений
- Timeout protection

## Extensibility

### Добавление новой LLM модели

```python
# 1. Создать extractor
class NewLLMExtractor(BaseExtractor):
    async def extract(self, text, prompt, query_type, query_name):
        # Реализация

# 2. Добавить в ModelType enum
class ModelType(str, Enum):
    NEW_MODEL = "new-model"

# 3. Обновить factory
def create_extractor(model_type):
    if model_type == ModelType.NEW_MODEL:
        return NewLLMExtractor()
```

### Добавление нового типа запроса

```python
# 1. Создать промпт: prompts/6_new_query.txt

# 2. Обновить query_names
def get_query_name(query_type: int):
    names = {
        ...
        6: "New Query Type"
    }

# 3. Обновить expected fields в compare.py
def _get_expected_field_counts(self):
    return {
        ...
        6: 30  # ожидаемое количество полей
    }
```

## Deployment

### Docker

```dockerfile
FROM python:3.11-slim
# Системные зависимости для PDF
RUN apt-get install -y poppler-utils tesseract-ocr
# Python зависимости
COPY requirements.txt .
RUN pip install -r requirements.txt
# Приложение
COPY . .
CMD ["python", "main.py", "--help"]
```

### Docker Compose

```yaml
services:
  pdf_extraction:
    build: .
    volumes:
      - ./data:/app/data
      - ./.env:/app/.env:ro
```

## Future Enhancements

### Возможные улучшения

1. **Веб интерфейс**
   - FastAPI backend
   - React frontend
   - Real-time progress updates

2. **Database Integration**
   - PostgreSQL для хранения результатов
   - Query history и analytics
   - Comparison across multiple documents

3. **Advanced Analytics**
   - Quality scoring algorithms
   - Confidence scores для извлечённых данных
   - Automated validation rules

4. **More Models**
   - Google Gemini
   - Cohere Command
   - Local models (Llama, Mistral)

5. **Enhanced Parsing**
   - Table extraction
   - Chart/graph OCR
   - Multi-language support

## Документация

- **README.md** - Основная документация, getting started
- **EXAMPLES.md** - Практические примеры использования
- **ARCHITECTURE.md** - Этот документ, техническая архитектура
- **API docs** - Inline docstrings (Google style)

## Зависимости

### Core
- `anthropic` - Claude API client
- `openai` - OpenAI API client
- `unstructured-client` - PDF parsing API

### CLI & UI
- `typer` - CLI framework
- `rich` - Beautiful terminal output
- `click` - CLI utilities

### Async
- `asyncio` - Built-in async framework
- `aiofiles` - Async file I/O
- `httpx` - Async HTTP (used by SDK)
- `tenacity` - Retry logic

### Data
- `pandas` - Data analysis
- `pydantic` - Data validation

### Testing
- `pytest` - Test framework
- `pytest-asyncio` - Async test support
- `pytest-mock` - Mocking utilities

## License

MIT License - см. LICENSE file
