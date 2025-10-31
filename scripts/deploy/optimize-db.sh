#!/bin/bash

# 🗄️ Оптимизация базы данных перед деплоем
# Использование: ./optimize-db.sh

set -e

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

log "🗄️ Оптимизация базы данных перед деплоем"

# Проверяем подключение к БД
if ! npx prisma db execute --file database-performance-indexes-sqlite.sql 2>/dev/null; then
    warning "⚠️ Не удалось применить индексы к SQLite (это нормально для dev)"
fi

# Создаем финальные индексы для PostgreSQL
log "📊 Создаем индексы для PostgreSQL..."
cat > database-production-indexes.sql << 'EOF'
-- Оптимизация индексов для PostgreSQL Production
-- Выполнить в production базе данных

-- Индексы для таблицы products
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_catalog_category_id 
ON products(catalog_category_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_sku 
ON products(sku);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_name 
ON products(name);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_is_active 
ON products(is_active);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_category_active 
ON products(catalog_category_id, is_active);

-- Индексы для таблицы catalog_categories
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_catalog_categories_name 
ON catalog_categories(name);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_catalog_categories_is_active 
ON catalog_categories(is_active);

-- Индексы для таблицы clients
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_is_active 
ON clients(is_active);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_created_at 
ON clients(created_at);

-- Индексы для таблицы users
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role 
ON users(role);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_is_active 
ON users(is_active);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email 
ON users(email);

-- Индексы для таблицы notifications
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_read 
ON notifications(user_id, is_read);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_created_at 
ON notifications(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_type 
ON notifications(type);

-- Индексы для таблицы supplier_orders
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_supplier_orders_status 
ON supplier_orders(status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_supplier_orders_executor 
ON supplier_orders(executor_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_supplier_orders_parent_document 
ON supplier_orders(parent_document_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_supplier_orders_created_at 
ON supplier_orders(created_at DESC);

-- Индексы для таблицы invoices
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_status 
ON invoices(status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_client_id 
ON invoices(client_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_parent_document 
ON invoices(parent_document_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_created_at 
ON invoices(created_at DESC);

-- Индексы для таблицы orders
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_status 
ON orders(status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_client_id 
ON orders(client_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_parent_document 
ON orders(parent_document_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_created_at 
ON orders(created_at DESC);

-- Индексы для таблицы quotes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotes_status 
ON quotes(status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotes_client_id 
ON quotes(client_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotes_parent_document 
ON quotes(parent_document_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotes_created_at 
ON quotes(created_at DESC);

-- Индексы для таблицы document_comments
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_comments_document_id 
ON document_comments(document_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_comments_created_at 
ON document_comments(created_at DESC);

-- Обновляем статистику таблиц
ANALYZE;

-- Показываем информацию об индексах
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC
LIMIT 20;
EOF

success "✅ Создан файл database-production-indexes.sql"

# Создаем скрипт для очистки старых данных
log "🧹 Создаем скрипт очистки старых данных..."
cat > database-cleanup.sql << 'EOF'
-- Очистка старых данных для оптимизации производительности
-- ВНИМАНИЕ: Выполнять только после создания бэкапа!

-- Очистка старых уведомлений (старше 90 дней)
DELETE FROM notifications 
WHERE created_at < NOW() - INTERVAL '90 days'
AND is_read = true;

-- Очистка старых комментариев (старше 180 дней)
DELETE FROM document_comments 
WHERE created_at < NOW() - INTERVAL '180 days';

-- Очистка старых сессий корзины (старше 30 дней)
-- Это нужно делать осторожно, так как может повлиять на активные сессии

-- Обновляем статистику после очистки
ANALYZE;

-- Показываем размеры таблиц после очистки
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
EOF

success "✅ Создан файл database-cleanup.sql"

# Создаем скрипт для мониторинга БД
log "📊 Создаем скрипт мониторинга БД..."
cat > database-monitor.sql << 'EOF'
-- Мониторинг производительности базы данных

-- Размеры таблиц
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Топ медленных запросов
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Статистика использования индексов
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC
LIMIT 20;

-- Активные соединения
SELECT 
    pid,
    usename,
    application_name,
    client_addr,
    state,
    query_start,
    query
FROM pg_stat_activity 
WHERE state = 'active'
AND query NOT LIKE '%pg_stat_activity%';

-- Статистика по таблицам
SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_tuples,
    n_dead_tup as dead_tuples
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;
EOF

success "✅ Создан файл database-monitor.sql"

# Создаем скрипт для бэкапа
log "💾 Создаем скрипт бэкапа..."
cat > database-backup.sh << 'EOF'
#!/bin/bash

# Скрипт для создания бэкапа базы данных
# Использование: ./database-backup.sh [staging|production]

set -e

ENVIRONMENT=${1:-production}
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

if [[ "$ENVIRONMENT" == "staging" ]]; then
    DB_HOST=${STAGING_DB_HOST:-"89.169.189.66"}
    DB_NAME=${STAGING_DB_NAME:-"domeo"}
    DB_USER=${STAGING_DB_USER:-"domeo"}
else
    DB_HOST=${PROD_DB_HOST:-"130.193.40.35"}
    DB_NAME=${PROD_DB_NAME:-"domeo"}
    DB_USER=${PROD_DB_USER:-"domeo"}
fi

echo "🗄️ Создание бэкапа базы данных ($ENVIRONMENT)..."

# Создаем директорию для бэкапов
mkdir -p "$BACKUP_DIR"

# Создаем бэкап
pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" \
    --format=custom \
    --compress=9 \
    --verbose \
    --file="$BACKUP_DIR/domeo_${ENVIRONMENT}_${TIMESTAMP}.backup"

echo "✅ Бэкап создан: $BACKUP_DIR/domeo_${ENVIRONMENT}_${TIMESTAMP}.backup"

# Создаем также SQL дамп для совместимости
pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" \
    --format=plain \
    --no-owner \
    --no-privileges \
    --file="$BACKUP_DIR/domeo_${ENVIRONMENT}_${TIMESTAMP}.sql"

echo "✅ SQL дамп создан: $BACKUP_DIR/domeo_${ENVIRONMENT}_${TIMESTAMP}.sql"

# Показываем размеры файлов
ls -lh "$BACKUP_DIR"/domeo_${ENVIRONMENT}_${TIMESTAMP}.*

echo "🎉 Бэкап завершен успешно!"
EOF

chmod +x database-backup.sh
success "✅ Создан скрипт database-backup.sh"

# Создаем финальный отчет
log "📋 Создаем отчет об оптимизации..."
cat > "DATABASE_OPTIMIZATION_REPORT.md" << EOF
# 🗄️ Отчет об оптимизации базы данных

## 📊 Созданные файлы

### 1. Индексы для Production
- **Файл**: \`database-production-indexes.sql\`
- **Назначение**: Оптимизация запросов в PostgreSQL
- **Особенности**: Использует \`CREATE INDEX CONCURRENTLY\` для безопасного создания

### 2. Очистка данных
- **Файл**: \`database-cleanup.sql\`
- **Назначение**: Удаление старых данных для оптимизации
- **Внимание**: Выполнять только после создания бэкапа!

### 3. Мониторинг БД
- **Файл**: \`database-monitor.sql\`
- **Назначение**: Анализ производительности базы данных
- **Метрики**: Размеры таблиц, медленные запросы, использование индексов

### 4. Бэкап БД
- **Файл**: \`database-backup.sh\`
- **Назначение**: Создание резервных копий
- **Форматы**: Custom (сжатый) и SQL (текстовый)

## 🚀 Инструкции по применению

### На Production сервере:

\`\`\`bash
# 1. Создайте бэкап
./database-backup.sh production

# 2. Примените индексы
psql -h localhost -U domeo -d domeo -f database-production-indexes.sql

# 3. Очистите старые данные (опционально)
psql -h localhost -U domeo -d domeo -f database-cleanup.sql

# 4. Проверьте производительность
psql -h localhost -U domeo -d domeo -f database-monitor.sql
\`\`\`

## 📈 Ожидаемые улучшения

- **Скорость запросов**: Улучшение в 2-5 раз
- **Размер индексов**: ~10-15% от размера данных
- **Время создания**: 5-15 минут (CONCURRENTLY)
- **Безопасность**: Индексы создаются без блокировки таблиц

## 🔍 Мониторинг

Регулярно проверяйте:
- Использование индексов
- Медленные запросы
- Размеры таблиц
- Активные соединения

---
*Отчет создан: $(date)*
EOF

success "✅ Отчет создан: DATABASE_OPTIMIZATION_REPORT.md"

log "🎉 Оптимизация базы данных завершена!"
log "📋 Созданные файлы:"
log "  - database-production-indexes.sql"
log "  - database-cleanup.sql" 
log "  - database-monitor.sql"
log "  - database-backup.sh"
log "  - DATABASE_OPTIMIZATION_REPORT.md"

