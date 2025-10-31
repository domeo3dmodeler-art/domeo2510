#!/bin/bash

# 🏭 Безопасный деплой на production
# Использование: ./deploy-production-safe.sh

set -e

echo "🏭 Безопасный деплой на production..."

# Проверяем переменные окружения
if [ -z "$PROD_HOST" ]; then
    echo "❌ PROD_HOST не установлен"
    echo "Установите: export PROD_HOST=130.193.40.35"
    exit 1
fi

if [ -z "$PROD_SSH_KEY" ]; then
    echo "❌ PROD_SSH_KEY не установлен"
    echo "Установите: export PROD_SSH_KEY=/path/to/ssh/key"
    exit 1
fi

# Проверяем подключение к production
echo "🔍 Проверяем подключение к production..."
if ! ssh -i "$PROD_SSH_KEY" -o ConnectTimeout=10 ubuntu@$PROD_HOST "echo 'Connection OK'"; then
    echo "❌ Не удается подключиться к production серверу"
    exit 1
fi

echo "✅ Подключение к production успешно"

# Создаем бэкап production БД
echo "💾 Создаем бэкап production базы данных..."
ssh -i "$PROD_SSH_KEY" ubuntu@$PROD_HOST << 'EOF'
cd /opt/domeo
if command -v docker-compose &> /dev/null; then
    docker-compose exec -T postgres pg_dump -U domeo domeo > backup_$(date +%Y%m%d_%H%M%S).sql
else
    echo "Docker не найден, пропускаем бэкап БД"
fi
EOF

# Создаем бэкап production кода
echo "💾 Создаем бэкап production кода..."
ssh -i "$PROD_SSH_KEY" ubuntu@$PROD_HOST << 'EOF'
cd /opt/domeo
tar -czf production-backup-$(date +%Y%m%d_%H%M%S).tar.gz .next package.json package-lock.json prisma
EOF

# Собираем проект для production
echo "🔨 Собираем проект для production..."
npm run build:prod

# Создаем архив
echo "📦 Создаем архив для production..."
tar -czf production-build.tar.gz .next package.json package-lock.json prisma

# Загружаем на production
echo "📤 Загружаем на production сервер..."
scp -i "$PROD_SSH_KEY" production-build.tar.gz ubuntu@$PROD_HOST:/tmp/

# Деплоим на production
echo "🚀 Деплоим на production..."
ssh -i "$PROD_SSH_KEY" ubuntu@$PROD_HOST << 'EOF'
cd /opt/domeo
tar -xzf /tmp/production-build.tar.gz
rm /tmp/production-build.tar.gz
npm ci --only=production
npx prisma migrate deploy
pm2 restart domeo || npm run start:prod
EOF

# Проверяем health check
echo "🔍 Проверяем health check production..."
sleep 30
if curl -f http://$PROD_HOST:3000/api/health; then
    echo "✅ Production деплой успешен!"
    echo "🌐 Production доступен: http://$PROD_HOST:3000"
else
    echo "❌ Health check не прошел, откатываем..."
    ssh -i "$PROD_SSH_KEY" ubuntu@$PROD_HOST << 'EOF'
cd /opt/domeo
git checkout HEAD~1
npm ci --only=production
pm2 restart domeo || npm run start:prod
EOF
    exit 1
fi

# Очищаем локальные файлы
rm production-build.tar.gz

echo "🎉 Production деплой завершен успешно!"
echo "📊 Мониторинг: http://$PROD_HOST:3001 (Grafana)"
echo "🔍 Логи: pm2 logs domeo"
