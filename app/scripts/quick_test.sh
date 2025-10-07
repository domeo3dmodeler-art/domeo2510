#!/bin/bash
# scripts/quick_test.sh
# Быстрое тестирование основных функций

echo "🧪 Быстрое тестирование функционала..."

# Цвета
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Функция для тестирования URL
test_url() {
    local url=$1
    local name=$2
    
    echo -n "Тестируем $name... "
    
    if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "200\|204"; then
        echo -e "${GREEN}✅ OK${NC}"
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        return 1
    fi
}

# Проверяем, что сервер запущен
echo "🔍 Проверяем, что сервер запущен..."
if ! curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo -e "${RED}❌ Сервер не запущен!${NC}"
    echo "Запустите сервер: npm run dev"
    exit 1
fi

echo -e "${GREEN}✅ Сервер запущен${NC}"
echo ""

# Тестируем основные страницы
echo "📱 Тестируем основные страницы:"
test_url "http://localhost:3000/" "Главная страница"
test_url "http://localhost:3000/admin" "Админка"
test_url "http://localhost:3000/admin/doors" "Админка Doors"
test_url "http://localhost:3000/admin/import" "Импорт прайсов"
test_url "http://localhost:3000/quotes" "Управление КП"
test_url "http://localhost:3000/doors" "Каталог дверей"

echo ""
echo "🔌 Тестируем API endpoints:"
test_url "http://localhost:3000/api/health" "Health API"
test_url "http://localhost:3000/api/admin/categories" "Categories API"

echo ""
echo "📋 Рекомендации для тестирования UI/UX:"
echo "1. Откройте http://localhost:3000 в браузере"
echo "2. Протестируйте навигацию между разделами"
echo "3. Проверьте формы на валидацию"
echo "4. Протестируйте на мобильном устройстве"
echo "5. Проверьте все модальные окна"
echo ""
echo "📖 Подробное руководство: docs/testing_guide.md"
