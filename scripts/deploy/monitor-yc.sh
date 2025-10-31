#!/bin/bash

# 📊 Мониторинг производительности Domeo на YC VM
# Использование: ./monitor-yc.sh [staging|production]

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

# Проверяем аргументы
ENVIRONMENT=${1:-production}
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    error "Неверное окружение. Используйте: staging или production"
    exit 1
fi

# Конфигурация
if [[ "$ENVIRONMENT" == "staging" ]]; then
    VM_HOST=${STAGING_HOST:-"89.169.189.66"}
    VM_USER=${STAGING_USER:-"ubuntu"}
    VM_PATH="/opt/domeo-staging"
    VM_PORT="3001"
else
    VM_HOST=${PROD_HOST:-"130.193.40.35"}
    VM_USER=${PROD_USER:-"ubuntu"}
    VM_PATH="/opt/domeo"
    VM_PORT="3000"
fi

# Проверяем SSH ключ
if [[ -z "$VM_SSH_KEY" ]]; then
    error "VM_SSH_KEY не установлен"
    exit 1
fi

log "📊 Мониторинг производительности Domeo ($ENVIRONMENT)"

# Функция для получения метрик
get_metrics() {
    ssh -i "$VM_SSH_KEY" -o StrictHostKeyChecking=no "$VM_USER@$VM_HOST" << EOF
echo "=== SYSTEM METRICS ==="
echo "Date: \$(date)"
echo "Uptime: \$(uptime)"
echo "Load Average: \$(cat /proc/loadavg)"
echo ""

echo "=== MEMORY USAGE ==="
free -h
echo ""

echo "=== DISK USAGE ==="
df -h
echo ""

echo "=== DOCKER CONTAINERS ==="
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Size}}'
echo ""

echo "=== DOCKER STATS ==="
docker stats --no-stream --format 'table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}'
echo ""

echo "=== PM2 STATUS ==="
pm2 status
echo ""

echo "=== NGINX STATUS ==="
systemctl is-active nginx
echo ""

echo "=== APPLICATION HEALTH ==="
curl -s -o /dev/null -w "HTTP Status: %{http_code}\nResponse Time: %{time_total}s\n" http://localhost:$VM_PORT/api/health
echo ""

echo "=== RECENT LOGS ==="
tail -n 20 $VM_PATH/logs/combined.log 2>/dev/null || echo "No logs found"
EOF
}

# Функция для проверки производительности
performance_check() {
    log "🔍 Проверка производительности..."
    
    # Проверяем время ответа API
    RESPONSE_TIME=$(ssh -i "$VM_SSH_KEY" -o StrictHostKeyChecking=no "$VM_USER@$VM_HOST" "curl -s -o /dev/null -w '%{time_total}' http://localhost:$VM_PORT/api/health")
    
    if (( $(echo "$RESPONSE_TIME < 1.0" | bc -l) )); then
        success "✅ Время ответа API: ${RESPONSE_TIME}s (отлично)"
    elif (( $(echo "$RESPONSE_TIME < 2.0" | bc -l) )); then
        warning "⚠️ Время ответа API: ${RESPONSE_TIME}s (хорошо)"
    else
        error "❌ Время ответа API: ${RESPONSE_TIME}s (медленно)"
    fi
    
    # Проверяем использование памяти
    MEMORY_USAGE=$(ssh -i "$VM_SSH_KEY" -o StrictHostKeyChecking=no "$VM_USER@$VM_HOST" "free | grep Mem | awk '{print (\$3/\$2) * 100.0}'")
    
    if (( $(echo "$MEMORY_USAGE < 70" | bc -l) )); then
        success "✅ Использование памяти: ${MEMORY_USAGE}% (нормально)"
    elif (( $(echo "$MEMORY_USAGE < 85" | bc -l) )); then
        warning "⚠️ Использование памяти: ${MEMORY_USAGE}% (высокое)"
    else
        error "❌ Использование памяти: ${MEMORY_USAGE}% (критично)"
    fi
    
    # Проверяем использование диска
    DISK_USAGE=$(ssh -i "$VM_SSH_KEY" -o StrictHostKeyChecking=no "$VM_USER@$VM_HOST" "df / | tail -1 | awk '{print \$5}' | sed 's/%//'")
    
    if [[ "$DISK_USAGE" -lt 70 ]]; then
        success "✅ Использование диска: ${DISK_USAGE}% (нормально)"
    elif [[ "$DISK_USAGE" -lt 85 ]]; then
        warning "⚠️ Использование диска: ${DISK_USAGE}% (высокое)"
    else
        error "❌ Использование диска: ${DISK_USAGE}% (критично)"
    fi
}

# Функция для проверки логов на ошибки
check_logs() {
    log "🔍 Проверка логов на ошибки..."
    
    ERROR_COUNT=$(ssh -i "$VM_SSH_KEY" -o StrictHostKeyChecking=no "$VM_USER@$VM_HOST" "grep -c 'ERROR\\|FATAL\\|Exception' $VM_PATH/logs/combined.log 2>/dev/null || echo 0")
    
    if [[ "$ERROR_COUNT" -eq 0 ]]; then
        success "✅ Ошибок в логах не найдено"
    else
        warning "⚠️ Найдено ошибок в логах: $ERROR_COUNT"
        log "Последние ошибки:"
        ssh -i "$VM_SSH_KEY" -o StrictHostKeyChecking=no "$VM_USER@$VM_HOST" "grep 'ERROR\\|FATAL\\|Exception' $VM_PATH/logs/combined.log | tail -5"
    fi
}

# Функция для генерации отчета
generate_report() {
    log "📊 Генерация отчета..."
    
    REPORT_FILE="monitoring-report-$(date +%Y%m%d_%H%M%S).txt"
    
    {
        echo "=== DOMEO MONITORING REPORT ==="
        echo "Environment: $ENVIRONMENT"
        echo "Date: $(date)"
        echo "VM: $VM_HOST"
        echo ""
        
        get_metrics
        
        echo ""
        echo "=== PERFORMANCE SUMMARY ==="
        performance_check
        
        echo ""
        echo "=== LOG ANALYSIS ==="
        check_logs
        
    } > "$REPORT_FILE"
    
    success "✅ Отчет сохранен: $REPORT_FILE"
}

# Основная функция
main() {
    case "${2:-all}" in
        "metrics")
            get_metrics
            ;;
        "performance")
            performance_check
            ;;
        "logs")
            check_logs
            ;;
        "report")
            generate_report
            ;;
        "all"|*)
            get_metrics
            echo ""
            performance_check
            echo ""
            check_logs
            echo ""
            generate_report
            ;;
    esac
}

# Проверяем зависимости
if ! command -v bc &> /dev/null; then
    error "bc не установлен. Установите: sudo apt install bc"
    exit 1
fi

# Запускаем мониторинг
main "$@"

log "🎉 Мониторинг завершен!"

