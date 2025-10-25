# Настройка кластера Yandex Cloud Kubernetes

## 1. Подготовка кластера YC

### Создание кластера
```bash
# Установка YC CLI
curl -sSL https://storage.yandexcloud.net/yandexcloud-yc/install.sh | bash

# Инициализация
yc init

# Создание кластера
yc managed-kubernetes cluster create \
  --name domeo-cluster \
  --network-id <network-id> \
  --subnet-id <subnet-id> \
  --zone ru-central1-a \
  --service-account-id <service-account-id> \
  --node-service-account-id <node-service-account-id> \
  --release-channel regular \
  --version 1.28

# Получение kubeconfig
yc managed-kubernetes cluster get-credentials domeo-cluster --external
```

### Создание Container Registry
```bash
# Создание registry
yc container registry create --name domeo-registry

# Получение ID registry
yc container registry get domeo-registry

# Настройка Docker для работы с registry
yc container registry configure-docker
```

## 2. Настройка Service Account

### Создание Service Account
```bash
# Создание SA для кластера
yc iam service-account create --name domeo-cluster-sa

# Создание SA для нод
yc iam service-account create --name domeo-node-sa

# Назначение ролей
yc resource-manager folder add-access-binding <folder-id> \
  --role container-registry.images.puller \
  --subject serviceAccount:<cluster-sa-id>

yc resource-manager folder add-access-binding <folder-id> \
  --role container-registry.images.pusher \
  --subject serviceAccount:<cluster-sa-id>

yc resource-manager folder add-access-binding <folder-id> \
  --role storage.editor \
  --subject serviceAccount:<node-sa-id>
```

## 3. Настройка секретов

### Создание секретов в Kubernetes
```bash
# Создание namespace
kubectl create namespace domeo-staging
kubectl create namespace domeo-production

# Создание секретов для staging
kubectl create secret generic domeo-secrets \
  --from-literal=database-url="postgresql://domeo_user:domeo_password@postgres-service:5432/domeo" \
  --from-literal=jwt-secret="staging-jwt-secret-key-change-in-production" \
  --from-literal=yandex-access-key="your-access-key" \
  --from-literal=yandex-secret-key="your-secret-key" \
  -n domeo-staging

# Создание секретов для production
kubectl create secret generic domeo-secrets \
  --from-literal=database-url="postgresql://domeo_user:domeo_password@postgres-service:5432/domeo" \
  --from-literal=jwt-secret="production-jwt-secret-key-change-in-production" \
  --from-literal=yandex-access-key="your-access-key" \
  --from-literal=yandex-secret-key="your-secret-key" \
  -n domeo-production
```

## 4. Развертывание приложения

### Пошаговое развертывание
```bash
# 1. Применить namespace
kubectl apply -f k8s/namespace.yaml

# 2. Развернуть PostgreSQL
kubectl apply -f k8s/postgres.yaml

# 3. Дождаться готовности PostgreSQL
kubectl wait --for=condition=ready pod -l app=postgres -n domeo-staging --timeout=300s

# 4. Запустить миграции
kubectl apply -f k8s/migrations.yaml

# 5. Дождаться завершения миграций
kubectl wait --for=condition=complete job/domeo-migrations -n domeo-staging --timeout=300s

# 6. Развернуть приложение
kubectl apply -f k8s/app.yaml

# 7. Проверить статус
kubectl get pods -n domeo-staging
```

## 5. Настройка мониторинга

### Установка Prometheus
```bash
# Добавление Helm репозитория
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Установка Prometheus
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set grafana.adminPassword=admin123
```

### Настройка Grafana
```bash
# Получение пароля admin
kubectl get secret --namespace monitoring prometheus-grafana -o jsonpath="{.data.admin-password}" | base64 -d

# Port forward для доступа к Grafana
kubectl port-forward --namespace monitoring svc/prometheus-grafana 3000:80
```

## 6. Настройка CI/CD

### GitHub Secrets
Нужно добавить в GitHub репозиторий следующие секреты:

```
YC_SERVICE_ACCOUNT_KEY - JSON ключ service account
KUBECONFIG_STAGING - kubeconfig для staging
KUBECONFIG_PRODUCTION - kubeconfig для production
```

### Получение kubeconfig
```bash
# Для staging
yc managed-kubernetes cluster get-credentials domeo-cluster --external --context-name staging

# Для production
yc managed-kubernetes cluster get-credentials domeo-cluster --external --context-name production
```

## 7. Настройка доменов

### Настройка DNS
```bash
# Получение IP адреса Ingress
kubectl get ingress domeo-ingress -n domeo-staging

# Настройка A-записи в DNS
# staging.domeo.ru -> <ingress-ip>
# domeo.ru -> <ingress-ip>
```

## 8. Команды для управления

### Основные команды
```bash
# Посмотреть статус
kubectl get pods -n domeo-staging
kubectl get services -n domeo-staging
kubectl get ingress -n domeo-staging

# Посмотреть логи
kubectl logs -f deployment/domeo-app -n domeo-staging

# Масштабирование
kubectl scale deployment domeo-app --replicas=3 -n domeo-staging

# Обновление образа
kubectl set image deployment/domeo-app domeo-app=cr.yandex/your-registry/domeo:latest -n domeo-staging

# Rollback
kubectl rollout undo deployment/domeo-app -n domeo-staging

# Посмотреть события
kubectl get events -n domeo-staging --sort-by='.lastTimestamp'
```

### Отладка
```bash
# Подключиться к поду
kubectl exec -it deployment/domeo-app -n domeo-staging -- /bin/sh

# Посмотреть описание пода
kubectl describe pod <pod-name> -n domeo-staging

# Посмотреть логи всех подов
kubectl logs -l app=domeo-app -n domeo-staging --all-containers=true
```

## 9. Автоматизация

### Скрипт полного развертывания
```bash
#!/bin/bash
set -e

echo "🚀 Полное развертывание Domeo на YC Kubernetes..."

# 1. Создание namespace
echo "📁 Создание namespace..."
kubectl apply -f k8s/namespace.yaml

# 2. Развертывание PostgreSQL
echo "🗄️ Развертывание PostgreSQL..."
kubectl apply -f k8s/postgres.yaml
kubectl wait --for=condition=ready pod -l app=postgres -n domeo-staging --timeout=300s

# 3. Миграции
echo "🔄 Запуск миграций..."
kubectl apply -f k8s/migrations.yaml
kubectl wait --for=condition=complete job/domeo-migrations -n domeo-staging --timeout=300s

# 4. Развертывание приложения
echo "🚀 Развертывание приложения..."
kubectl apply -f k8s/app.yaml

# 5. Ожидание готовности
echo "⏳ Ожидание готовности..."
kubectl wait --for=condition=ready pod -l app=domeo-app -n domeo-staging --timeout=300s

# 6. Проверка статуса
echo "✅ Проверка статуса..."
kubectl get pods -n domeo-staging
kubectl get services -n domeo-staging
kubectl get ingress -n domeo-staging

echo "🎉 Развертывание завершено!"
echo "🌐 Staging URL: https://staging.domeo.ru"
echo "📊 Grafana: kubectl port-forward --namespace monitoring svc/prometheus-grafana 3000:80"
```

## 10. Мониторинг и алерты

### Настройка алертов
```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: domeo-alerts
  namespace: domeo-staging
spec:
  groups:
  - name: domeo.rules
    rules:
    - alert: DomeoAppDown
      expr: up{job="domeo-app"} == 0
      for: 1m
      labels:
        severity: critical
      annotations:
        summary: "Domeo application is down"
        description: "Domeo application has been down for more than 1 minute."
    
    - alert: DomeoHighMemoryUsage
      expr: (container_memory_usage_bytes{name="domeo-app"} / container_spec_memory_limit_bytes{name="domeo-app"}) > 0.8
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High memory usage"
        description: "Domeo application memory usage is above 80%"
```

## 11. Backup и восстановление

### Backup базы данных
```bash
# Создание backup
kubectl exec -it deployment/postgres -n domeo-staging -- pg_dump -U domeo_user domeo > backup.sql

# Восстановление из backup
kubectl exec -i deployment/postgres -n domeo-staging -- psql -U domeo_user domeo < backup.sql
```

### Backup секретов
```bash
# Backup секретов
kubectl get secret domeo-secrets -n domeo-staging -o yaml > secrets-backup.yaml

# Восстановление секретов
kubectl apply -f secrets-backup.yaml
```


