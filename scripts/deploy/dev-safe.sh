#!/bin/bash

# 🏠 Безопасная локальная разработка
# Использование: ./dev-safe.sh

set -e

echo "🏠 Запуск безопасной локальной разработки..."

# Проверяем, что мы в правильной директории
if [ ! -f "package.json" ]; then
    echo "❌ Запустите скрипт из корня проекта"
    exit 1
fi

# Проверяем Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не установлен"
    exit 1
fi

echo "✅ Node.js версия: $(node -v)"

# Создаем бэкап текущего состояния (если нужно)
if [ -f ".env" ]; then
    echo "💾 Создаем бэкап .env файла..."
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
fi

# Устанавливаем зависимости
echo "📦 Проверяем зависимости..."
npm install

# Генерируем Prisma клиент
echo "🗄️ Генерируем Prisma клиент..."
npx prisma generate

# Применяем миграции (только для локальной разработки)
echo "🔄 Применяем миграции..."
npx prisma db push

# Запускаем dev сервер
echo "🚀 Запускаем dev сервер..."
echo ""
echo "🌐 Приложение будет доступно по адресу: http://localhost:3000"
echo "📊 Prisma Studio: npx prisma studio"
echo "🛑 Для остановки: Ctrl+C"
echo ""

npm run dev
