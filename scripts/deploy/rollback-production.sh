#!/bin/bash

# 🔄 Быстрый откат production
# Использование: ./rollback-production.sh

set -e

echo "🔄 Быстрый откат production..."

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

# Показываем доступные бэкапы
echo "📋 Доступные бэкапы:"
ssh -i "$PROD_SSH_KEY" ubuntu@$PROD_HOST "ls -la /opt/domeo/production-backup-*.tar.gz"

# Запрашиваем бэкап для отката
read -p "Введите имя бэкапа для отката (например: production-backup-20241201_120000.tar.gz): " BACKUP_FILE

if [ -z "$BACKUP_FILE" ]; then
    echo "❌ Имя бэкапа не указано"
    exit 1
fi

# Проверяем существование бэкапа
if ! ssh -i "$PROD_SSH_KEY" ubuntu@$PROD_HOST "test -f /opt/domeo/$BACKUP_FILE"; then
    echo "❌ Бэкап $BACKUP_FILE не найден"
    exit 1
fi

echo "⚠️ ВНИМАНИЕ: Вы собираетесь откатить production к состоянию $BACKUP_FILE"
read -p "Продолжить? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Откат отменен"
    exit 1
fi

# Останавливаем приложение
echo "⏹️ Останавливаем приложение..."
ssh -i "$PROD_SSH_KEY" ubuntu@$PROD_HOST << 'EOF'
cd /opt/domeo
pm2 stop domeo || true
EOF

# Восстанавливаем из бэкапа
echo "🔄 Восстанавливаем из бэкапа..."
ssh -i "$PROD_SSH_KEY" ubuntu@$PROD_HOST << EOF
cd /opt/domeo
tar -xzf $BACKUP_FILE
npm ci --only=production
npx prisma migrate deploy
EOF

# Запускаем приложение
echo "🚀 Запускаем приложение..."
ssh -i "$PROD_SSH_KEY" ubuntu@$PROD_HOST << 'EOF'
cd /opt/domeo
pm2 start domeo || npm run start:prod
EOF

# Проверяем health check
echo "🔍 Проверяем health check..."
sleep 15
if curl -f http://$PROD_HOST:3000/api/health; then
    echo "✅ Откат успешен!"
    echo "🌐 Production доступен: http://$PROD_HOST:3000"
else
    echo "❌ Health check не прошел после отката"
    exit 1
fi

echo "🎉 Откат завершен успешно!"
