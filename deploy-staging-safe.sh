#!/bin/bash

# 🧪 Безопасный деплой на staging
# Использование: ./deploy-staging-safe.sh

set -e

echo "🧪 Безопасный деплой на staging..."

# Проверяем переменные окружения
if [ -z "$STAGING_HOST" ]; then
    echo "❌ STAGING_HOST не установлен"
    echo "Установите: export STAGING_HOST=staging.yourdomain.com"
    exit 1
fi

if [ -z "$STAGING_SSH_KEY" ]; then
    echo "❌ STAGING_SSH_KEY не установлен"
    echo "Установите: export STAGING_SSH_KEY=/path/to/ssh/key"
    exit 1
fi

# Проверяем подключение к staging
echo "🔍 Проверяем подключение к staging..."
if ! ssh -i "$STAGING_SSH_KEY" -o ConnectTimeout=10 ubuntu@$STAGING_HOST "echo 'Connection OK'"; then
    echo "❌ Не удается подключиться к staging серверу"
    exit 1
fi

echo "✅ Подключение к staging успешно"

# Создаем бэкап staging
echo "💾 Создаем бэкап staging..."
ssh -i "$STAGING_SSH_KEY" ubuntu@$STAGING_HOST << 'EOF'
cd /opt/domeo-staging
if [ -f "package.json" ]; then
    echo "Создаем бэкап staging..."
    tar -czf staging-backup-$(date +%Y%m%d_%H%M%S).tar.gz .next package.json package-lock.json prisma
fi
EOF

# Собираем проект для staging
echo "🔨 Собираем проект для staging..."
npm run build:staging

# Создаем архив
echo "📦 Создаем архив для staging..."
tar -czf staging-build.tar.gz .next package.json package-lock.json prisma

# Загружаем на staging
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
pm2 restart domeo-staging || npm run start:staging
EOF

# Проверяем health check
echo "🔍 Проверяем health check staging..."
sleep 15
if curl -f http://$STAGING_HOST:3001/api/health; then
    echo "✅ Staging деплой успешен!"
    echo "🌐 Staging доступен: http://$STAGING_HOST:3001"
else
    echo "❌ Health check не прошел, откатываем..."
    ssh -i "$STAGING_SSH_KEY" ubuntu@$STAGING_HOST << 'EOF'
cd /opt/domeo-staging
git checkout HEAD~1
npm ci --only=production
pm2 restart domeo-staging || npm run start:staging
EOF
    exit 1
fi

# Очищаем локальные файлы
rm staging-build.tar.gz

echo "🎉 Staging деплой завершен успешно!"
