# Быстрый старт (5 минут)

Этот гайд поможет вам запустить первое извлечение данных за 5 минут.

## Шаг 1: Установка (2 минуты)

```bash
# Клонируйте проект (если еще не сделали)
cd pdf_extraction_test

# Запустите setup скрипт
chmod +x setup.sh
./setup.sh
```

Скрипт автоматически:
- ✅ Создаст виртуальное окружение
- ✅ Установит все зависимости
- ✅ Создаст структуру директорий
- ✅ Создаст .env файл из шаблона

## Шаг 2: Настройка API ключей (1 минута)

Откройте `.env` и добавьте ваши API ключи:

```bash
nano .env  # или используйте любой редактор
```

**Минимально необходимо:**
```env
ANTHROPIC_API_KEY=sk-ant-xxxxx
OPENAI_API_KEY=sk-xxxxx
```

Где взять ключи:
- **Anthropic**: https://console.anthropic.com/settings/keys
- **OpenAI**: https://platform.openai.com/api-keys
- **Unstructured** (опционально): https://unstructured.io/

## Шаг 3: Подготовка PDF (30 секунд)

Положите ваш PDF отчёт в папку `data/input/`:

```bash
# Пример
cp ~/Downloads/apple_proxy_2024.pdf data/input/
```

**Подходящие типы документов:**
- Proxy statements (DEF 14A)
- Annual reports с разделом компенсаций
- Compensation reports
- 10-K с executive compensation

## Шаг 4: Запуск первого извлечения (1-2 минуты)

### Вариант A: Быстрое тестирование (дешевле)

```bash
# Активировать окружение
source venv/bin/activate

# Запустить с Claude Haiku (самый дешёвый)
python main.py compare data/input/apple_proxy_2024.pdf \
    --queries "1" \
    --no-all-models \
    --models "claude-haiku"
```

**Ожидаемое время:** ~30 секунд
**Стоимость:** ~$0.02

### Вариант B: Полное сравнение (лучшее качество)

```bash
# Все модели, все запросы
python main.py compare data/input/apple_proxy_2024.pdf
```

**Ожидаемое время:** ~2-3 минуты
**Стоимость:** ~$2-3

## Шаг 5: Просмотр результатов (30 секунд)

### Markdown отчёт (человекочитаемый)

```bash
cat data/output/apple_proxy_2024.md
```

Вы увидите:
```markdown
# PDF Extraction Comparison Report

**PDF File:** apple_proxy_2024.pdf

## Summary by Model

### SONNET
- **Average Completeness:** 92.3%
- **Average Time:** 9.2s
- **Total Cost:** $0.8234
...
```

### JSON результаты (для программной обработки)

```bash
# Посмотреть извлечённые данные
jq '.results[0].extracted_data' data/output/apple_proxy_2024.json

# Пример вывода:
{
  "company_name": "Apple Inc.",
  "fiscal_year": "2024",
  "executives": [
    {
      "name": "Tim Cook",
      "title": "CEO",
      "base_salary": {
        "amount": 3000000,
        "currency": "USD"
      },
      "total_compensation": {
        "amount": 63209845,
        "currency": "USD"
      }
    },
    ...
  ]
}
```

## Что дальше?

### Попробуйте другие запросы

```bash
# Детальные компенсации
python main.py compare data/input/apple_proxy_2024.pdf \
    --queries "2"

# KPI метрики
python main.py compare data/input/apple_proxy_2024.pdf \
    --queries "4"

# Всё вместе
python main.py compare data/input/apple_proxy_2024.pdf \
    --queries "1,2,3,4,5"
```

### Обработайте несколько файлов

```bash
# Положите несколько PDF в input/
cp ~/proxy_statements/*.pdf data/input/

# Batch обработка
python main.py batch data/input/ \
    --queries "1,2" \
    --model claude-haiku
```

### Оптимизируйте затраты

```bash
# Локальный парсинг (экономия на Unstructured API)
python main.py compare data/input/report.pdf \
    --no-use-api \
    --strategy fast

# Только Haiku для всего
python main.py batch data/input/ \
    --queries "1,2,3,4,5" \
    --model claude-haiku
```

## Типичные результаты

### Query 1: Basic Compensation
**Время:** 3-5 секунд
**Стоимость:** $0.01-0.05
**Извлекается:**
- Имена executives
- Должности
- Base salary
- Total compensation
- Annual bonus

### Query 2: Detailed Compensation
**Время:** 5-10 секунд
**Стоимость:** $0.03-0.10
**Извлекается:**
- Все компоненты Query 1
- Stock awards (RSU/PSU)
- Option awards
- Non-equity incentives
- Pension benefits
- Other compensation

### Query 4: KPI Metrics
**Время:** 8-15 секунд
**Стоимость:** $0.05-0.15
**Извлекается:**
- Performance metrics
- Target/threshold/maximum levels
- Actual achievement
- Payout percentages
- Weightings

## Troubleshooting

### Проблема: "API key not found"

**Решение:**
```bash
# Проверьте .env файл
cat .env | grep API_KEY

# Убедитесь что ключ правильный
echo $ANTHROPIC_API_KEY  # после source venv/bin/activate
```

### Проблема: "Rate limit exceeded"

**Решение:**
```bash
# Уменьшите параллельность
python main.py batch data/input/ --max-concurrent 1

# Или настройте .env
echo "ANTHROPIC_RPM=30" >> .env
```

### Проблема: "Timeout"

**Решение:**
```bash
# Увеличьте timeout
echo "API_TIMEOUT=300" >> .env

# Используйте fast стратегию
python main.py compare report.pdf --strategy fast
```

### Проблема: Низкое качество извлечения

**Решение:**
```bash
# 1. Используйте hi_res парсинг
python main.py compare report.pdf --strategy hi_res

# 2. Используйте Sonnet вместо Haiku
python main.py compare report.pdf \
    --no-all-models \
    --models "claude-sonnet"

# 3. Проверьте качество исходного PDF
file data/input/report.pdf
pdfinfo data/input/report.pdf
```

## Полезные команды

```bash
# Помощь по CLI
python main.py --help
python main.py compare --help

# Verbose режим для отладки
python main.py compare report.pdf -v

# Проверить тесты
pytest tests/ -v

# Очистить временные файлы
make clean

# Посмотреть логи
tail -f logs/pdf_extraction.log
```

## Следующие шаги

1. 📖 Прочитайте [README.md](README.md) для полной документации
2. 💡 Изучите [EXAMPLES.md](EXAMPLES.md) для продвинутых примеров
3. 🏗️ Посмотрите [ARCHITECTURE.md](ARCHITECTURE.md) для понимания внутренней структуры
4. 🧪 Запустите тесты: `pytest tests/ -v`
5. 🐳 Попробуйте Docker: `docker-compose up`

## Получить помощь

- **Документация:** См. README.md и EXAMPLES.md
- **Ошибки:** Проверьте логи в `logs/pdf_extraction.log`
- **Вопросы:** Создайте issue в репозитории

---

**Поздравляем! Вы успешно запустили первое извлечение данных! 🎉**
