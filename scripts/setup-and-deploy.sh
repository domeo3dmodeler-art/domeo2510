#!/bin/bash

# Финальная настройка и развертывание Domeo на YC Kubernetes
# Usage: ./scripts/setup-and-deploy.sh

set -e

echo "🚀 Финальная настройка и развертывание Domeo на YC Kubernetes..."

# Проверка наличия необходимых инструментов
echo "🔍 Проверка инструментов..."

if ! command -v yc &> /dev/null; then
    echo "❌ YC CLI не установлен"
    echo "Установите: curl -sSL https://storage.yandexcloud.net/yandexcloud-yc/install.sh | bash"
    exit 1
fi

if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl не установлен"
    echo "Установите: https://kubernetes.io/docs/tasks/tools/"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен"
    echo "Установите: https://docs.docker.com/get-docker/"
    exit 1
fi

echo "✅ Все инструменты установлены"

# 1. Настройка кластера
echo "🏗️ Настройка кластера YC..."
./scripts/setup-yc-cluster.sh

# 2. Полное развертывание staging
echo "🚀 Развертывание staging..."
./scripts/deploy-full.sh staging

# 3. Проверка работоспособности
echo "🔍 Проверка работоспособности..."
kubectl get pods -n domeo-staging
kubectl get services -n domeo-staging
kubectl get ingress -n domeo-staging

# 4. Health check
echo "🏥 Health check..."
kubectl run health-check --image=curlimages/curl --rm -i --restart=Never -- \
  curl -f http://domeo-app-service.domeo-staging.svc.cluster.local/api/health

echo ""
echo "🎉 Настройка и развертывание завершены!"
echo ""
echo "📋 Информация о развертывании:"
echo "   Staging URL: https://staging.domeo.ru"
echo "   Namespace: domeo-staging"
echo "   Pods: $(kubectl get pods -n domeo-staging --no-headers | wc -l)"
echo "   Services: $(kubectl get services -n domeo-staging --no-headers | wc -l)"
echo ""
echo "🔧 Полезные команды:"
echo "   kubectl get pods -n domeo-staging"
echo "   kubectl logs -f deployment/domeo-app -n domeo-staging"
echo "   kubectl get services -n domeo-staging"
echo "   kubectl get ingress -n domeo-staging"
echo ""
echo "📊 Мониторинг:"
echo "   kubectl top pods -n domeo-staging"
echo "   kubectl get events -n domeo-staging --sort-by='.lastTimestamp'"
echo ""
echo "🚀 Следующие шаги:"
echo "   1. Настроить DNS для staging.domeo.ru"
echo "   2. Настроить SSL сертификаты"
echo "   3. Настроить мониторинг (Prometheus + Grafana)"
echo "   4. Настроить CI/CD (GitHub Actions)"
echo "   5. Развернуть production окружение"


