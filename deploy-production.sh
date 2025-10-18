#!/bin/bash

# 🚀 Правильный Production Деплой для Yandex Cloud
# Использование: ./deploy-production.sh

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Функции логирования
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Проверка переменных окружения
check_environment() {
    log "Проверяем переменные окружения..."
    
    if [ ! -f ".env.production" ]; then
        error "Файл .env.production не найден! Скопируйте env.production.template в .env.production и заполните значения"
    fi
    
    # Проверяем обязательные переменные
    source .env.production
    
    required_vars=(
        "POSTGRES_PASSWORD"
        "REDIS_PASSWORD" 
        "NEXTAUTH_SECRET"
        "JWT_SECRET"
        "YANDEX_STORAGE_ACCESS_KEY_ID"
        "YANDEX_STORAGE_SECRET_ACCESS_KEY"
        "YANDEX_STORAGE_BUCKET_NAME"
        "GRAFANA_PASSWORD"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ] || [[ "${!var}" == *"your_"* ]] || [[ "${!var}" == *"change"* ]]; then
            error "Переменная $var не настроена в .env.production"
        fi
    done
    
    log "✅ Переменные окружения проверены"
}

# Создание SSL сертификатов
setup_ssl() {
    log "Настраиваем SSL сертификаты..."
    
    if [ ! -d "nginx/ssl" ]; then
        mkdir -p nginx/ssl
    fi
    
    # Проверяем наличие сертификатов
    if [ ! -f "nginx/ssl/cert.pem" ] || [ ! -f "nginx/ssl/key.pem" ]; then
        warning "SSL сертификаты не найдены. Создаем самоподписанные сертификаты для тестирования"
        
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout nginx/ssl/key.pem \
            -out nginx/ssl/cert.pem \
            -subj "/C=RU/ST=Moscow/L=Moscow/O=Domeo/OU=IT/CN=yourdomain.com"
    fi
    
    log "✅ SSL сертификаты настроены"
}

# Создание директорий для данных
create_directories() {
    log "Создаем директории для данных..."
    
    directories=(
        "data/postgres"
        "data/redis" 
        "data/uploads"
        "data/logs"
        "data/backups"
        "data/prometheus"
        "data/grafana"
        "data/loki"
    )
    
    for dir in "${directories[@]}"; do
        mkdir -p "$dir"
        chmod 755 "$dir"
    done
    
    log "✅ Директории созданы"
}

# Настройка файрвола
setup_firewall() {
    log "Настраиваем файрвол..."
    
    # Разрешаем необходимые порты
    sudo ufw allow 22/tcp    # SSH
    sudo ufw allow 80/tcp    # HTTP
    sudo ufw allow 443/tcp   # HTTPS
    sudo ufw allow 3001/tcp  # Grafana (опционально)
    
    # Включаем файрвол
    sudo ufw --force enable
    
    log "✅ Файрвол настроен"
}

# Создание systemd сервисов
create_systemd_services() {
    log "Создаем systemd сервисы..."
    
    # Сервис для основного приложения
    sudo tee /etc/systemd/system/domeo.service > /dev/null <<EOF
[Unit]
Description=Domeo Production Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$(pwd)
ExecStart=/usr/bin/docker-compose -f docker-compose.production-full.yml up -d
ExecStop=/usr/bin/docker-compose -f docker-compose.production-full.yml down
TimeoutStartSec=0
User=ubuntu
Group=ubuntu

[Install]
WantedBy=multi-user.target
EOF

    # Сервис для мониторинга
    sudo tee /etc/systemd/system/domeo-monitoring.service > /dev/null <<EOF
[Unit]
Description=Domeo Monitoring Stack
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$(pwd)
ExecStart=/usr/bin/docker-compose -f docker-compose.production-full.yml up -d prometheus grafana loki promtail
ExecStop=/usr/bin/docker-compose -f docker-compose.production-full.yml stop prometheus grafana loki promtail
TimeoutStartSec=0
User=ubuntu
Group=ubuntu

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable domeo.service
    sudo systemctl enable domeo-monitoring.service
    
    log "✅ Systemd сервисы созданы"
}

# Создание скриптов управления
create_management_scripts() {
    log "Создаем скрипты управления..."
    
    # Скрипт запуска
    cat > start-production.sh <<'EOF'
#!/bin/bash
echo "🚀 Запуск Domeo Production..."
docker-compose -f docker-compose.production-full.yml up -d
echo "✅ Приложение запущено"
echo "🌐 Доступно по адресу: https://yourdomain.com"
echo "📊 Grafana: https://yourdomain.com:3001"
echo "📈 Prometheus: https://yourdomain.com:9090"
EOF

    # Скрипт остановки
    cat > stop-production.sh <<'EOF'
#!/bin/bash
echo "🛑 Остановка Domeo Production..."
docker-compose -f docker-compose.production-full.yml down
echo "✅ Приложение остановлено"
EOF

    # Скрипт перезапуска
    cat > restart-production.sh <<'EOF'
#!/bin/bash
echo "🔄 Перезапуск Domeo Production..."
docker-compose -f docker-compose.production-full.yml down
docker-compose -f docker-compose.production-full.yml up -d
echo "✅ Приложение перезапущено"
EOF

    # Скрипт обновления
    cat > update-production.sh <<'EOF'
#!/bin/bash
echo "📦 Обновление Domeo Production..."

# Создаем бэкап
echo "💾 Создаем бэкап..."
docker-compose -f docker-compose.production-full.yml exec postgres pg_dump -U domeo domeo > backup_$(date +%Y%m%d_%H%M%S).sql

# Останавливаем сервисы
echo "🛑 Останавливаем сервисы..."
docker-compose -f docker-compose.production-full.yml down

# Обновляем код
echo "📥 Обновляем код..."
git pull origin main

# Пересобираем и запускаем
echo "🔨 Пересобираем и запускаем..."
docker-compose -f docker-compose.production-full.yml up -d --build

echo "✅ Обновление завершено"
EOF

    # Скрипт проверки статуса
    cat > status-production.sh <<'EOF'
#!/bin/bash
echo "📊 Статус Domeo Production"
echo "=========================="

echo "🐳 Docker контейнеры:"
docker-compose -f docker-compose.production-full.yml ps

echo ""
echo "💾 Использование ресурсов:"
docker stats --no-stream

echo ""
echo "🔍 Проверка здоровья:"
curl -f https://yourdomain.com/api/health && echo "✅ Health OK" || echo "❌ Health FAILED"
EOF

    # Скрипт бэкапа
    cat > backup-production.sh <<'EOF'
#!/bin/bash
BACKUP_DIR="backups"
BACKUP_FILE="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql"

mkdir -p "$BACKUP_DIR"

echo "💾 Создаем бэкап базы данных..."
docker-compose -f docker-compose.production-full.yml exec -T postgres pg_dump -U domeo domeo > "$BACKUP_FILE"

echo "🗜️ Сжимаем бэкап..."
gzip "$BACKUP_FILE"

echo "✅ Бэкап создан: $BACKUP_FILE.gz"

# Удаляем старые бэкапы (старше 30 дней)
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +30 -delete
EOF

    # Делаем скрипты исполняемыми
    chmod +x *.sh
    
    log "✅ Скрипты управления созданы"
}

# Создание cron задач
setup_cron() {
    log "Настраиваем cron задачи..."
    
    # Добавляем задачи в crontab
    (crontab -l 2>/dev/null; echo "# Domeo Production Tasks") | crontab -
    (crontab -l 2>/dev/null; echo "0 2 * * * $(pwd)/backup-production.sh") | crontab -
    (crontab -l 2>/dev/null; echo "0 3 * * * docker system prune -f") | crontab -
    (crontab -l 2>/dev/null; echo "*/5 * * * * $(pwd)/status-production.sh >> /var/log/domeo-status.log 2>&1") | crontab -
    
    log "✅ Cron задачи настроены"
}

# Основная функция
main() {
    log "🚀 Начинаем правильный production деплой"
    
    check_environment
    setup_ssl
    create_directories
    setup_firewall
    create_systemd_services
    create_management_scripts
    setup_cron
    
    log "🎉 Правильный production деплой завершен!"
    log ""
    log "📋 Следующие шаги:"
    log "1. Настройте DNS для вашего домена"
    log "2. Получите реальные SSL сертификаты (Let's Encrypt)"
    log "3. Запустите приложение: ./start-production.sh"
    log "4. Проверьте статус: ./status-production.sh"
    log ""
    log "🔧 Управление:"
    log "- Запуск: ./start-production.sh"
    log "- Остановка: ./stop-production.sh"
    log "- Перезапуск: ./restart-production.sh"
    log "- Обновление: ./update-production.sh"
    log "- Статус: ./status-production.sh"
    log "- Бэкап: ./backup-production.sh"
}

# Обработка ошибок
trap 'error "Произошла ошибка в строке $LINENO"' ERR

# Запуск основной функции
main "$@"
