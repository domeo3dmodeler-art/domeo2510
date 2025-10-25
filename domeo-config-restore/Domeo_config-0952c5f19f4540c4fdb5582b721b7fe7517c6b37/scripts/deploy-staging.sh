#!/bin/bash

# 🧪 Скрипт для staging деплоя

set -e

echo "🧪 Деплой на staging..."

# Проверяем переменные окружения
if [ -z "$STAGING_HOST" ]; then
    echo "❌ STAGING_HOST не установлен"
    exit 1
fi

if [ -z "$STAGING_SSH_KEY" ]; then
    echo "❌ STAGING_SSH_KEY не установлен"
    exit 1
fi

# Собираем проект
echo "🔨 Собираем проект для staging..."
npm run build:staging

# Создаем архив
echo "📦 Создаем архив..."
tar -czf staging-build.tar.gz .next package.json package-lock.json prisma

# Загружаем на staging сервер
echo "📤 Загружаем на staging сервер..."
scp -i "$STAGING_SSH_KEY" staging-build.tar.gz ubuntu@$STAGING_HOST:/tmp/

# Деплоим на staging
echo "🚀 Деплоим на staging..."
ssh -i "$STAGING_SSH_KEY" ubuntu@$STAGING_HOST << 'EOF'
cd /opt/domeo-staging
tar -xzf /tmp/staging-build.tar.gz
rm /tmp/staging-build.tar.gz
npm ci --only=production
npx prisma migrate deploy
pm2 restart domeo-staging
EOF

echo "✅ Staging деплой завершен!"
