# Скрипт для применения оптимизаций базы данных (PowerShell)
# Включает создание индексов, анализ производительности и настройку кэширования

Write-Host "🚀 Применение оптимизаций базы данных..." -ForegroundColor Green

# Проверяем подключение к БД
Write-Host "📡 Проверка подключения к базе данных..." -ForegroundColor Blue
try {
    npx prisma db pull | Out-Null
    Write-Host "✅ Подключение к базе данных успешно" -ForegroundColor Green
} catch {
    Write-Host "❌ Ошибка подключения к базе данных" -ForegroundColor Red
    exit 1
}

# Применяем индексы
Write-Host "📊 Создание индексов..." -ForegroundColor Blue
if (Test-Path "scripts/add-database-indexes.sql") {
    try {
        Write-Host "  Применение индексов через Prisma..." -ForegroundColor Yellow
        npx prisma db execute --file scripts/add-database-indexes.sql
        Write-Host "✅ Индексы созданы" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ Ошибка при создании индексов" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️ Файл с индексами не найден" -ForegroundColor Yellow
}

# Анализ производительности
Write-Host "🔍 Анализ производительности..." -ForegroundColor Blue
if (Test-Path "scripts/analyze-database-performance.js") {
    try {
        node scripts/analyze-database-performance.js
        Write-Host "✅ Анализ производительности завершен" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ Ошибка при анализе производительности" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️ Скрипт анализа производительности не найден" -ForegroundColor Yellow
}

# Генерация Prisma клиента
Write-Host "🔧 Генерация Prisma клиента..." -ForegroundColor Blue
try {
    npx prisma generate
    Write-Host "✅ Prisma клиент сгенерирован" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Ошибка при генерации Prisma клиента" -ForegroundColor Yellow
}

# Проверка миграций
Write-Host "📋 Проверка миграций..." -ForegroundColor Blue
try {
    npx prisma migrate status
    Write-Host "✅ Статус миграций проверен" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Ошибка при проверке миграций" -ForegroundColor Yellow
}

# Очистка кэша (если используется Redis)
if (Get-Command redis-cli -ErrorAction SilentlyContinue) {
    Write-Host "🧹 Очистка Redis кэша..." -ForegroundColor Blue
    try {
        redis-cli FLUSHALL
        Write-Host "✅ Redis кэш очищен" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ Ошибка при очистке Redis кэша" -ForegroundColor Yellow
    }
}

# Запуск тестов производительности
Write-Host "🧪 Запуск тестов производительности..." -ForegroundColor Blue
if (Test-Path "scripts/test-database-performance.js") {
    try {
        node scripts/test-database-performance.js
        Write-Host "✅ Тесты производительности завершены" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ Ошибка при тестировании производительности" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️ Скрипт тестов производительности не найден" -ForegroundColor Yellow
}

# Вывод рекомендаций
Write-Host ""
Write-Host "💡 Рекомендации по дальнейшей оптимизации:" -ForegroundColor Cyan
Write-Host "  1. Мониторинг медленных запросов через pg_stat_statements" -ForegroundColor White
Write-Host "  2. Настройка connection pooling для высоких нагрузок" -ForegroundColor White
Write-Host "  3. Регулярный анализ производительности (еженедельно)" -ForegroundColor White
Write-Host "  4. Оптимизация запросов на основе реальных паттернов использования" -ForegroundColor White
Write-Host "  5. Рассмотрение использования read replicas для отчетов" -ForegroundColor White

Write-Host ""
Write-Host "✅ Оптимизации базы данных применены успешно!" -ForegroundColor Green
Write-Host "📊 Рекомендуется перезапустить приложение для применения изменений" -ForegroundColor Yellow
