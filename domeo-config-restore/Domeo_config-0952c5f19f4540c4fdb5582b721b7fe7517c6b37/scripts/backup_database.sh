#!/bin/bash
# ============================================
# СКРИПТ РЕЗЕРВНОГО КОПИРОВАНИЯ БАЗЫ ДАННЫХ DOMEO
# ============================================

set -e  # Остановка при ошибке

# Конфигурация
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_FILE="./prisma/database/dev.db"
BACKUP_FILE="${BACKUP_DIR}/domeo_backup_${TIMESTAMP}.db"

echo "🔄 Начинаем создание резервной копии базы данных..."

# Создаем директорию для бэкапов
mkdir -p "$BACKUP_DIR"

# Проверяем существование файла базы данных
if [ ! -f "$DB_FILE" ]; then
    echo "❌ Файл базы данных не найден: $DB_FILE"
    exit 1
fi

# Создаем резервную копию SQLite базы данных
echo "📦 Создаем резервную копию SQLite базы данных..."
cp "$DB_FILE" "$BACKUP_FILE"

# Проверяем размер файла
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "✅ Резервная копия создана: $BACKUP_FILE (размер: $BACKUP_SIZE)"

# Создаем SQL дамп для дополнительной безопасности
SQL_DUMP_FILE="${BACKUP_DIR}/domeo_sql_dump_${TIMESTAMP}.sql"
echo "📄 Создаем SQL дамп..."

# Используем sqlite3 для создания SQL дампа
sqlite3 "$DB_FILE" ".dump" > "$SQL_DUMP_FILE"

SQL_DUMP_SIZE=$(du -h "$SQL_DUMP_FILE" | cut -f1)
echo "✅ SQL дамп создан: $SQL_DUMP_FILE (размер: $SQL_DUMP_SIZE)"

# Создаем архив с метаданными
ARCHIVE_FILE="${BACKUP_DIR}/domeo_backup_${TIMESTAMP}.tar.gz"
echo "🗜️ Создаем архив с метаданными..."

tar -czf "$ARCHIVE_FILE" \
    "$BACKUP_FILE" \
    "$SQL_DUMP_FILE" \
    "./prisma/schema.prisma" \
    "./package.json" \
    "./README.md" \
    --exclude="node_modules" \
    --exclude=".git"

ARCHIVE_SIZE=$(du -h "$ARCHIVE_FILE" | cut -f1)
echo "✅ Архив создан: $ARCHIVE_FILE (размер: $ARCHIVE_SIZE)"

# Создаем файл с информацией о бэкапе
INFO_FILE="${BACKUP_DIR}/backup_info_${TIMESTAMP}.txt"
cat > "$INFO_FILE" << EOF
# Резервная копия DOMEO Platform
Дата создания: $(date)
Версия схемы: $(grep -o 'version.*' package.json || echo "неизвестно")
Размер базы данных: $BACKUP_SIZE
Размер SQL дампа: $SQL_DUMP_SIZE
Размер архива: $ARCHIVE_SIZE

Файлы:
- База данных: $BACKUP_FILE
- SQL дамп: $SQL_DUMP_FILE
- Архив: $ARCHIVE_FILE

Команды для восстановления:
1. Восстановление из файла базы данных:
   cp $BACKUP_FILE ./prisma/database/dev.db

2. Восстановление из SQL дампа:
   sqlite3 ./prisma/database/dev.db < $SQL_DUMP_FILE

3. Восстановление из архива:
   tar -xzf $ARCHIVE_FILE
EOF

echo "📋 Информация о бэкапе сохранена: $INFO_FILE"

# Показываем статистику
echo ""
echo "📊 СТАТИСТИКА РЕЗЕРВНОГО КОПИРОВАНИЯ:"
echo "=================================="
echo "📁 Директория бэкапов: $BACKUP_DIR"
echo "🗄️ База данных: $BACKUP_SIZE"
echo "📄 SQL дамп: $SQL_DUMP_SIZE"
echo "🗜️ Архив: $ARCHIVE_SIZE"
echo "📋 Информация: $INFO_FILE"
echo ""

# Проверяем целостность бэкапа
echo "🔍 Проверяем целостность резервной копии..."

# Проверяем, что файл базы данных не поврежден
if sqlite3 "$BACKUP_FILE" "SELECT COUNT(*) FROM sqlite_master;" > /dev/null 2>&1; then
    TABLE_COUNT=$(sqlite3 "$BACKUP_FILE" "SELECT COUNT(*) FROM sqlite_master WHERE type='table';")
    echo "✅ База данных цела, таблиц: $TABLE_COUNT"
else
    echo "❌ Ошибка: База данных повреждена!"
    exit 1
fi

# Проверяем SQL дамп
if [ -s "$SQL_DUMP_FILE" ]; then
    echo "✅ SQL дамп создан успешно"
else
    echo "❌ Ошибка: SQL дамп пуст!"
    exit 1
fi

echo ""
echo "🎉 РЕЗЕРВНОЕ КОПИРОВАНИЕ ЗАВЕРШЕНО УСПЕШНО!"
echo "============================================="
echo "Все файлы сохранены в директории: $BACKUP_DIR"
echo "Рекомендуется скопировать архив на внешний носитель"
echo ""

# Показываем следующие шаги
echo "📋 СЛЕДУЮЩИЕ ШАГИ:"
echo "=================="
echo "1. Скопировать архив на внешний носитель"
echo "2. Настроить PostgreSQL на Yandex Cloud"
echo "3. Создать тестовую среду"
echo "4. Подготовить скрипты миграции"
echo ""

# Создаем скрипт для быстрого восстановления
RESTORE_SCRIPT="${BACKUP_DIR}/restore_backup.sh"
cat > "$RESTORE_SCRIPT" << 'EOF'
#!/bin/bash
# Скрипт быстрого восстановления из резервной копии

if [ $# -eq 0 ]; then
    echo "Использование: $0 <путь_к_архиву>"
    echo "Пример: $0 domeo_backup_20241201_143022.tar.gz"
    exit 1
fi

ARCHIVE_FILE="$1"
BACKUP_DIR="./backups"

if [ ! -f "$ARCHIVE_FILE" ]; then
    echo "❌ Архив не найден: $ARCHIVE_FILE"
    exit 1
fi

echo "🔄 Восстанавливаем из архива: $ARCHIVE_FILE"

# Извлекаем архив
tar -xzf "$ARCHIVE_FILE"

# Находим файл базы данных
DB_FILE=$(find . -name "domeo_backup_*.db" | head -1)

if [ -z "$DB_FILE" ]; then
    echo "❌ Файл базы данных не найден в архиве"
    exit 1
fi

# Восстанавливаем базу данных
echo "📦 Восстанавливаем базу данных из: $DB_FILE"
cp "$DB_FILE" "./prisma/database/dev.db"

echo "✅ База данных восстановлена успешно!"
echo "Перезапустите приложение для применения изменений"
EOF

chmod +x "$RESTORE_SCRIPT"
echo "🔧 Создан скрипт восстановления: $RESTORE_SCRIPT"

echo "✨ Готово! Резервная копия создана и проверена."
