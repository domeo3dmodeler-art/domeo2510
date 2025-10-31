#!/bin/bash

# 🔄 Синхронизация изменений с production VM
# Использование: ./sync-from-production.sh

set -e

echo "🔄 Синхронизация изменений с production VM..."

# Проверяем наличие SSH ключа
if [ ! -f "production_key" ]; then
    echo "❌ SSH ключ production_key не найден"
    echo "Создайте файл production_key с приватным ключом для доступа к VM"
    exit 1
fi

# Настройки VM
PROD_HOST="130.193.40.35"
PROD_USER="ubuntu"
PROD_PATH="/opt/domeo"

echo "📡 Подключаемся к production VM: $PROD_HOST"

# Создаем временную директорию для синхронизации
TEMP_DIR="temp_production_sync"
mkdir -p $TEMP_DIR

echo "📥 Скачиваем изменения с production VM..."

# Скачиваем измененные файлы с VM
rsync -avz -e "ssh -i production_key -o StrictHostKeyChecking=no" \
    $PROD_USER@$PROD_HOST:$PROD_PATH/ $TEMP_DIR/ \
    --exclude="node_modules" \
    --exclude=".next" \
    --exclude="uploads" \
    --exclude="*.db" \
    --exclude="*.log" \
    --exclude=".env"

echo "🔍 Анализируем изменения..."

# Создаем список измененных файлов
CHANGED_FILES="changed_files.txt"
find $TEMP_DIR -type f -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.json" -o -name "*.md" | \
    sed "s|$TEMP_DIR/||" > $CHANGED_FILES

echo "📋 Найдены следующие измененные файлы:"
cat $CHANGED_FILES

echo ""
echo "🔄 Копируем изменения в локальный проект..."

# Копируем изменения
while IFS= read -r file; do
    if [ -f "$TEMP_DIR/$file" ]; then
        echo "  📝 Обновляем: $file"
        cp "$TEMP_DIR/$file" "$file"
    fi
done < $CHANGED_FILES

# Очищаем временные файлы
rm -rf $TEMP_DIR
rm $CHANGED_FILES

echo ""
echo "✅ Синхронизация завершена!"
echo ""
echo "📋 Следующие шаги:"
echo "  1. Проверьте изменения: git diff"
echo "  2. Добавьте файлы: git add ."
echo "  3. Создайте коммит: git commit -m 'sync: production changes'"
echo "  4. Отправьте изменения: git push origin feature/sync-production-changes"
echo "  5. Создайте PR для мержа в develop"
echo ""
echo "🎯 После мержа в develop изменения автоматически попадут на staging VM"
