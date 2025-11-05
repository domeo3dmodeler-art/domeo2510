# Полный пайплайн миграции данных на Kubernetes Production

Этот документ описывает полный процесс миграции данных (база данных и фотографии) с тестовой ВМ в Kubernetes Production кластер Yandex Cloud.

## 📋 Предварительные требования

### Инструменты

- **YC CLI** - установлен и настроен
- **kubectl** - установлен и подключен к кластеру
- **Docker** - для сборки образов (опционально, можно использовать GitHub Actions)
- **SSH доступ** к тестовой ВМ

### Переменные окружения

```bash
# Kubernetes кластер
export CLUSTER_ID="cat9eenl393qj44riti4"
export NAMESPACE="prod"
export IMAGE_REPO="cr.yandex/crpuein3jvjccnafs2vc/app"

# Тестовая ВМ
export STAGING_HOST="130.193.40.35"
export STAGING_USER="ubuntu"
export STAGING_SSH_KEY="C:\\Users\\petr2\\.ssh\\ssh-key-1757583003347\\ssh-key-1757583003347"
export STAGING_PATH="/opt/domeo"

# Container Registry
export REGISTRY="cr.yandex/crpuein3jvjccnafs2vc"
export IMAGE_NAME="app"
```

> 📖 **Полная настройка доступа**: См. [DEPLOY_SETUP_GUIDE.md](../DEPLOY_SETUP_GUIDE.md)

## 🚀 Пайплайн миграции

### Шаг 1: Подключение к Kubernetes кластеру

```bash
# Получить credentials для кластера
yc managed-kubernetes cluster get-credentials \
  --id $CLUSTER_ID \
  --external \
  --force

# Настроить контекст
kubectl config use-context yc-domeo-prod
kubectl config set-context --current --namespace=$NAMESPACE

# Проверка подключения
kubectl -n $NAMESPACE get nodes
kubectl -n $NAMESPACE get pods
```

### Шаг 2: Создание бэкапов на тестовой ВМ

```bash
# Создать директорию для бэкапов
ssh -i "$STAGING_SSH_KEY" -o StrictHostKeyChecking=no \
  "$STAGING_USER@$STAGING_HOST" \
  "cd $STAGING_PATH && mkdir -p /tmp/domeo-k8s-migration"

# Бэкап базы данных
ssh -i "$STAGING_SSH_KEY" -o StrictHostKeyChecking=no \
  "$STAGING_USER@$STAGING_HOST" \
  "cd $STAGING_PATH && \
   docker compose -f docker-compose.staging.yml exec -T staging-postgres \
   pg_dump -U staging_user domeo_staging > /tmp/domeo-k8s-migration/database_backup.sql"

# Бэкап фотографий
ssh -i "$STAGING_SSH_KEY" -o StrictHostKeyChecking=no \
  "$STAGING_USER@$STAGING_HOST" \
  "cd $STAGING_PATH && \
   docker run --rm \
     -v domeo_staging_uploads:/source:ro \
     -v /tmp/domeo-k8s-migration:/backup \
     alpine tar czf /backup/uploads_backup.tar.gz -C /source ."

# Проверка размеров
ssh -i "$STAGING_SSH_KEY" -o StrictHostKeyChecking=no \
  "$STAGING_USER@$STAGING_HOST" \
  "du -h /tmp/domeo-k8s-migration/*"
```

**Ожидаемый результат:**
- `database_backup.sql` - ~8-10MB
- `uploads_backup.tar.gz` - ~70-75MB

### Шаг 3: Скачивание бэкапов на локальную машину

```bash
# Создать локальную директорию
mkdir -p ./backup

# Скачать базу данных
scp -i "$STAGING_SSH_KEY" -o StrictHostKeyChecking=no \
  "$STAGING_USER@$STAGING_HOST:/tmp/domeo-k8s-migration/database_backup.sql" \
  ./backup/database_backup_k8s.sql

# Скачать фотографии
scp -i "$STAGING_SSH_KEY" -o StrictHostKeyChecking=no \
  "$STAGING_USER@$STAGING_HOST:/tmp/domeo-k8s-migration/uploads_backup.tar.gz" \
  ./backup/uploads_backup_k8s.tar.gz

# Проверка размеров
ls -lh ./backup/
```

### Шаг 4: Восстановление базы данных в Kubernetes

```bash
# Скопировать SQL файл в под PostgreSQL
kubectl -n $NAMESPACE cp ./backup/database_backup_k8s.sql postgres-0:/tmp/database_backup.sql

# Очистить существующую БД
kubectl -n $NAMESPACE exec -i postgres-0 -- sh -lc "
  export PGPASSWORD=staging_password;
  psql -U staging_user -d domeo_staging -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'
"

# Восстановить БД из бэкапа
kubectl -n $NAMESPACE exec -i postgres-0 -- sh -lc "
  export PGPASSWORD=staging_password;
  psql -U staging_user -d domeo_staging < /tmp/database_backup.sql
"

# Проверка восстановления
kubectl -n $NAMESPACE exec -i postgres-0 -- sh -lc "
  export PGPASSWORD=staging_password;
  psql -U staging_user -d domeo_staging -t -c 'SELECT count(*) FROM products;'
"
```

**Ожидаемый результат:** Количество товаров (например, 3754)

### Шаг 5: Восстановление фотографий в Kubernetes PVC

```bash
# Получить имя пода приложения
APP_POD=$(kubectl -n $NAMESPACE get pods -l app=app -o jsonpath='{.items[0].metadata.name}')

# Скопировать архив в под
kubectl -n $NAMESPACE cp ./backup/uploads_backup_k8s.tar.gz "$APP_POD:/tmp/uploads_backup.tar.gz"

# Восстановить фотографии
kubectl -n $NAMESPACE exec -i "$APP_POD" -- sh -lc "
  cd /app/public/uploads &&
  rm -rf * &&
  tar xzf /tmp/uploads_backup.tar.gz &&
  echo 'Photos restored' &&
  du -sh . &&
  find . -type f | wc -l
"
```

**Ожидаемый результат:** 
- Размер: ~74-75MB
- Количество файлов: ~575-581

### Шаг 6: Сборка Docker образа (на тестовой ВМ)

```bash
# Генерация тега
TAG="v$(date +%Y%m%d%H%M%S)"

# Сборка образа на тестовой ВМ
ssh -i "$STAGING_SSH_KEY" -o StrictHostKeyChecking=no \
  "$STAGING_USER@$STAGING_HOST" \
  "cd $STAGING_PATH && \
   git pull origin develop && \
   docker build -t $REGISTRY/$IMAGE_NAME:$TAG -f Dockerfile.production . && \
   echo 'Build completed: $REGISTRY/$IMAGE_NAME:$TAG'"

# Запомнить тег для следующих шагов
echo "IMAGE_TAG=$TAG" > .env.migration
```

**Примечание:** Можно также использовать GitHub Actions для сборки образа (см. Шаг 7)

### Шаг 7: Пуш образа в Container Registry

#### Вариант A: С тестовой ВМ (если Docker доступен)

```bash
# Получить токен авторизации
YC_TOKEN=$(yc iam create-token)

# Авторизоваться в Docker и запушить образ
ssh -i "$STAGING_SSH_KEY" -o StrictHostKeyChecking=no \
  "$STAGING_USER@$STAGING_HOST" \
  "cd $STAGING_PATH && \
   rm -f ~/.docker/config.json && \
   mkdir -p ~/.docker && \
   echo '$YC_TOKEN' | docker login cr.yandex -u iam --password-stdin && \
   docker push $REGISTRY/$IMAGE_NAME:$TAG && \
   echo 'Image pushed: $REGISTRY/$IMAGE_NAME:$TAG'"

# Проверить digest образа
ssh -i "$STAGING_SSH_KEY" -o StrictHostKeyChecking=no \
  "$STAGING_USER@$STAGING_HOST" \
  "docker images $REGISTRY/$IMAGE_NAME:$TAG"
```

#### Вариант B: Через GitHub Actions (рекомендуется)

```bash
# Запушить изменения в main ветку (автоматически запустит workflow)
git checkout main
git merge develop
git push origin main

# Или запустить workflow вручную через GitHub UI:
# Actions → Prod Deploy → Run workflow → указать image_tag: v20251031154220
```

### Шаг 8: Обновление Deployment в Kubernetes

```bash
# Загрузить тег образа (если использовался Вариант A)
source .env.migration  # или указать вручную
IMAGE_TAG="v20251031154220"  # или использовать тег из GitHub Actions

# Обновить образ в deployment
kubectl -n $NAMESPACE set image deployment/app \
  app=$REGISTRY/$IMAGE_NAME:$IMAGE_TAG

# Дождаться завершения rollout
kubectl -n $NAMESPACE rollout status deployment/app --timeout=300s

# Проверить статус подов
kubectl -n $NAMESPACE get pods -l app=app

# Проверить deployment
kubectl -n $NAMESPACE get deployment app
```

**Ожидаемый результат:**
- Deployment обновлен
- 2/2 pods в статусе `Running`
- Новый образ активен

### Шаг 9: Проверка работоспособности

```bash
# Проверка Health Check
curl http://158.160.202.117/api/health

# Проверка количества товаров в БД
kubectl -n $NAMESPACE exec -i $(kubectl -n $NAMESPACE get pods -l app=app -o jsonpath='{.items[0].metadata.name}') \
  -- sh -lc "export PGPASSWORD=staging_password; psql -U staging_user -d domeo_staging -t -c 'SELECT count(*) FROM products;'"

# Проверка количества фотографий
kubectl -n $NAMESPACE exec -i $(kubectl -n $NAMESPACE get pods -l app=app -o jsonpath='{.items[0].metadata.name}') \
  -- sh -lc "find /app/public/uploads -type f 2>/dev/null | wc -l"

# Проверка логов приложения
kubectl -n $NAMESPACE logs -l app=app --tail=50
```

### Шаг 10: Очистка временных файлов

```bash
# Очистить бэкапы на тестовой ВМ
ssh -i "$STAGING_SSH_KEY" -o StrictHostKeyChecking=no \
  "$STAGING_USER@$STAGING_HOST" \
  "rm -rf /tmp/domeo-k8s-migration"

# Очистить локальные бэкапы (опционально)
# rm -rf ./backup/database_backup_k8s.sql ./backup/uploads_backup_k8s.tar.gz
```

## 🔄 Быстрый скрипт миграции

Создан автоматизированный скрипт: `scripts/migrate-to-k8s-prod.sh`

**Использование:**
```bash
# Установить переменные окружения
export YC_SERVICE_ACCOUNT_KEY_FILE="/path/to/sa-key.json"
export STAGING_SSH_KEY="/path/to/ssh-key"
export CLUSTER_ID="cat9eenl393qj44riti4"
export NAMESPACE="prod"

# Запустить миграцию
./scripts/migrate-to-k8s-prod.sh v20251031154220
```

Скрипт автоматически выполнит все шаги:
1. Создание бэкапов
2. Скачивание на локальную машину
3. Восстановление БД в K8s
4. Восстановление фото в K8s
5. Сборка и пуш образа
6. Обновление deployment

## 📊 Конфигурация Production

- **URL**: http://158.160.202.117/
- **Health Check**: http://158.160.202.117/api/health
- **Namespace**: `prod`
- **Cluster ID**: `cat9eenl393qj44riti4`
- **Registry**: `cr.yandex/crpuein3jvjccnafs2vc/app`
- **PostgreSQL**: 
  - User: `staging_user`
  - Password: `staging_password`
  - Database: `domeo_staging`
- **PVC**: `app-uploads` (5Gi)

## ⚠️ Важные моменты

1. **Бэкапы**: Всегда создавайте бэкапы перед миграцией
2. **Тестирование**: Проверяйте работоспособность после каждого шага
3. **Rollback**: При проблемах используйте `kubectl rollout undo deployment/app`
4. **Образы**: Убедитесь, что образ запушен в registry перед обновлением deployment
5. **Доступ**: Проверьте доступ к кластеру и Container Registry перед началом

## 🐛 Устранение проблем

### Образ не загружается (ImagePullBackOff)

```bash
# Проверить, что образ запушен
yc container registry image list --registry-name default --repository-name app

# Проверить логи пода
kubectl -n $NAMESPACE describe pod <pod-name>

# Переавторизоваться в Docker
yc iam create-token | docker login cr.yandex -u iam --password-stdin
```

### Deployment не обновляется

```bash
# Проверить события
kubectl -n $NAMESPACE describe deployment app

# Проверить статус rollout
kubectl -n $NAMESPACE rollout status deployment/app

# Откатить при необходимости
kubectl -n $NAMESPACE rollout undo deployment/app
```

### БД не восстанавливается

```bash
# Проверить логи PostgreSQL
kubectl -n $NAMESPACE logs postgres-0

# Проверить подключение к БД
kubectl -n $NAMESPACE exec -it postgres-0 -- sh -lc \
  "export PGPASSWORD=staging_password; psql -U staging_user -d domeo_staging -c '\dt'"
```

## 📝 Чеклист миграции

- [ ] Проверка подключения к Kubernetes кластеру
- [ ] Создание бэкапов на тестовой ВМ
- [ ] Скачивание бэкапов локально
- [ ] Восстановление БД в Kubernetes
- [ ] Проверка количества товаров в БД
- [ ] Восстановление фотографий в Kubernetes PVC
- [ ] Проверка количества файлов
- [ ] Сборка Docker образа
- [ ] Пуш образа в Container Registry
- [ ] Обновление deployment
- [ ] Проверка статуса подов (2/2 Running)
- [ ] Проверка Health Check
- [ ] Проверка работоспособности приложения
- [ ] Очистка временных файлов

## 📚 Связанная документация

- [DEPLOY_SETUP_GUIDE.md](../DEPLOY_SETUP_GUIDE.md) - Настройка доступа к Kubernetes
- [DEPLOY_TO_K8S.md](./DEPLOY_TO_K8S.md) - Детали деплоя в K8s
- [K8S_ACCESS_SETUP.md](./K8S_ACCESS_SETUP.md) - Настройка доступа к кластеру

---

**Последнее обновление**: 31.10.2025  
**Версия пайплайна**: 1.0

