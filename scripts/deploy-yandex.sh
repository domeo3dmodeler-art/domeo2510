#!/bin/bash
# scripts/deploy-yandex.sh
# Скрипт для развертывания на Yandex Cloud

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция для логирования
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Проверяем наличие необходимых переменных окружения
check_env() {
    log "Проверяем переменные окружения..."
    
    required_vars=(
        "POSTGRES_DB"
        "POSTGRES_USER" 
        "POSTGRES_PASSWORD"
        "REDIS_PASSWORD"
        "YANDEX_STORAGE_ENDPOINT"
        "YANDEX_STORAGE_ACCESS_KEY_ID"
        "YANDEX_STORAGE_SECRET_ACCESS_KEY"
        "YANDEX_STORAGE_BUCKET_NAME"
        "GRAFANA_PASSWORD"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            error "Переменная $var не установлена"
        fi
    done
    
    log "Все переменные окружения установлены"
}

# Создаем .env файл
create_env_file() {
    log "Создаем .env файл..."
    
    cat > .env << EOF
# База данных
POSTGRES_DB=${POSTGRES_DB}
POSTGRES_USER=${POSTGRES_USER}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

# Redis
REDIS_PASSWORD=${REDIS_PASSWORD}

# Yandex Object Storage
YANDEX_STORAGE_ENDPOINT=${YANDEX_STORAGE_ENDPOINT}
YANDEX_STORAGE_ACCESS_KEY_ID=${YANDEX_STORAGE_ACCESS_KEY_ID}
YANDEX_STORAGE_SECRET_ACCESS_KEY=${YANDEX_STORAGE_SECRET_ACCESS_KEY}
YANDEX_STORAGE_BUCKET_NAME=${YANDEX_STORAGE_BUCKET_NAME}

# Мониторинг
GRAFANA_PASSWORD=${GRAFANA_PASSWORD}

# Приложение
NODE_ENV=production
LOG_LEVEL=info
EOF
    
    log ".env файл создан"
}

# Создаем необходимые директории
create_directories() {
    log "Создаем необходимые директории..."
    
    mkdir -p logs/nginx
    mkdir -p uploads/images
    mkdir -p ssl
    mkdir -p monitoring/grafana/dashboards
    mkdir -p monitoring/grafana/datasources
    mkdir -p monitoring/rules
    
    log "Директории созданы"
}

# Создаем SSL сертификаты (самоподписанные для тестирования)
create_ssl_certificates() {
    log "Создаем SSL сертификаты..."
    
    if [ ! -f ssl/cert.pem ] || [ ! -f ssl/key.pem ]; then
        openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes -subj "/C=RU/ST=Moscow/L=Moscow/O=Domeo/CN=localhost"
        log "SSL сертификаты созданы"
    else
        log "SSL сертификаты уже существуют"
    fi
}

# Создаем конфигурацию Grafana
create_grafana_config() {
    log "Создаем конфигурацию Grafana..."
    
    # Datasource для Prometheus
    cat > monitoring/grafana/datasources/prometheus.yml << EOF
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
EOF

    # Дашборд для мониторинга
    cat > monitoring/grafana/dashboards/dashboard.yml << EOF
apiVersion: 1

providers:
  - name: 'default'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /etc/grafana/provisioning/dashboards
EOF

    log "Конфигурация Grafana создана"
}

# Создаем правила алертов
create_alert_rules() {
    log "Создаем правила алертов..."
    
    cat > monitoring/rules/app.yml << EOF
groups:
  - name: domeo-app
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ \$value }} errors per second"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is {{ \$value }} seconds"

      - alert: DatabaseConnectionsHigh
        expr: postgres_stat_activity_count > 180
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High database connections"
          description: "Database has {{ \$value }} active connections"

      - alert: RedisMemoryHigh
        expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Redis memory usage high"
          description: "Redis memory usage is {{ \$value }}%"
EOF

    log "Правила алертов созданы"
}

# Создаем скрипт инициализации базы данных
create_db_init_script() {
    log "Создаем скрипт инициализации базы данных..."
    
    cat > scripts/init-database.sql << EOF
-- Создание расширений для оптимизации
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Настройки для оптимизации производительности
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET pg_stat_statements.track = 'all';
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;
ALTER SYSTEM SET work_mem = '4MB';
ALTER SYSTEM SET min_wal_size = '1GB';
ALTER SYSTEM SET max_wal_size = '4GB';
ALTER SYSTEM SET max_worker_processes = 8;
ALTER SYSTEM SET max_parallel_workers_per_gather = 4;
ALTER SYSTEM SET max_parallel_workers = 8;
ALTER SYSTEM SET max_parallel_maintenance_workers = 4;

-- Перезагружаем конфигурацию
SELECT pg_reload_conf();
EOF

    log "Скрипт инициализации базы данных создан"
}

# Основная функция развертывания
deploy() {
    log "Начинаем развертывание на Yandex Cloud..."
    
    # Проверяем наличие Docker и Docker Compose
    if ! command -v docker &> /dev/null; then
        error "Docker не установлен"
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose не установлен"
    fi
    
    # Останавливаем существующие контейнеры
    log "Останавливаем существующие контейнеры..."
    docker-compose -f docker-compose.production.yml down || true
    
    # Создаем необходимые файлы и директории
    create_env_file
    create_directories
    create_ssl_certificates
    create_grafana_config
    create_alert_rules
    create_db_init_script
    
    # Собираем и запускаем контейнеры
    log "Собираем Docker образы..."
    docker-compose -f docker-compose.production.yml build --no-cache
    
    log "Запускаем сервисы..."
    docker-compose -f docker-compose.production.yml up -d
    
    # Ждем запуска сервисов
    log "Ждем запуска сервисов..."
    sleep 30
    
    # Проверяем статус сервисов
    log "Проверяем статус сервисов..."
    docker-compose -f docker-compose.production.yml ps
    
    # Выполняем миграции базы данных
    log "Выполняем миграции базы данных..."
    docker-compose -f docker-compose.production.yml exec app npm run prisma:migrate:deploy
    
    # Заполняем базу данных тестовыми данными
    log "Заполняем базу данных тестовыми данными..."
    docker-compose -f docker-compose.production.yml exec app npm run prisma:seed
    
    log "Развертывание завершено успешно!"
    log "Приложение доступно по адресу: http://localhost"
    log "Grafana доступна по адресу: http://localhost:3001"
    log "Prometheus доступен по адресу: http://localhost:9090"
}

# Функция для остановки сервисов
stop() {
    log "Останавливаем сервисы..."
    docker-compose -f docker-compose.production.yml down
    log "Сервисы остановлены"
}

# Функция для просмотра логов
logs() {
    docker-compose -f docker-compose.production.yml logs -f "$@"
}

# Функция для обновления приложения
update() {
    log "Обновляем приложение..."
    
    # Останавливаем приложение
    docker-compose -f docker-compose.production.yml stop app
    
    # Пересобираем образ
    docker-compose -f docker-compose.production.yml build app --no-cache
    
    # Запускаем приложение
    docker-compose -f docker-compose.production.yml up -d app
    
    log "Приложение обновлено"
}

# Обработка аргументов командной строки
case "${1:-deploy}" in
    deploy)
        check_env
        deploy
        ;;
    stop)
        stop
        ;;
    logs)
        logs "${@:2}"
        ;;
    update)
        update
        ;;
    *)
        echo "Использование: $0 {deploy|stop|logs|update}"
        echo ""
        echo "Команды:"
        echo "  deploy  - Развернуть приложение (по умолчанию)"
        echo "  stop    - Остановить все сервисы"
        echo "  logs    - Показать логи сервисов"
        echo "  update  - Обновить только приложение"
        exit 1
        ;;
esac
