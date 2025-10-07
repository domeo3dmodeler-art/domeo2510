#!/bin/bash
# Скрипт для проверки статистики импорта прайса

echo "🔍 Проверка статистики импорта прайса..."
echo ""

# Получаем статистику
response=$(curl -s "http://localhost:3000/api/admin/import/doors/stats")

if [ $? -eq 0 ]; then
    echo "✅ API доступен"
    echo ""
    
    # Извлекаем данные
    total_imports=$(echo $response | jq -r '.total_imports')
    last_file=$(echo $response | jq -r '.last_import.filename')
    rows_imported=$(echo $response | jq -r '.last_import.rows_imported')
    rows_total=$(echo $response | jq -r '.last_import.rows_total')
    errors=$(echo $response | jq -r '.last_import.errors')
    
    echo "📊 СТАТИСТИКА ИМПОРТА:"
    echo "   Общее количество импортов: $total_imports"
    echo "   Последний файл: $last_file"
    echo "   Строк загружено: $rows_imported"
    echo "   Всего строк: $rows_total"
    echo "   Ошибок: $errors"
    echo ""
    
    if [ "$errors" -eq 0 ]; then
        echo "✅ Импорт прошел успешно!"
    else
        echo "⚠️  Есть ошибки в импорте"
    fi
    
    echo ""
    echo "📦 ЗАГРУЖЕННЫЕ ТОВАРЫ:"
    echo $response | jq -r '.last_import.products[] | "   • \(.supplier_sku) - \(.model) (\(.style)) - \(.price_rrc) ₽"'
    
else
    echo "❌ Ошибка подключения к API"
    echo "   Убедитесь, что сервер запущен на http://localhost:3000"
fi
