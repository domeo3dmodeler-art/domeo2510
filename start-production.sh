#!/bin/bash
# Быстрый запуск Domeo в production режиме

set -e

echo "🚀 Запуск Domeo Production..."

# Проверка Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен!"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен!"
    exit 1
fi

# Проверка переменных окружения
if [ ! -f ".env.production" ]; then
    echo "⚠️  Создание .env.production из примера..."
    cp env.production .env.production
    echo "📝 Отредактируйте .env.production перед запуском!"
    exit 1
fi

# Создание необходимых директорий
mkdir -p backups logs uploads

# Запуск сервисов
echo "🐳 Запуск Docker сервисов..."
docker-compose -f docker-compose.production.yml up -d

# Ожидание готовности
echo "⏳ Ожидание готовности сервисов..."
sleep 30

# Проверка здоровья
echo "🔍 Проверка здоровья приложения..."
if curl -f http://localhost/api/health > /dev/null 2>&1; then
    echo "✅ Domeo успешно запущен!"
    echo "🌐 Приложение: http://localhost"
    echo "📊 Grafana: http://localhost:3001"
    echo "📈 Prometheus: http://localhost:9090"
else
    echo "❌ Приложение не отвечает!"
    echo "📋 Логи:"
    docker-compose -f docker-compose.production.yml logs app
fi
