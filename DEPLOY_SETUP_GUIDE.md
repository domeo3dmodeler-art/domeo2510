# Полное руководство по настройке деплоя на рабочую машину

## 1. Получение/создание JSON ключа сервисного аккаунта

### Вариант A: Создать новый сервисный аккаунт

#### 1.1. Через веб-консоль Yandex Cloud

1. Войдите в [Yandex Cloud Console](https://console.cloud.yandex.ru/)
2. Перейдите в раздел **"Сервисные аккаунты"** (IAM → Сервисные аккаунты)
3. Нажмите **"Создать сервисный аккаунт"**
4. Заполните:
   - **Имя**: `k8s-deploy-service-account`
   - **Описание**: `Service account for Kubernetes deployments`
5. Нажмите **"Создать"**

#### 1.2. Назначение ролей сервисному аккаунту

Для работы с Kubernetes и Container Registry нужны роли:

```bash
# Вам понадобятся:
# - ID сервисного аккаунта (найдете в консоли после создания)
# - ID облака (cloud-id)
# - ID каталога (folder-id)
```

**Необходимые роли:**
- `k8s.editor` — для управления кластером Kubernetes
- `container-registry.editor` — для push образов в Container Registry
- `viewer` — для чтения информации об облаке/каталоге

**Назначение через веб-консоль:**
1. Откройте созданный сервисный аккаунт
2. Перейдите на вкладку **"Роли"**
3. Нажмите **"Назначить роли"**
4. Добавьте роли: `k8s.editor`, `container-registry.editor`, `viewer`
5. Сохраните

**Назначение через CLI:**
```bash
# Установите YC CLI (см. раздел 2)
# Затем выполните:

YC_SA_ID="<service-account-id>"
YC_CLOUD_ID="<cloud-id>"
YC_FOLDER_ID="<folder-id>"

# Назначение ролей
yc resource-manager folder add-access-binding $YC_FOLDER_ID \
  --subject serviceAccount:$YC_SA_ID \
  --role k8s.editor

yc resource-manager folder add-access-binding $YC_FOLDER_ID \
  --subject serviceAccount:$YC_SA_ID \
  --role container-registry.editor

yc resource-manager folder add-access-binding $YC_FOLDER_ID \
  --subject serviceAccount:$YC_SA_ID \
  --role viewer
```

#### 1.3. Создание JSON ключа

**Через веб-консоль:**
1. Откройте сервисный аккаунт
2. Перейдите на вкладку **"Ключи"**
3. Нажмите **"Создать новый ключ"**
4. Выберите **"JSON"**
5. Нажмите **"Создать"**
6. **Скопируйте и сохраните** JSON ключ (показывается только один раз!)

**Через CLI:**
```bash
# Создать JSON ключ
yc iam key create --service-account-id $YC_SA_ID --output key.json

# Просмотреть содержимое
cat key.json

# ⚠️ ВАЖНО: Сохраните этот JSON ключ в безопасное место!
```

### Вариант B: Использовать существующий сервисный аккаунт

Если у вас уже есть сервисный аккаунт с нужными правами:

1. Откройте сервисный аккаунт в веб-консоли
2. Перейдите на вкладку **"Ключи"**
3. Если ключ уже есть — создайте новый JSON ключ (старые ключи можно удалить позже)

---

## 2. Установка инструментов

### 2.1. Yandex Cloud CLI (YC)

**Windows (PowerShell):**
```powershell
# Скачать и установить
Invoke-WebRequest -Uri https://storage.yandexcloud.net/yandexcloud-yc/install.ps1 -OutFile install-yc.ps1
.\install-yc.ps1
```

**Linux/macOS:**
```bash
curl -sSL https://storage.yandexcloud.net/yandexcloud-yc/install.sh | bash
```

**Проверка установки:**
```bash
yc version
```

### 2.2. Kubectl

**Windows:**
```powershell
# Через Chocolatey
choco install kubernetes-cli

# Или вручную
# Скачайте kubectl.exe с https://kubernetes.io/docs/tasks/tools/install-kubectl-windows/
# Поместите в PATH
```

**Linux:**
```bash
# Ubuntu/Debian
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Или через apt
sudo apt-get update && sudo apt-get install -y kubectl
```

**macOS:**
```bash
# Через Homebrew
brew install kubectl
```

**Проверка:**
```bash
kubectl version --client
```

### 2.3. Docker (для локальной сборки образов)

**Windows:**
```powershell
# Скачайте Docker Desktop с https://www.docker.com/products/docker-desktop/
# Установите и запустите
```

**Linux:**
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
# Перелогиньтесь для применения изменений
```

**macOS:**
```bash
# Установите Docker Desktop с https://www.docker.com/products/docker-desktop/
```

---

## 3. Настройка переменных окружения

### 3.1. Основные переменные

Создайте файл `.env.deploy` на рабочей машине:

```bash
# Yandex Cloud
YC_SERVICE_ACCOUNT_KEY_FILE=/path/to/sa-key.json  # Путь к JSON ключу
YC_CLOUD_ID="<cloud-id>"                          # ID облака (опционально)
YC_FOLDER_ID="<folder-id>"                        # ID каталога (опционально)

# Kubernetes
CLUSTER_ID="cat9eenl393qj44riti4"
NAMESPACE="prod"

# Container Registry
IMAGE_REPO="cr.yandex/crpuein3jvjccnafs2vc/app"
REGISTRY_ID="crpuein3jvjccnafs2vc"

# Application Secrets (для ручного деплоя, если не используется CI)
JWT_SECRET="<your-secure-jwt-secret-min-32-chars>"
DATABASE_URL="postgresql://staging_user:staging_password@postgres:5432/domeo_staging"
```

### 3.2. Получение ID облака и каталога

**Если не знаете ID:**
```bash
# После настройки YC CLI (см. раздел 4)
yc config list

# Или через веб-консоль:
# - Cloud ID: виден в URL консоли или в настройках облака
# - Folder ID: виден в URL каталога или в настройках каталога
```

**Через CLI:**
```bash
# Список облаков
yc resource-manager cloud list

# Список каталогов
yc resource-manager folder list
```

### 3.3. Установка переменных окружения

**Windows (PowerShell):**
```powershell
# Временно (для текущей сессии)
$env:YC_SERVICE_ACCOUNT_KEY_FILE="C:\path\to\sa-key.json"
$env:YC_CLOUD_ID="<cloud-id>"
$env:YC_FOLDER_ID="<folder-id>"
$env:CLUSTER_ID="cat9eenl393qj44riti4"
$env:NAMESPACE="prod"
$env:IMAGE_REPO="cr.yandex/crpuein3jvjccnafs2vc/app"

# Постоянно (для пользователя)
[System.Environment]::SetEnvironmentVariable("YC_SERVICE_ACCOUNT_KEY_FILE", "C:\path\to\sa-key.json", "User")
[System.Environment]::SetEnvironmentVariable("YC_CLOUD_ID", "<cloud-id>", "User")
[System.Environment]::SetEnvironmentVariable("YC_FOLDER_ID", "<folder-id>", "User")
[System.Environment]::SetEnvironmentVariable("CLUSTER_ID", "cat9eenl393qj44riti4", "User")
[System.Environment]::SetEnvironmentVariable("NAMESPACE", "prod", "User")
[System.Environment]::SetEnvironmentVariable("IMAGE_REPO", "cr.yandex/crpuein3jvjccnafs2vc/app", "User")
```

**Linux/macOS:**
```bash
# Временно
export YC_SERVICE_ACCOUNT_KEY_FILE="/path/to/sa-key.json"
export YC_CLOUD_ID="<cloud-id>"
export YC_FOLDER_ID="<folder-id>"
export CLUSTER_ID="cat9eenl393qj44riti4"
export NAMESPACE="prod"
export IMAGE_REPO="cr.yandex/crpuein3jvjccnafs2vc/app"

# Постоянно (добавьте в ~/.bashrc или ~/.zshrc)
echo 'export YC_SERVICE_ACCOUNT_KEY_FILE="/path/to/sa-key.json"' >> ~/.bashrc
echo 'export YC_CLOUD_ID="<cloud-id>"' >> ~/.bashrc
echo 'export YC_FOLDER_ID="<folder-id>"' >> ~/.bashrc
echo 'export CLUSTER_ID="cat9eenl393qj44riti4"' >> ~/.bashrc
echo 'export NAMESPACE="prod"' >> ~/.bashrc
echo 'export IMAGE_REPO="cr.yandex/crpuein3jvjccnafs2vc/app"' >> ~/.bashrc

# Применить изменения
source ~/.bashrc
```

---

## 4. Настройка Yandex Cloud CLI

### 4.1. Инициализация YC CLI

```bash
# Запустите инициализацию
yc init

# Введите:
# - Token или путь к JSON ключу
# - Cloud ID
# - Folder ID
# - Default zone (например, ru-central1-b)
```

### 4.2. Настройка через JSON ключ

```bash
# Установите путь к ключу
export YC_SERVICE_ACCOUNT_KEY_FILE="/path/to/sa-key.json"

# Или через yc config
yc config set service-account-key-file /path/to/sa-key.json
yc config set cloud-id <cloud-id>
yc config set folder-id <folder-id>

# Проверка
yc config list
```

### 4.3. Проверка доступа

```bash
# Проверка токена
yc iam create-token

# Список кластеров
yc managed-kubernetes cluster list

# Список реестров
yc container registry list
```

---

## 5. Подключение к Kubernetes кластеру

### 5.1. Получение kubeconfig

```bash
# Получить credentials для кластера
yc managed-kubernetes cluster get-credentials \
  --id cat9eenl393qj44riti4 \
  --external \
  --force

# Настроить контекст
kubectl config use-context yc-domeo-prod
kubectl config set-context --current --namespace=prod

# Проверка подключения
kubectl cluster-info
kubectl get nodes
kubectl get pods -n prod
```

---

## 6. Настройка Docker для Container Registry

### 6.1. Авторизация в Container Registry

```bash
# Получить IAM токен
YC_TOKEN=$(yc iam create-token)

# Авторизоваться в Docker
echo $YC_TOKEN | docker login cr.yandex \
  --username iam \
  --password-stdin

# Проверка
docker pull cr.yandex/crpuein3jvjccnafs2vc/app:latest
```

---

## 7. Примеры команд для деплоя

### 7.1. Локальная сборка и пуш образа

**Windows (PowerShell):**
```powershell
# Переменные
$IMAGE_REPO = "cr.yandex/crpuein3jvjccnafs2vc/app"
$TAG = "v20251030202308"
$FULL_IMAGE = "${IMAGE_REPO}:${TAG}"

# Авторизация
$YC_TOKEN = yc iam create-token
echo $YC_TOKEN | docker login cr.yandex --username iam --password-stdin

# Сборка
docker build -t $FULL_IMAGE .

# Пуш
docker push $FULL_IMAGE
```

**Linux/macOS:**
```bash
# Переменные
IMAGE_REPO="cr.yandex/crpuein3jvjccnafs2vc/app"
TAG="v20251030202308"
FULL_IMAGE="${IMAGE_REPO}:${TAG}"

# Авторизация
yc iam create-token | docker login cr.yandex -u iam --password-stdin

# Сборка
docker build -t "${FULL_IMAGE}" .

# Пуш
docker push "${FULL_IMAGE}"
```

### 7.2. Деплой через kubectl

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
kubectl -n prod get svc app
```

### 7.3. Использование скриптов

```bash
# Сборка и пуш
./scripts/build_and_push.sh app v20251030202308

# Деплой
./scripts/rollout.sh v20251030202308

# Откат
./scripts/rollback.sh
```

---

## 8. Настройка GitHub Secrets (для CI/CD)

Если используете GitHub Actions, настройте секреты в репозитории:

1. Перейдите в **Settings → Secrets and variables → Actions**
2. Добавьте следующие секреты:

```
YC_SA_KEY          # Полный JSON ключ сервисного аккаунта (скопируйте весь JSON как одну строку)
YC_CLOUD_ID        # ID облака (опционально)
YC_FOLDER_ID       # ID каталога (опционально)
IMAGE_REPO         # cr.yandex/crpuein3jvjccnafs2vc/app
```

**Важно:** При добавлении `YC_SA_KEY` в GitHub Secrets:
- Скопируйте весь JSON ключ как одну строку
- Не добавляйте переводы строк, используйте `\n` если нужно
- Или используйте формат с экранированными кавычками

---

## 9. Проверка настроек

### 9.1. Чеклист перед деплоем

- [ ] YC CLI установлен и настроен
- [ ] Kubectl установлен и подключен к кластеру
- [ ] Docker установлен и авторизован в Container Registry
- [ ] JSON ключ сервисного аккаунта сохранен и доступен
- [ ] Переменные окружения установлены
- [ ] Права сервисного аккаунта проверены
- [ ] Доступ к кластеру проверен (`kubectl get nodes`)
- [ ] Доступ к Container Registry проверен (`docker pull`)

### 9.2. Тестовые команды

```bash
# 1. Проверка YC CLI
yc version
yc config list
yc iam create-token

# 2. Проверка Kubernetes
kubectl version --client
kubectl cluster-info
kubectl get nodes
kubectl get pods -n prod

# 3. Проверка Docker
docker version
docker login cr.yandex -u iam --password-stdin < <(yc iam create-token)
docker pull cr.yandex/crpuein3jvjccnafs2vc/app:latest

# 4. Проверка Container Registry
yc container registry list
```

---

## 10. Безопасность

### 10.1. Защита JSON ключа

- **Никогда не коммитьте** JSON ключ в Git
- Храните ключ в безопасном месте с ограниченным доступом
- Используйте переменные окружения вместо файлов в скриптах
- Регулярно ротируйте ключи (создавайте новые, удаляйте старые)

### 10.2. Ограничение прав

- Используйте минимально необходимые роли
- Регулярно проверяйте активные ключи сервисного аккаунта
- Удаляйте неиспользуемые ключи

---

## 11. Устранение неполадок

### 11.1. Ошибка авторизации в YC

```bash
# Проверьте путь к ключу
echo $YC_SERVICE_ACCOUNT_KEY_FILE
yc config list

# Проверьте содержимое ключа (безопасно)
cat $YC_SERVICE_ACCOUNT_KEY_FILE | jq -r '.service_account_id'

# Пересоздайте ключ если нужно
yc iam key create --service-account-id <sa-id> --output new-key.json
```

### 11.2. Ошибка подключения к Kubernetes

```bash
# Проверьте credentials
kubectl config get-contexts
kubectl config current-context

# Обновите credentials
yc managed-kubernetes cluster get-credentials \
  --id cat9eenl393qj44riti4 \
  --external \
  --force
```

### 11.3. Ошибка доступа к Container Registry

```bash
# Переавторизуйтесь
yc iam create-token | docker login cr.yandex -u iam --password-stdin

# Проверьте права сервисного аккаунта
yc container registry list
```

---

## 12. Быстрый старт (шаблон)

```bash
# 1. Установите инструменты (см. раздел 2)

# 2. Сохраните JSON ключ сервисного аккаунта
# Например: ~/.yc/sa-key.json

# 3. Настройте переменные окружения
export YC_SERVICE_ACCOUNT_KEY_FILE="~/.yc/sa-key.json"
export YC_CLOUD_ID="<your-cloud-id>"
export YC_FOLDER_ID="<your-folder-id>"
export CLUSTER_ID="cat9eenl393qj44riti4"
export NAMESPACE="prod"
export IMAGE_REPO="cr.yandex/crpuein3jvjccnafs2vc/app"

# 4. Настройте YC CLI
yc config set service-account-key-file $YC_SERVICE_ACCOUNT_KEY_FILE
yc config set cloud-id $YC_CLOUD_ID
yc config set folder-id $YC_FOLDER_ID

# 5. Подключитесь к кластеру
yc managed-kubernetes cluster get-credentials \
  --id $CLUSTER_ID \
  --external \
  --force

kubectl config use-context yc-domeo-prod
kubectl config set-context --current --namespace=$NAMESPACE

# 6. Авторизуйтесь в Docker
yc iam create-token | docker login cr.yandex -u iam --password-stdin

# 7. Проверка
kubectl get nodes
kubectl get pods -n prod
docker pull $IMAGE_REPO:latest
```

---

**Готово!** Теперь вы можете деплоить приложение на рабочую машину.









