# 🚀 Domeo Kubernetes Deployment

Полное развертывание приложения Domeo на Yandex Cloud Kubernetes с автоматизацией и мониторингом.

## 📋 Быстрый старт

### 1. Настройка кластера YC
```bash
# Запуск автоматической настройки
./scripts/setup-yc-cluster.sh
```

### 2. Полное развертывание
```bash
# Развертывание на staging
./scripts/deploy-full.sh staging

# Развертывание на production
./scripts/deploy-full.sh production
```

### 3. Быстрое обновление
```bash
# Обновление staging
./scripts/quick-update.sh staging latest

# Обновление production
./scripts/quick-update.sh production v1.2.3
```

## 🏗️ Архитектура

```
┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │   Ingress       │
│   (YC)          │────│   (nginx)        │
└─────────────────┘    └─────────────────┘
                                │
                    ┌───────────┼───────────┐
                    │           │           │
            ┌───────▼───┐ ┌─────▼─────┐ ┌──▼────────┐
            │ Domeo App │ │ PostgreSQL│ │ Monitoring│
            │ (2 pods)  │ │ (1 pod)   │ │ (Prometheus│
            └───────────┘ └───────────┘ │ + Grafana) │
                                       └────────────┘
```

## 📁 Структура проекта

```
├── .github/workflows/          # CI/CD пайплайны
├── k8s/                        # Kubernetes манифесты
│   ├── namespace.yaml          # Namespace
│   ├── secrets.yaml           # Секреты
│   ├── postgres.yaml          # PostgreSQL
│   ├── app.yaml               # Приложение
│   ├── migrations.yaml        # Миграции БД
│   └── monitoring.yaml        # Мониторинг
├── scripts/                    # Скрипты деплоя
│   ├── setup-yc-cluster.sh    # Настройка кластера
│   ├── deploy-full.sh         # Полное развертывание
│   ├── quick-update.sh        # Быстрое обновление
│   └── quick-deploy.sh         # Быстрый деплой
├── docs/                       # Документация
│   ├── DEPLOYMENT_GUIDE.md     # Руководство по деплою
│   └── YC_KUBERNETES_SETUP.md  # Настройка YC
└── Dockerfile                  # Docker образ
```

## 🔧 Команды управления

### Основные команды
```bash
# Статус подов
kubectl get pods -n domeo-staging
kubectl get pods -n domeo-production

# Логи приложения
kubectl logs -f deployment/domeo-app -n domeo-staging

# Масштабирование
kubectl scale deployment domeo-app --replicas=3 -n domeo-staging

# Обновление образа
kubectl set image deployment/domeo-app domeo-app=cr.yandex/your-registry/domeo:latest -n domeo-staging

# Rollback
kubectl rollout undo deployment/domeo-app -n domeo-staging

# Статус rollout
kubectl rollout status deployment/domeo-app -n domeo-staging
```

### Отладка
```bash
# Описание пода
kubectl describe pod <pod-name> -n domeo-staging

# Подключение к поду
kubectl exec -it deployment/domeo-app -n domeo-staging -- /bin/sh

# События
kubectl get events -n domeo-staging --sort-by='.lastTimestamp'

# Логи всех подов
kubectl logs -l app=domeo-app -n domeo-staging --all-containers=true
```

### Мониторинг
```bash
# Использование ресурсов
kubectl top pods -n domeo-staging
kubectl top nodes

# Статус сервисов
kubectl get services -n domeo-staging
kubectl get ingress -n domeo-staging

# Проверка здоровья
kubectl get pods -n domeo-staging -o wide
```

## 🌐 Доступ к приложению

### Staging
- **URL**: https://staging.domeo.ru
- **Namespace**: domeo-staging
- **Ingress**: domeo-ingress

### Production
- **URL**: https://domeo.ru
- **Namespace**: domeo-production
- **Ingress**: domeo-ingress

## 📊 Мониторинг

### Prometheus
```bash
# Port forward для доступа к Prometheus
kubectl port-forward --namespace monitoring svc/prometheus-prometheus 9090:9090
```

### Grafana
```bash
# Port forward для доступа к Grafana
kubectl port-forward --namespace monitoring svc/prometheus-grafana 3000:80

# Получение пароля admin
kubectl get secret --namespace monitoring prometheus-grafana -o jsonpath="{.data.admin-password}" | base64 -d
```

### Алерты
- **DomeoAppDown**: Приложение недоступно
- **DomeoHighMemoryUsage**: Высокое использование памяти (>80%)
- **DomeoHighCPUUsage**: Высокое использование CPU (>80%)
- **DomeoSlowResponse**: Медленный ответ (>2 сек)
- **DomeoHighErrorRate**: Высокий процент ошибок (>5%)
- **PostgresDown**: База данных недоступна
- **PostgresHighConnections**: Много подключений к БД (>80)

## 🔄 CI/CD

### GitHub Actions
Автоматический деплой при push в ветки:
- **develop** → staging
- **main** → production

### Требуемые секреты в GitHub:
- `YC_SERVICE_ACCOUNT_KEY` - JSON ключ service account
- `KUBECONFIG_STAGING` - kubeconfig для staging
- `KUBECONFIG_PRODUCTION` - kubeconfig для production

## 🗄️ База данных

### PostgreSQL
- **Версия**: 15
- **Хранилище**: 10Gi PersistentVolume
- **Backup**: Автоматический через cron job
- **Мониторинг**: Встроенные метрики

### Миграции
- **Автоматические**: При деплое через Job
- **Ручные**: `kubectl apply -f k8s/migrations.yaml`
- **Статус**: `kubectl get jobs -n domeo-staging`

## 🔐 Безопасность

### Секреты
- **Хранение**: Kubernetes Secrets
- **Шифрование**: В покое и в движении
- **Доступ**: Только для подов в namespace

### Сетевая безопасность
- **Ingress**: TLS/SSL сертификаты
- **Service**: ClusterIP (внутренний доступ)
- **Pod**: Security contexts

## 📈 Масштабирование

### Горизонтальное (HPA)
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: domeo-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: domeo-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Вертикальное (VPA)
```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: domeo-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: domeo-app
  updatePolicy:
    updateMode: "Auto"
```

## 🚨 Troubleshooting

### Частые проблемы

#### 1. Поды не запускаются
```bash
kubectl describe pod <pod-name> -n domeo-staging
kubectl logs <pod-name> -n domeo-staging
```

#### 2. Проблемы с базой данных
```bash
kubectl logs deployment/postgres -n domeo-staging
kubectl exec -it deployment/postgres -n domeo-staging -- psql -U domeo_user domeo
```

#### 3. Проблемы с сетью
```bash
kubectl get ingress -n domeo-staging
kubectl describe ingress domeo-ingress -n domeo-staging
```

#### 4. Проблемы с ресурсами
```bash
kubectl top pods -n domeo-staging
kubectl describe nodes
```

### Логи и отладка
```bash
# Логи приложения
kubectl logs -f deployment/domeo-app -n domeo-staging

# Логи PostgreSQL
kubectl logs -f deployment/postgres -n domeo-staging

# События кластера
kubectl get events -n domeo-staging --sort-by='.lastTimestamp'

# Статус всех ресурсов
kubectl get all -n domeo-staging
```

## 📚 Дополнительные ресурсы

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Yandex Cloud Kubernetes](https://cloud.yandex.ru/docs/managed-kubernetes/)
- [Prometheus Monitoring](https://prometheus.io/docs/)
- [Grafana Dashboards](https://grafana.com/docs/)

## 🤝 Поддержка

При возникновении проблем:
1. Проверьте логи: `kubectl logs -f deployment/domeo-app -n domeo-staging`
2. Проверьте события: `kubectl get events -n domeo-staging`
3. Проверьте статус: `kubectl get pods -n domeo-staging`
4. Создайте issue в репозитории


