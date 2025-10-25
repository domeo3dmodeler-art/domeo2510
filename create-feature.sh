#!/bin/bash

# 🌿 Создание feature ветки для безопасной разработки
# Использование: ./create-feature.sh feature-name

set -e

if [ -z "$1" ]; then
    echo "❌ Укажите название feature ветки"
    echo "Использование: ./create-feature.sh feature-name"
    echo "Пример: ./create-feature.sh improve-catalog"
    exit 1
fi

FEATURE_NAME="$1"
FEATURE_BRANCH="feature/$FEATURE_NAME"

echo "🌿 Создание feature ветки: $FEATURE_BRANCH"

# Проверяем, что мы в Git репозитории
if [ ! -d ".git" ]; then
    echo "❌ Это не Git репозиторий. Запустите сначала ./init-git-workflow.sh"
    exit 1
fi

# Проверяем, что ветка develop существует
if ! git show-ref --verify --quiet refs/heads/develop; then
    echo "❌ Ветка develop не найдена. Запустите сначала ./init-git-workflow.sh"
    exit 1
fi

# Переключаемся на develop и обновляем
echo "🔄 Обновляем develop ветку..."
git checkout develop
git pull origin develop

# Проверяем, что ветка не существует
if git show-ref --verify --quiet refs/heads/$FEATURE_BRANCH; then
    echo "❌ Ветка $FEATURE_BRANCH уже существует"
    echo "Переключиться на неё: git checkout $FEATURE_BRANCH"
    exit 1
fi

# Создаем feature ветку
echo "🌿 Создаем ветку $FEATURE_BRANCH..."
git checkout -b $FEATURE_BRANCH

echo "✅ Feature ветка создана!"
echo ""
echo "🚀 Теперь можете разрабатывать:"
echo "  1. .\dev-safe.ps1  # Запуск локальной разработки"
echo "  2. Разрабатывайте новые функции"
echo "  3. git add . && git commit -m 'feat: description'"
echo "  4. git push origin $FEATURE_BRANCH"
echo "  5. Создайте Pull Request в GitHub"
echo ""
echo "📋 После завершения разработки:"
echo "  1. Создайте PR: $FEATURE_BRANCH → develop"
echo "  2. После мержа автоматически деплоится на staging"
echo "  3. Тестируйте на staging"
echo "  4. Если все ОК, мержите develop → main с тегом"
