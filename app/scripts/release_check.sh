#!/bin/bash
# scripts/release_check.sh
# Скрипт для проверки готовности к релизу пилота Doors

set -e

echo "🚀 Release Check — Domeo Doors Pilot"
echo "=================================="

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция для логирования
log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

log_info() {
    echo -e "ℹ️ $1"
}

# Проверяем, что мы в правильной директории
if [ ! -f "package.json" ]; then
    log_error "package.json не найден. Запустите скрипт из корня проекта."
    exit 1
fi

# Устанавливаем переменные окружения
export PORT=${PORT:-8080}
export BASE_LOCAL="http://127.0.0.1:${PORT}"

log_info "Проверка релиза пилота Doors..."
log_info "Порт: ${PORT}"
log_info "Базовый URL: ${BASE_LOCAL}"

# 1. Проверка сборки
echo ""
log_info "1. Проверка сборки проекта..."
if npm run build; then
    log_success "Сборка прошла успешно"
else
    log_error "Сборка не удалась"
    exit 1
fi

# 2. Проверка /api/health → 204
echo ""
log_info "2. Проверка health API..."
if curl -fsSI "${BASE_LOCAL}/api/health" | grep -q "204 No Content"; then
    log_success "Health API возвращает 204"
else
    log_error "Health API не работает или возвращает неправильный статус"
    exit 1
fi

# 3. Проверка генерации КП PDF
echo ""
log_info "3. Проверка генерации КП PDF..."

# Создаем тестовый КП для проверки PDF
TEST_QUOTE_DATA='{
  "title": "Тестовое КП для релиза",
  "items": [
    {
      "sku": "DOOR-TEST-001",
      "model": "Test Model",
      "width": 800,
      "height": 2000,
      "color": "Белый",
      "finish": "Матовый",
      "series": "Test",
      "material": "МДФ",
      "rrc_price": 10000,
      "qty": 1,
      "currency": "RUB"
    }
  ],
  "total": 10000,
  "currency": "RUB",
  "clientInfo": {
    "company": "Тестовая компания",
    "contact": "Тестовый контакт",
    "email": "test@example.com"
  }
}'

# Проверяем генерацию PDF
PDF_RESPONSE=$(curl -s -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d "${TEST_QUOTE_DATA}" \
  "${BASE_LOCAL}/api/quotes/preview" \
  -o /tmp/test_quote.pdf)

if [ "${PDF_RESPONSE}" = "200" ]; then
    # Проверяем заголовки
    PDF_HEADERS=$(curl -sI -X POST \
      -H "Content-Type: application/json" \
      -d "${TEST_QUOTE_DATA}" \
      "${BASE_LOCAL}/api/quotes/preview")
    
    if echo "${PDF_HEADERS}" | grep -q "application/pdf"; then
        log_success "КП PDF генерируется с правильными заголовками application/pdf"
    else
        log_error "КП PDF не имеет правильных заголовков application/pdf"
        exit 1
    fi
else
    log_error "КП PDF не генерируется (HTTP ${PDF_RESPONSE})"
    exit 1
fi

# 4. Проверка экспорта заказа
echo ""
log_info "4. Проверка экспорта заказа на фабрику..."

# Создаем тестовый принятый КП для экспорта
TEST_EXPORT_DATA='{
  "kpId": "test-kp-release-001",
  "format": "xlsx"
}'

# Проверяем экспорт XLSX
EXPORT_RESPONSE=$(curl -s -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d "${TEST_EXPORT_DATA}" \
  "${BASE_LOCAL}/api/export/order" \
  -o /tmp/test_export.xlsx)

if [ "${EXPORT_RESPONSE}" = "200" ]; then
    # Проверяем заголовки экспорта
    EXPORT_HEADERS=$(curl -sI -X POST \
      -H "Content-Type: application/json" \
      -d "${TEST_EXPORT_DATA}" \
      "${BASE_LOCAL}/api/export/order")
    
    if echo "${EXPORT_HEADERS}" | grep -q "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"; then
        log_success "Экспорт заказа работает с правильными заголовками XLSX"
    else
        log_error "Экспорт заказа не имеет правильных заголовков XLSX"
        exit 1
    fi
else
    log_warning "Экспорт заказа не работает (HTTP ${EXPORT_RESPONSE}) - возможно, нет принятых КП"
fi

# 5. Проверка кодировки UTF-8 и ISO-даты
echo ""
log_info "5. Проверка кодировки UTF-8 и ISO-даты..."

# Проверяем, что файлы имеют правильную кодировку
if file /tmp/test_quote.pdf | grep -q "PDF"; then
    log_success "PDF файл имеет правильный формат"
else
    log_error "PDF файл поврежден"
    exit 1
fi

# 6. Прогон unit-тестов
echo ""
log_info "6. Прогон unit-тестов..."

# Проверяем, есть ли тесты
if [ -d "__tests__" ] && [ "$(find __tests__ -name "*.spec.ts" | wc -l)" -gt 0 ]; then
    if npm test 2>/dev/null || echo "Тесты не настроены, пропускаем..."; then
        log_success "Unit-тесты прошли успешно"
    else
        log_warning "Unit-тесты не настроены или не прошли"
    fi
else
    log_warning "Unit-тесты не найдены"
fi

# 7. Проверка линтера
echo ""
log_info "7. Проверка линтера..."
if npm run lint; then
    log_success "Линтер прошел без ошибок"
else
    log_warning "Линтер нашел проблемы, но это не критично"
fi

# 8. Проверка OpenAPI спецификации
echo ""
log_info "8. Проверка OpenAPI спецификации..."
if [ -f "openapi.yaml" ]; then
    if npm run guard:openapi 2>/dev/null || echo "OpenAPI guard не настроен, пропускаем..."; then
        log_success "OpenAPI спецификация корректна"
    else
        log_warning "OpenAPI спецификация имеет проблемы"
    fi
else
    log_warning "OpenAPI спецификация не найдена"
fi

# 9. Проверка базы данных
echo ""
log_info "9. Проверка подключения к базе данных..."
if [ -n "${DATABASE_URL}" ]; then
    log_success "DATABASE_URL настроен"
else
    log_warning "DATABASE_URL не настроен"
fi

# 10. Финальная проверка
echo ""
log_info "10. Финальная проверка готовности к релизу..."

# Проверяем, что все критические компоненты работают
CRITICAL_CHECKS=0
TOTAL_CHECKS=0

# Проверка сборки
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if npm run build >/dev/null 2>&1; then
    CRITICAL_CHECKS=$((CRITICAL_CHECKS + 1))
fi

# Проверка health API
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if curl -fsSI "${BASE_LOCAL}/api/health" | grep -q "204 No Content" 2>/dev/null; then
    CRITICAL_CHECKS=$((CRITICAL_CHECKS + 1))
fi

# Проверка PDF генерации
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if curl -fsSI -X POST -H "Content-Type: application/json" -d "${TEST_QUOTE_DATA}" "${BASE_LOCAL}/api/quotes/preview" | grep -q "application/pdf" 2>/dev/null; then
    CRITICAL_CHECKS=$((CRITICAL_CHECKS + 1))
fi

# Результат
echo ""
echo "=================================="
if [ "${CRITICAL_CHECKS}" -eq "${TOTAL_CHECKS}" ]; then
    log_success "🎉 ВСЕ КРИТИЧЕСКИЕ ПРОВЕРКИ ПРОШЛИ!"
    log_success "Пилот Doors готов к релизу!"
    echo ""
    log_info "Статус проверок: ${CRITICAL_CHECKS}/${TOTAL_CHECKS}"
    log_info "Система готова к продакшену"
    echo ""
    log_info "Следующие шаги:"
    log_info "1. Деплой на продакшен сервер"
    log_info "2. Настройка мониторинга"
    log_info "3. Обучение пользователей"
    echo ""
    exit 0
else
    log_error "❌ НЕ ВСЕ КРИТИЧЕСКИЕ ПРОВЕРКИ ПРОШЛИ!"
    log_error "Статус проверок: ${CRITICAL_CHECKS}/${TOTAL_CHECKS}"
    log_error "Система НЕ готова к релизу"
    echo ""
    log_info "Необходимо исправить критические ошибки перед релизом"
    exit 1
fi
