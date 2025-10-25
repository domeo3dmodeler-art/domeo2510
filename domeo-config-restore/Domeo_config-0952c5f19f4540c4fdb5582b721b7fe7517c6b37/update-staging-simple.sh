#!/bin/bash

# 🧪 Простой скрипт для обновления staging ВМ
# Согласно DEVELOPMENT_WORKFLOW.md

set -e

echo "🧪 Обновление staging ВМ..."

# Переходим в папку проекта на ВМ
cd /opt/domeo

echo "📁 Текущая папка: $(pwd)"

# Останавливаем текущие контейнеры
echo "⏹️ Останавливаем контейнеры..."
docker-compose down

# Обновляем код из репозитория
echo "📥 Обновляем код из репозитория..."
git pull origin develop

# Пересобираем и запускаем контейнеры
echo "🔨 Пересобираем и запускаем контейнеры..."
docker-compose up -d --build

# Ждем запуска
echo "⏳ Ждем запуска сервисов..."
sleep 10

# Проверяем статус
echo "📊 Проверяем статус контейнеров..."
docker-compose ps

# Проверяем работу API
echo "🔍 Проверяем работу API..."
curl -f http://localhost:3001/api/health

if [ $? -eq 0 ]; then
    echo "✅ API работает!"
    
    # Проверяем исправления
    echo "🔧 Проверяем исправления артикулов..."
    curl "http://localhost:3001/api/admin/check-supplier-skus?categoryId=cmg50xcgs001cv7mn0tdyk1wo"
else
    echo "❌ API не отвечает!"
fi

echo "🎉 Обновление staging ВМ завершено!"
