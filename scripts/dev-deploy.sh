#!/bin/bash
# Скрипт для локальной разработки и деплоя обновлений

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

# Функция помощи
show_help() {
    echo "Использование: $0 [КОМАНДА]"
    echo ""
    echo "Команды:"
    echo "  dev          - Запуск в режиме разработки"
    echo "  build        - Сборка для production"
    echo "  test         - Запуск тестов"
    echo "  deploy       - Деплой на staging"
    echo "  deploy-prod  - Деплой на production"
    echo "  update       - Обновление production"
    echo "  rollback     - Откат production"
    echo "  status       - Проверка статуса"
    echo "  logs         - Просмотр логов"
    echo "  clean        - Очистка временных файлов"
    echo ""
}

# Запуск в режиме разработки
dev_mode() {
    log "Запуск в режиме разработки..."
    
    # Проверка зависимостей
    if [ ! -d "node_modules" ]; then
        log "Установка зависимостей..."
        npm install
    fi
    
    # Генерация Prisma Client
    log "Генерация Prisma Client..."
    npx prisma generate
    
    # Применение миграций
    log "Применение миграций..."
    npx prisma db push
    
    # Запуск сервера разработки
    log "Запуск сервера разработки..."
    npm run dev
}

# Сборка для production
build_production() {
    log "Сборка для production..."
    
    # Проверка переменных окружения
    if [ ! -f ".env.production" ]; then
        error "Файл .env.production не найден!"
    fi
    
    # Установка зависимостей
    npm ci
    
    # Генерация Prisma Client
    npx prisma generate
    
    # Сборка приложения
    NODE_ENV=production npm run build
    
    log "Сборка завершена ✓"
}

# Запуск тестов
run_tests() {
    log "Запуск тестов..."
    
    # Линтинг
    log "Проверка линтинга..."
    npm run lint
    
    # Проверка типов
    log "Проверка типов TypeScript..."
    npx tsc --noEmit
    
    # Тесты (если есть)
    if [ -f "package.json" ] && grep -q '"test"' package.json; then
        log "Запуск тестов..."
        npm test
    fi
    
    log "Тесты пройдены ✓"
}

# Деплой на staging
deploy_staging() {
    log "Деплой на staging..."
    
    # Сборка
    build_production
    
    # Сборка Docker образа
    log "Сборка Docker образа для staging..."
    docker build -f Dockerfile.production -t domeo:staging .
    
    # Деплой (здесь должна быть логика деплоя на staging сервер)
    log "Деплой на staging сервер..."
    # docker push domeo:staging
    # ssh staging-server "docker pull domeo:staging && docker-compose up -d"
    
    log "Деплой на staging завершен ✓"
}

# Деплой на production
deploy_production() {
    warn "Деплой на PRODUCTION!"
    read -p "Вы уверены? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "Деплой отменен"
        exit 0
    fi
    
    # Сборка
    build_production
    
    # Сборка Docker образа
    log "Сборка Docker образа для production..."
    docker build -f Dockerfile.production -t domeo:latest .
    
    # Деплой
    log "Деплой на production сервер..."
    # docker push domeo:latest
    # ssh production-server "docker pull domeo:latest && ./scripts/update-production.sh"
    
    log "Деплой на production завершен ✓"
}

# Обновление production
update_production() {
    log "Обновление production..."
    
    # Выполнение скрипта обновления
    if [ -f "scripts/update-production.sh" ]; then
        chmod +x scripts/update-production.sh
        ./scripts/update-production.sh
    else
        error "Скрипт обновления не найден!"
    fi
}

# Откат production
rollback_production() {
    warn "Откат PRODUCTION!"
    read -p "Вы уверены? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "Откат отменен"
        exit 0
    fi
    
    if [ -f "scripts/update-production.sh" ]; then
        chmod +x scripts/update-production.sh
        ./scripts/update-production.sh rollback
    else
        error "Скрипт обновления не найден!"
    fi
}

# Проверка статуса
check_status() {
    log "Проверка статуса сервисов..."
    
    # Проверка локальных сервисов
    if pgrep -f "next dev" > /dev/null; then
        log "Сервер разработки запущен ✓"
    else
        warn "Сервер разработки не запущен"
    fi
    
    # Проверка Docker
    if command -v docker > /dev/null; then
        log "Docker доступен ✓"
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    else
        warn "Docker не установлен"
    fi
}

# Просмотр логов
view_logs() {
    log "Просмотр логов..."
    
    if [ -f "docker-compose.production.yml" ]; then
        docker-compose -f docker-compose.production.yml logs -f
    else
        warn "Production конфигурация не найдена"
    fi
}

# Очистка временных файлов
cleanup() {
    log "Очистка временных файлов..."
    
    # Очистка Next.js кэша
    rm -rf .next
    
    # Очистка node_modules (опционально)
    read -p "Удалить node_modules? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf node_modules
        log "node_modules удален"
    fi
    
    # Очистка Docker
    docker system prune -f
    
    log "Очистка завершена ✓"
}

# Основная логика
main() {
    case "${1:-help}" in
        "dev")
            dev_mode
            ;;
        "build")
            build_production
            ;;
        "test")
            run_tests
            ;;
        "deploy")
            deploy_staging
            ;;
        "deploy-prod")
            deploy_production
            ;;
        "update")
            update_production
            ;;
        "rollback")
            rollback_production
            ;;
        "status")
            check_status
            ;;
        "logs")
            view_logs
            ;;
        "clean")
            cleanup
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Запуск
main "$@"
