#!/bin/bash

# 🏭 Скрипт для production деплоя

set -e

echo "🏭 Деплой на production..."

# Проверяем переменные окружения
if [ -z "$PROD_HOST" ]; then
    echo "❌ PROD_HOST не установлен"
    exit 1
fi

if [ -z "$PROD_SSH_KEY" ]; then
    echo "❌ PROD_SSH_KEY не установлен"
    exit 1
fi

# Создаем бэкап
echo "💾 Создаем бэкап..."
ssh -i "$PROD_SSH_KEY" ubuntu@$PROD_HOST << 'EOF'
cd /opt/domeo
docker-compose exec postgres pg_dump -U domeo domeo > backup_$(date +%Y%m%d_%H%M%S).sql
EOF

# Собираем проект
echo "🔨 Собираем проект для production..."
npm run build:prod

# Создаем архив
echo "📦 Создаем архив..."
tar -czf production-build.tar.gz .next package.json package-lock.json prisma

# Загружаем на production сервер
echo "📤 Загружаем на production сервер..."
scp -i "$PROD_SSH_KEY" production-build.tar.gz ubuntu@$PROD_HOST:/tmp/

# Деплоим на production
echo "🚀 Деплоим на production..."
ssh -i "$PROD_SSH_KEY" ubuntu@$PROD_HOST << 'EOF'
cd /opt/domeo
docker-compose down
tar -xzf /tmp/production-build.tar.gz
rm /tmp/production-build.tar.gz
docker-compose up -d --build
EOF

# Проверяем health check
echo "🔍 Проверяем health check..."
sleep 30
if curl -f https://yourdomain.com/api/health; then
    echo "✅ Production деплой успешен!"
else
    echo "❌ Health check не прошел, откатываем изменения..."
    ssh -i "$PROD_SSH_KEY" ubuntu@$PROD_HOST << 'EOF'
cd /opt/domeo
git checkout HEAD~1
docker-compose up -d --build
EOF
    exit 1
fi
