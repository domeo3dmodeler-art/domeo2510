#!/bin/bash
# Скрипт для настройки тестовой базы данных

echo "🚀 Запуск PostgreSQL контейнера..."
docker-compose up -d db

echo "⏳ Ожидание запуска БД (10 секунд)..."
sleep 10

echo "📦 Генерация Prisma Client..."
npm run prisma:generate

echo "🔄 Применение миграций..."
npm run prisma:migrate:deploy

echo "✅ База данных готова для тестов!"
echo ""
echo "Теперь можно запустить тесты:"
echo "  npm run test:e2e"

