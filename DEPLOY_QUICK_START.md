# Быстрый старт для деплоя

## 1. Получить JSON ключ сервисного аккаунта

### Через веб-консоль:
1. [Yandex Cloud Console](https://console.cloud.yandex.ru/) → IAM → Сервисные аккаунты
2. Выберите сервисный аккаунт (или создайте новый)
3. Вкладка "Ключи" → "Создать новый ключ" → "JSON"
4. **Скопируйте и сохраните** JSON ключ (показывается только один раз!)

### Через CLI:
```bash
# Установите YC CLI (см. полное руководство)
yc iam key create --service-account-id <sa-id> --output sa-key.json
cat sa-key.json
```

## 2. Установить инструменты

### Windows (PowerShell):
```powershell
# YC CLI
Invoke-WebRequest -Uri https://storage.yandexcloud.net/yandexcloud-yc/install.ps1 -OutFile install-yc.ps1
.\install-yc.ps1

# Kubectl
choco install kubernetes-cli

# Docker
# Скачайте с https://www.docker.com/products/docker-desktop/
```

### Linux/macOS:
```bash
# YC CLI
curl -sSL https://storage.yandexcloud.net/yandexcloud-yc/install.sh | bash

# Kubectl
sudo apt-get update && sudo apt-get install -y kubectl
# Или: brew install kubectl

# Docker
curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh
```

## 3. Настроить переменные окружения

### Windows (PowerShell):
```powershell
# Сохраните JSON ключ в файл (например, C:\yc\sa-key.json)
# Затем установите переменные:

$env:YC_SERVICE_ACCOUNT_KEY_FILE="C:\yc\sa-key.json"
$env:YC_CLOUD_ID="<cloud-id>"
$env:YC_FOLDER_ID="<folder-id>"
$env:CLUSTER_ID="cat9eenl393qj44riti4"
$env:NAMESPACE="prod"
$env:IMAGE_REPO="cr.yandex/crpuein3jvjccnafs2vc/app"
```

### Linux/macOS:
```bash
# Сохраните JSON ключ в файл (например, ~/.yc/sa-key.json)
# Затем установите переменные:

export YC_SERVICE_ACCOUNT_KEY_FILE="~/.yc/sa-key.json"
export YC_CLOUD_ID="<cloud-id>"
export YC_FOLDER_ID="<folder-id>"
export CLUSTER_ID="cat9eenl393qj44riti4"
export NAMESPACE="prod"
export IMAGE_REPO="cr.yandex/crpuein3jvjccnafs2vc/app"
```

## 4. Настроить YC CLI и подключиться к кластеру

```bash
# Настроить YC CLI
yc config set service-account-key-file $YC_SERVICE_ACCOUNT_KEY_FILE
yc config set cloud-id $YC_CLOUD_ID
yc config set folder-id $YC_FOLDER_ID

# Проверка
yc iam create-token

# Подключиться к Kubernetes
yc managed-kubernetes cluster get-credentials \
  --id $CLUSTER_ID \
  --external \
  --force

kubectl config use-context yc-domeo-prod
kubectl config set-context --current --namespace=$NAMESPACE

# Проверка подключения
kubectl get nodes
kubectl get pods -n prod
```

## 5. Авторизоваться в Container Registry

```bash
yc iam create-token | docker login cr.yandex -u iam --password-stdin

# Проверка
docker pull cr.yandex/crpuein3jvjccnafs2vc/app:latest
```

## 6. Готово! Теперь можно деплоить

```bash
# Применить манифесты
kubectl apply -k k8s/overlays/prod

# Обновить образ
kubectl -n prod set image deployment/app \
  app=cr.yandex/crpuein3jvjccnafs2vc/app:v20251030202308

# Дождаться rollout
kubectl -n prod rollout status deploy/app

# Проверка
kubectl -n prod get pods -l app=app
```

---

## Полное руководство

Для детальных инструкций см. `DEPLOY_SETUP_GUIDE.md`

## Шаблон переменных окружения

Используйте `.env.deploy.template` как основу для ваших переменных окружения

