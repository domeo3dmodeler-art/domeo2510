# 🚀 Деплой в Kubernetes Production

Это руководство описывает процесс деплоя обновленного приложения с данными в Kubernetes кластер Yandex Cloud.

> 📖 **Полная настройка доступа**: См. [DEPLOY_SETUP_GUIDE.md](../DEPLOY_SETUP_GUIDE.md) для инструкций по настройке доступа к Kubernetes и Container Registry.

## 📋 Предварительные требования

1. **Установленные инструменты:**
   - `yc` (Yandex Cloud CLI)
   - `kubectl`
   - `docker`

2. **Доступ к Yandex Cloud:**
   - JSON ключ сервисного аккаунта с правами на:
     - Container Registry (чтение/запись)
     - Kubernetes кластер (доступ к namespace `prod`)
     - Управление кластером

3. **Переменные окружения:**

```bash
# Обязательные
export YC_SERVICE_ACCOUNT_KEY_FILE="/path/to/sa.json"
# ИЛИ
export YC_SA_KEY='{"service_account_id":"...","id":"...","private_key":"..."}'
# ИЛИ  
export YC_SA_JSON='{"service_account_id":"...","id":"...","private_key":"..."}'

# Опциональные
export YC_CLOUD_ID="your-cloud-id"        # Автоматически определяется из ключа
export YC_FOLDER_ID="your-folder-id"      # Автоматически определяется из ключа
export CLUSTER_ID="cat9eenl393qj44riti4"  # ID кластера (по умолчанию)
export NAMESPACE="prod"                   # Namespace (по умолчанию)
```

## 🔑 Получение ключа сервисного аккаунта

> 📖 **Подробные инструкции**: См. [DEPLOY_SETUP_GUIDE.md](../DEPLOY_SETUP_GUIDE.md) раздел 1

Если у вас нет ключа сервисного аккаунта:

1. Зайдите в [Yandex Cloud Console](https://console.cloud.yandex.ru/)
2. Перейдите в раздел **IAM** → **Сервисные аккаунты**
3. Найдите или создайте сервисный аккаунт с правами:
   - `k8s.editor` (для управления кластером)
   - `container-registry.editor` (для push образов)
   - `viewer` (для чтения информации)
4. Создайте JSON ключ для сервисного аккаунта
5. Сохраните ключ в безопасное место (не коммитьте в репозиторий!)

## 📝 Процесс деплоя

### Шаг 1: Подготовка переменных окружения

```bash
# Установите путь к JSON ключу
export YC_SERVICE_ACCOUNT_KEY_FILE="/path/to/sa.json"

# Или укажите содержимое JSON напрямую
export YC_SA_KEY='{"service_account_id":"...","id":"...","private_key":"..."}'
```

### Шаг 2: Обновление базы данных в K8s

```bash
# Подключение к кластеру
yc managed-kubernetes cluster get-credentials --id cat9eenl393qj44riti4 --external --force
kubectl config use-context yc-domeo-prod
kubectl config set-context --current --namespace=prod

# Создание бэкапа текущей БД (на всякий случай)
kubectl -n prod exec -i postgres-0 -- sh -lc "export PGPASSWORD=staging_password; pg_dump -U staging_user -d domeo_staging > /tmp/backup_before_update.sql"

# Копирование дампа БД с тестовой ВМ
scp -i "C:\Users\petr2\.ssh\ssh-key-1757583003347\ssh-key-1757583003347" ubuntu@130.193.40.35:/tmp/domeo-migration/database_backup.sql ./backup/database_backup_k8s.sql

# Восстановление БД в K8s
kubectl -n prod cp ./backup/database_backup_k8s.sql postgres-0:/tmp/database_backup.sql
kubectl -n prod exec -i postgres-0 -- sh -lc "export PGPASSWORD=staging_password; psql -U staging_user -d domeo_staging -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'"
kubectl -n prod exec -i postgres-0 -- sh -lc "export PGPASSWORD=staging_password; psql -U staging_user -d domeo_staging < /tmp/database_backup.sql"
```

### Шаг 3: Обновление фотографий в K8s PVC

```bash
# Копирование архива фотографий с тестовой ВМ
scp -i "C:\Users\petr2\.ssh\ssh-key-1757583003347\ssh-key-1757583003347" ubuntu@130.193.40.35:/tmp/domeo-migration/uploads_backup.tar.gz ./backup/uploads_backup_k8s.tar.gz

# Получаем имя пода приложения
APP_POD=$(kubectl -n prod get pods -l app=app -o jsonpath='{.items[0].metadata.name}')

# Копируем архив в под
kubectl -n prod cp ./backup/uploads_backup_k8s.tar.gz $APP_POD:/tmp/uploads_backup.tar.gz

# Восстанавливаем фотографии
kubectl -n prod exec -i $APP_POD -- sh -lc "cd /app/public/uploads && rm -rf * && tar xzf /tmp/uploads_backup.tar.gz && echo 'Photos restored' && ls -la | head -20"
```

### Шаг 4: Сборка и деплой образа

#### Вариант А: Использование скрипта (рекомендуется)

```bash
# Установите права на выполнение (Linux/Mac)
chmod +x scripts/deploy-to-k8s-prod.sh

# Запустите деплой с указанием тега
./scripts/deploy-to-k8s-prod.sh v20251101120000

# Или без тега (сгенерируется автоматически)
./scripts/deploy-to-k8s-prod.sh
```

#### Вариант Б: Ручной деплой

```bash
# 1. Авторизация в YC
export YC_SERVICE_ACCOUNT_KEY_FILE="/path/to/sa.json"
yc iam create-token

# 2. Авторизация в Container Registry
yc iam create-token | docker login cr.yandex -u iam --password-stdin

# 3. Сборка образа
TAG="v$(date +%Y%m%d%H%M%S)"
IMAGE="cr.yandex/crpuein3jvjccnafs2vc/app:$TAG"
docker build -t "$IMAGE" .

# 4. Пуш образа
docker push "$IMAGE"

# 5. Подключение к кластеру
yc managed-kubernetes cluster get-credentials --id cat9eenl393qj44riti4 --external --force
kubectl config use-context yc-domeo-prod
kubectl config set-context --current --namespace=prod

# 6. Обновление deployment
kubectl -n prod set image deployment/app app="$IMAGE"

# 7. Ожидание завершения rollout
kubectl -n prod rollout status deployment/app --timeout=180s
```

### Шаг 5: Проверка

```bash
# Проверка статуса deployment
kubectl -n prod get deploy app
kubectl -n prod get pods -l app=app

# Проверка логов
kubectl -n prod logs -l app=app --tail=50

# Health check
curl http://158.160.202.117/api/health

# Проверка главной страницы
curl http://158.160.202.117/
```

## 🔄 Откат (Rollback)

Если что-то пошло не так:

```bash
# Посмотреть историю rollout
kubectl -n prod rollout history deployment/app

# Откатить к предыдущей версии
kubectl -n prod rollout undo deployment/app

# Откатить к конкретной версии
kubectl -n prod rollout undo deployment/app --to-revision=2

# Проверить статус
kubectl -n prod rollout status deployment/app
```

## 🔍 Проверка данных

### Проверка базы данных

```bash
# Количество таблиц
kubectl -n prod exec -i postgres-0 -- sh -lc "export PGPASSWORD=staging_password; psql -U staging_user -d domeo_staging -c 'SELECT count(*) FROM pg_tables WHERE schemaname='\''public'\'';'"

# Количество товаров
kubectl -n prod exec -i postgres-0 -- sh -lc "export PGPASSWORD=staging_password; psql -U staging_user -d domeo_staging -c 'SELECT count(*) FROM products;'"
```

### Проверка фотографий

```bash
APP_POD=$(kubectl -n prod get pods -l app=app -o jsonpath='{.items[0].metadata.name}')
kubectl -n prod exec -i $APP_POD -- sh -lc "find /app/public/uploads -type f | wc -l"
kubectl -n prod exec -i $APP_POD -- sh -lc "du -sh /app/public/uploads"
```

## ⚠️ Важные замечания

1. **База данных**: Обязательно создавайте бэкап перед обновлением
2. **Фотографии**: PVC `app-uploads` монтируется в один под (ReadWriteOnce), поэтому при масштабировании нужно использовать общее хранилище
3. **Образы**: Всегда используйте конкретные теги, не `latest`
4. **Секреты**: Никогда не коммитьте ключи в репозиторий

## 🆘 Устранение проблем

### Проблема: Ошибка авторизации в YC

```bash
# Проверьте путь к ключу
echo $YC_SERVICE_ACCOUNT_KEY_FILE

# Проверьте содержимое ключа (первые 50 символов)
head -c 50 "$YC_SERVICE_ACCOUNT_KEY_FILE"

# Попробуйте создать токен вручную
yc iam create-token
```

### Проблема: Ошибка доступа к кластеру

```bash
# Проверьте контекст
kubectl config get-contexts

# Переключитесь на правильный контекст
kubectl config use-context yc-domeo-prod

# Проверьте права доступа
kubectl -n prod get nodes
```

### Проблема: Pod не запускается

```bash
# Посмотреть события
kubectl -n prod describe pod <pod-name>

# Посмотреть логи
kubectl -n prod logs <pod-name>

# Проверить ресурсы
kubectl -n prod top pods
```

## 📞 Контакты

- **Production URL**: http://158.160.202.117/
- **Health Check**: http://158.160.202.117/api/health
- **Кластер**: `cat9eenl393qj44riti4`
- **Namespace**: `prod`

---

**Последнее обновление**: 2025-10-31

