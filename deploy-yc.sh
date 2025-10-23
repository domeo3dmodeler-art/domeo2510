#!/bin/bash

# 🚀 Деплой на Yandex Cloud VM
# Использование: ./deploy-yc.sh [staging|production]

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для логирования
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Проверяем аргументы
ENVIRONMENT=${1:-production}
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    error "Неверное окружение. Используйте: staging или production"
    exit 1
fi

log "🚀 Начинаем деплой на YC VM для окружения: $ENVIRONMENT"

# Конфигурация для разных окружений
if [[ "$ENVIRONMENT" == "staging" ]]; then
    VM_HOST=${STAGING_HOST:-"89.169.189.66"}
    VM_PORT=${STAGING_PORT:-"3001"}
    VM_USER=${STAGING_USER:-"ubuntu"}
    VM_PATH="/opt/domeo-staging"
else
    VM_HOST=${PROD_HOST:-"130.193.40.35"}
    VM_PORT=${PROD_PORT:-"3000"}
    VM_USER=${PROD_USER:-"ubuntu"}
    VM_PATH="/opt/domeo"
fi

# Проверяем переменные окружения
if [[ -z "$VM_SSH_KEY" ]]; then
    error "VM_SSH_KEY не установлен"
    echo "Установите: export VM_SSH_KEY=/path/to/ssh/key"
    exit 1
fi

if [[ ! -f "$VM_SSH_KEY" ]]; then
    error "SSH ключ не найден: $VM_SSH_KEY"
    exit 1
fi

# Проверяем подключение к VM
log "🔍 Проверяем подключение к VM ($VM_HOST)..."
if ! ssh -i "$VM_SSH_KEY" -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$VM_USER@$VM_HOST" "echo 'Connection OK'"; then
    error "Не удается подключиться к VM"
    exit 1
fi

success "✅ Подключение к VM успешно"

# Создаем бэкап на VM
log "💾 Создаем бэкап на VM..."
ssh -i "$VM_SSH_KEY" -o StrictHostKeyChecking=no "$VM_USER@$VM_HOST" << EOF
cd $VM_PATH
if [ -d ".next" ]; then
    tar -czf backup-\$(date +%Y%m%d_%H%M%S).tar.gz .next package.json package-lock.json prisma
    echo "✅ Бэкап создан"
else
    echo "⚠️ Папка .next не найдена, пропускаем бэкап"
fi
EOF

# Собираем проект локально
log "🔨 Собираем проект локально..."
if [[ "$ENVIRONMENT" == "staging" ]]; then
    npm run build:staging
else
    npm run build:prod
fi

# Создаем архив для деплоя
log "📦 Создаем архив для деплоя..."
tar -czf domeo-deploy.tar.gz \
    .next \
    package.json \
    package-lock.json \
    prisma \
    docker-compose.prod.yml \
    Dockerfile \
    nginx.conf \
    env.production.example

# Загружаем архив на VM
log "📤 Загружаем архив на VM..."
scp -i "$VM_SSH_KEY" -o StrictHostKeyChecking=no domeo-deploy.tar.gz "$VM_USER@$VM_HOST:/tmp/"

# Деплоим на VM
log "🚀 Деплоим на VM..."
ssh -i "$VM_SSH_KEY" -o StrictHostKeyChecking=no "$VM_USER@$VM_HOST" << EOF
set -e

cd $VM_PATH

# Останавливаем текущие контейнеры
if command -v docker-compose &> /dev/null; then
    docker-compose -f docker-compose.prod.yml down || true
fi

# Распаковываем новый код
tar -xzf /tmp/domeo-deploy.tar.gz
rm /tmp/domeo-deploy.tar.gz

# Устанавливаем production зависимости
npm ci --only=production

# Применяем миграции БД
npx prisma migrate deploy

# Запускаем контейнеры
docker-compose -f docker-compose.prod.yml up -d

# Ждем запуска
sleep 30

# Проверяем статус
docker-compose -f docker-compose.prod.yml ps
EOF

# Проверяем health check
log "🔍 Проверяем health check..."
sleep 30
if curl -f "http://$VM_HOST:$VM_PORT/api/health"; then
    success "✅ Деплой успешен!"
    success "🌐 Приложение доступно: http://$VM_HOST:$VM_PORT"
else
    error "❌ Health check не прошел"
    
    # Откатываем изменения
    warning "🔄 Откатываем изменения..."
    ssh -i "$VM_SSH_KEY" -o StrictHostKeyChecking=no "$VM_USER@$VM_HOST" << EOF
cd $VM_PATH
docker-compose -f docker-compose.prod.yml down
# Восстанавливаем из последнего бэкапа
BACKUP_FILE=\$(ls -t backup-*.tar.gz | head -n1)
if [ -n "\$BACKUP_FILE" ]; then
    tar -xzf "\$BACKUP_FILE"
    docker-compose -f docker-compose.prod.yml up -d
    echo "✅ Откат выполнен"
else
    echo "❌ Бэкап не найден"
fi
EOF
    exit 1
fi

# Очищаем локальные файлы
rm domeo-deploy.tar.gz

# Показываем статус
log "📊 Статус сервисов:"
ssh -i "$VM_SSH_KEY" -o StrictHostKeyChecking=no "$VM_USER@$VM_HOST" "cd $VM_PATH && docker-compose -f docker-compose.prod.yml ps"

success "🎉 Деплой на YC VM завершен успешно!"
success "📊 Мониторинг: http://$VM_HOST:$VM_PORT/api/health"
success "🔍 Логи: ssh -i $VM_SSH_KEY $VM_USER@$VM_HOST 'cd $VM_PATH && docker-compose -f docker-compose.prod.yml logs -f'"

