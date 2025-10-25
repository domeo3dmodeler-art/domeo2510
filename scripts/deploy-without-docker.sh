#!/bin/bash

# Скрипт для развертывания без Docker
# Использует готовый образ с Prisma

echo "🚀 Развертывание без Docker - используем готовый образ с Prisma"

# Проверяем наличие необходимых инструментов
echo "📋 Проверка инструментов..."

if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl не найден"
    exit 1
fi

if ! command -v yc &> /dev/null; then
    echo "❌ YC CLI не найден"
    exit 1
fi

echo "✅ Все инструменты найдены"

# Проверяем подключение к кластеру
echo "🔗 Проверка подключения к кластеру..."
if ! kubectl cluster-info &> /dev/null; then
    echo "❌ Не удается подключиться к кластеру"
    echo "Выполните: yc managed-kubernetes cluster get-credentials <cluster-id> --external"
    exit 1
fi

echo "✅ Подключение к кластеру установлено"

# Проверяем статус нод
echo "📊 Проверка статуса нод..."
kubectl get nodes

# Проверяем готовность нод
echo "⏳ Ожидание готовности нод..."
kubectl wait --for=condition=Ready nodes --all --timeout=300s

if [ $? -eq 0 ]; then
    echo "✅ Ноды готовы"
else
    echo "⚠️ Ноды не готовы, но продолжаем"
fi

# Развертываем приложение
echo "🚀 Развертывание приложения..."

# Применяем манифесты
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/app-production.yaml
kubectl apply -f k8s/migrations-production.yaml

# Ждем готовности подов
echo "⏳ Ожидание готовности подов..."
kubectl wait --for=condition=Ready pod -l app=domeo-app -n domeo-staging --timeout=300s

if [ $? -eq 0 ]; then
    echo "✅ Поды готовы"
else
    echo "⚠️ Поды не готовы, проверяем статус"
    kubectl get pods -n domeo-staging
fi

# Проверяем статус
echo "📊 Статус развертывания:"
kubectl get pods -n domeo-staging
kubectl get services -n domeo-staging
kubectl get ingress -n domeo-staging

echo ""
echo "🎉 Развертывание завершено!"
echo ""
echo "Полезные команды:"
echo "kubectl get pods -n domeo-staging"
echo "kubectl logs -f deployment/domeo-app -n domeo-staging"
echo "kubectl get services -n domeo-staging"
echo "kubectl get ingress -n domeo-staging"
echo ""
echo "Приложение будет доступно по адресу: https://staging.domeo.ru"

