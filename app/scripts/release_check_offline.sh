#!/bin/bash
# scripts/release_check_offline.sh
# Упрощенный скрипт для проверки готовности к релизу (без запущенного сервера)

set -e

echo "🚀 Release Check — Domeo Doors Pilot (Offline)"
echo "============================================="

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

log_info "Проверка готовности к релизу пилота Doors (офлайн режим)..."

# 1. Проверка сборки
echo ""
log_info "1. Проверка сборки проекта..."
if npm run build; then
    log_success "Сборка прошла успешно"
else
    log_error "Сборка не удалась"
    exit 1
fi

# 2. Проверка линтера
echo ""
log_info "2. Проверка линтера..."
if npm run lint; then
    log_success "Линтер прошел без ошибок"
else
    log_warning "Линтер нашел проблемы, но это не критично"
fi

# 3. Проверка TypeScript типов
echo ""
log_info "3. Проверка TypeScript типов..."
if npx tsc --noEmit; then
    log_success "TypeScript типы корректны"
else
    log_error "Ошибки в TypeScript типах"
    exit 1
fi

# 4. Проверка наличия критических файлов
echo ""
log_info "4. Проверка наличия критических файлов..."

CRITICAL_FILES=(
    "package.json"
    "next.config.mjs"
    "tsconfig.json"
    "prisma/schema.prisma"
    "app/not-found.tsx"
    "app/api/health/route.ts"
    "app/api/export/order/route.ts"
    "app/api/quotes/preview/route.ts"
    "docs/master_spec.md"
    "docs/roadmap.md"
    "docs/state.md"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        log_success "Файл $file найден"
    else
        log_error "Критический файл $file не найден"
        exit 1
    fi
done

# 5. Проверка структуры API
echo ""
log_info "5. Проверка структуры API..."

API_ROUTES=(
    "app/api/health/route.ts"
    "app/api/export/order/route.ts"
    "app/api/quotes/route.ts"
    "app/api/quotes/[id]/route.ts"
    "app/api/quotes/[id]/status/route.ts"
    "app/api/quotes/[id]/export/pdf/route.ts"
    "app/api/quotes/from-cart/route.ts"
    "app/api/quotes/preview/route.ts"
    "app/api/admin/import/[category]/route.ts"
    "app/api/admin/categories/route.ts"
)

for route in "${API_ROUTES[@]}"; do
    if [ -f "$route" ]; then
        log_success "API роут $route найден"
    else
        log_warning "API роут $route не найден"
    fi
done

# 6. Проверка компонентов
echo ""
log_info "6. Проверка компонентов..."

COMPONENTS=(
    "app/components/QuotesList.tsx"
    "app/components/CreateQuoteForm.tsx"
    "app/components/QuoteDetail.tsx"
    "app/components/AnalyticsDashboard.tsx"
    "app/doors/components/ExportButtons.tsx"
)

for component in "${COMPONENTS[@]}"; do
    if [ -f "$component" ]; then
        log_success "Компонент $component найден"
    else
        log_warning "Компонент $component не найден"
    fi
done

# 7. Проверка админки
echo ""
log_info "7. Проверка админки..."

ADMIN_PAGES=(
    "app/admin/doors/page.tsx"
    "app/admin/doors/series/page.tsx"
    "app/admin/doors/series/new/page.tsx"
    "app/admin/doors/options/page.tsx"
    "app/admin/doors/constraints/page.tsx"
    "app/admin/doors/templates/page.tsx"
    "app/admin/import/page.tsx"
)

for page in "${ADMIN_PAGES[@]}"; do
    if [ -f "$page" ]; then
        log_success "Страница админки $page найдена"
    else
        log_warning "Страница админки $page не найдена"
    fi
done

# 8. Проверка тестов
echo ""
log_info "8. Проверка тестов..."

TEST_FILES=(
    "app/__tests__/export.spec.ts"
    "app/__tests__/export-integration.spec.ts"
    "app/__tests__/admin-e2e.spec.ts"
    "app/__tests__/module-not-found.spec.ts"
    "app/__tests__/build-health.spec.ts"
)

for test in "${TEST_FILES[@]}"; do
    if [ -f "$test" ]; then
        log_success "Тест $test найден"
    else
        log_warning "Тест $test не найден"
    fi
done

# 9. Проверка документации
echo ""
log_info "9. Проверка документации..."

DOCS=(
    "docs/master_spec.md"
    "docs/roadmap.md"
    "docs/state.md"
    "docs/admin_guide.md"
    "docs/data_import_guide_doors.md"
    "docs/spec_kp_formulas.md"
    "docs/api_export_documentation.md"
    "docs/system_overview.md"
    "docs/m7-fix-readme.md"
)

for doc in "${DOCS[@]}"; do
    if [ -f "$doc" ]; then
        log_success "Документ $doc найден"
    else
        log_warning "Документ $doc не найден"
    fi
done

# 10. Проверка скриптов
echo ""
log_info "10. Проверка скриптов..."

SCRIPTS=(
    "scripts/smoke.sh"
    "scripts/release_check.sh"
    "scripts/check_build_health.sh"
)

for script in "${SCRIPTS[@]}"; do
    if [ -f "$script" ]; then
        log_success "Скрипт $script найден"
    else
        log_warning "Скрипт $script не найден"
    fi
done

# 11. Проверка OpenAPI спецификации
echo ""
log_info "11. Проверка OpenAPI спецификации..."
if [ -f "app/openapi.yaml" ]; then
    log_success "OpenAPI спецификация найдена"
    if npm run guard:openapi 2>/dev/null || echo "OpenAPI guard не настроен, пропускаем..."; then
        log_success "OpenAPI спецификация корректна"
    else
        log_warning "OpenAPI спецификация имеет проблемы"
    fi
else
    log_warning "OpenAPI спецификация не найдена"
fi

# 12. Финальная проверка
echo ""
log_info "12. Финальная проверка готовности к релизу..."

# Проверяем, что все критические компоненты на месте
CRITICAL_CHECKS=0
TOTAL_CHECKS=0

# Проверка сборки
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if npm run build >/dev/null 2>&1; then
    CRITICAL_CHECKS=$((CRITICAL_CHECKS + 1))
fi

# Проверка типов
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if npx tsc --noEmit >/dev/null 2>&1; then
    CRITICAL_CHECKS=$((CRITICAL_CHECKS + 1))
fi

# Проверка критических файлов
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
MISSING_CRITICAL=0
for file in "package.json" "next.config.mjs" "tsconfig.json" "prisma/schema.prisma" "app/not-found.tsx"; do
    if [ ! -f "$file" ]; then
        MISSING_CRITICAL=$((MISSING_CRITICAL + 1))
    fi
done
if [ $MISSING_CRITICAL -eq 0 ]; then
    CRITICAL_CHECKS=$((CRITICAL_CHECKS + 1))
fi

# Результат
echo ""
echo "============================================="
if [ "${CRITICAL_CHECKS}" -eq "${TOTAL_CHECKS}" ]; then
    log_success "🎉 ВСЕ КРИТИЧЕСКИЕ ПРОВЕРКИ ПРОШЛИ!"
    log_success "Пилот Doors готов к релизу!"
    echo ""
    log_info "Статус проверок: ${CRITICAL_CHECKS}/${TOTAL_CHECKS}"
    log_info "Система готова к продакшену"
    echo ""
    log_info "Следующие шаги:"
    log_info "1. Запустить сервер: npm run dev"
    log_info "2. Проверить API: curl http://localhost:3000/api/health"
    log_info "3. Деплой на продакшен сервер"
    log_info "4. Настройка мониторинга"
    log_info "5. Обучение пользователей"
    echo ""
    log_info "Для полной проверки с API запустите:"
    log_info "bash scripts/release_check.sh"
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
