#!/bin/bash

# Полное развертывание Domeo на YC Kubernetes
# Usage: ./scripts/deploy-full.sh [staging|production]

set -e

ENVIRONMENT=${1:-staging}
REGISTRY="cr.yandex/your-registry"
IMAGE_NAME="domeo"
IMAGE_TAG=${2:-latest}

echo "🚀 Полное развертывание Domeo на $ENVIRONMENT..."

# Проверка подключения к кластеру
if ! kubectl cluster-info &> /dev/null; then
    echo "❌ Не подключен к кластеру Kubernetes"
    echo "Запустите: yc managed-kubernetes cluster get-credentials domeo-cluster --external"
    exit 1
fi

echo "✅ Подключен к кластеру"

# 1. Создание namespace
echo "📁 Создание namespace..."
kubectl create namespace domeo-$ENVIRONMENT --dry-run=client -o yaml | kubectl apply -f -

# 2. Развертывание PostgreSQL
echo "🗄️ Развертывание PostgreSQL..."
kubectl apply -f k8s/postgres.yaml

# Ожидание готовности PostgreSQL
echo "⏳ Ожидание готовности PostgreSQL..."
kubectl wait --for=condition=ready pod -l app=postgres -n domeo-$ENVIRONMENT --timeout=300s

echo "✅ PostgreSQL готов"

# 3. Запуск миграций
echo "🔄 Запуск миграций..."
kubectl apply -f k8s/migrations.yaml

# Ожидание завершения миграций
echo "⏳ Ожидание завершения миграций..."
kubectl wait --for=condition=complete job/domeo-migrations -n domeo-$ENVIRONMENT --timeout=300s

echo "✅ Миграции завершены"

# 4. Сборка и push Docker образа
echo "📦 Сборка Docker образа..."
docker build -t $REGISTRY/$IMAGE_NAME:$IMAGE_TAG .

echo "⬆️ Push образа в registry..."
docker push $REGISTRY/$IMAGE_NAME:$IMAGE_TAG

echo "✅ Образ загружен"

# 5. Развертывание приложения
echo "🚀 Развертывание приложения..."
kubectl apply -f k8s/app.yaml

# Ожидание готовности приложения
echo "⏳ Ожидание готовности приложения..."
kubectl wait --for=condition=ready pod -l app=domeo-app -n domeo-$ENVIRONMENT --timeout=300s

echo "✅ Приложение готово"

# 6. Проверка статуса
echo "🔍 Проверка статуса..."
kubectl get pods -n domeo-$ENVIRONMENT
kubectl get services -n domeo-$ENVIRONMENT
kubectl get ingress -n domeo-$ENVIRONMENT

# 7. Health check
echo "🏥 Health check..."
kubectl run health-check --image=curlimages/curl --rm -i --restart=Never -- \
  curl -f http://domeo-app-service.domeo-$ENVIRONMENT.svc.cluster.local/api/health

echo "✅ Health check пройден"

# 8. Получение URL
echo "🌐 Получение URL приложения..."
INGRESS_IP=$(kubectl get ingress domeo-ingress -n domeo-$ENVIRONMENT -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
if [ -z "$INGRESS_IP" ]; then
    INGRESS_IP=$(kubectl get ingress domeo-ingress -n domeo-$ENVIRONMENT -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
fi

echo ""
echo "🎉 Развертывание завершено!"
echo ""
echo "📋 Информация о развертывании:"
echo "   Environment: $ENVIRONMENT"
echo "   Namespace: domeo-$ENVIRONMENT"
echo "   Image: $REGISTRY/$IMAGE_NAME:$IMAGE_TAG"
echo "   Ingress IP: $INGRESS_IP"
echo ""
echo "🌐 URL приложения:"
if [ "$ENVIRONMENT" = "staging" ]; then
    echo "   https://staging.domeo.ru"
else
    echo "   https://domeo.ru"
fi
echo ""
echo "🔧 Полезные команды:"
echo "   kubectl get pods -n domeo-$ENVIRONMENT"
echo "   kubectl logs -f deployment/domeo-app -n domeo-$ENVIRONMENT"
echo "   kubectl get services -n domeo-$ENVIRONMENT"
echo "   kubectl get ingress -n domeo-$ENVIRONMENT"
echo "   kubectl describe ingress domeo-ingress -n domeo-$ENVIRONMENT"
echo ""
echo "📊 Мониторинг:"
echo "   kubectl top pods -n domeo-$ENVIRONMENT"
echo "   kubectl get events -n domeo-$ENVIRONMENT --sort-by='.lastTimestamp'"


