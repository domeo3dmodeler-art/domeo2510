#!/bin/bash

# 🚀 Скрипт для локальной разработки

set -e

echo "🏠 Запуск локальной разработки..."

# Проверяем Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не установлен"
    exit 1
fi

# Проверяем версию Node.js
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Требуется Node.js версии 18 или выше"
    exit 1
fi

echo "✅ Node.js версия: $(node -v)"

# Устанавливаем зависимости
echo "📦 Устанавливаем зависимости..."
npm install

# Генерируем Prisma клиент
echo "🗄️ Генерируем Prisma клиент..."
npx prisma generate

# Применяем миграции
echo "🔄 Применяем миграции..."
npx prisma migrate dev

# Запускаем dev сервер
echo "🚀 Запускаем dev сервер..."
npm run dev
