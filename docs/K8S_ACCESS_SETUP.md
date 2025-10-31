# 🔑 Настройка доступа к Kubernetes Production

Это руководство описывает, где найти данные для доступа к Kubernetes кластеру и Container Registry Yandex Cloud.

## 📋 Что нужно для доступа

1. **JSON ключ сервисного аккаунта** (`YC_SA_KEY` или `YC_SA_JSON`)
   - Нужен для авторизации в Yandex Cloud
   - Требуемые права:
     - Container Registry (чтение/запись образов)
     - Kubernetes кластер (доступ к namespace `prod`)

2. **ID кластера** (`CLUSTER_ID`)
   - По умолчанию: `cat9eenl393qj44riti4`

3. **ID реестра** (`REGISTRY_ID`)
   - По умолчанию: `crpuein3jvjccnafs2vc`
   - Полный путь: `cr.yandex/crpuein3jvjccnafs2vc/app`

## 🔍 Где найти данные

### 1. GitHub Secrets (если используется CI/CD)

Если у вас есть доступ к репозиторию GitHub:
1. Перейдите в `Settings` → `Secrets and variables` → `Actions`
2. Найдите секреты:
   - `YC_SA_KEY` - JSON ключ сервисного аккаунта
   - `YC_CLOUD_ID` - ID облака (опционально)
   - `YC_FOLDER_ID` - ID каталога (опционально)
   - `IMAGE_REPO` - Путь к реестру (опционально)

**⚠️ Важно**: Не копируйте секреты напрямую в документацию! Используйте переменные окружения.

### 2. Yandex Cloud Console

Если нужно создать новый ключ:

1. Зайдите в [Yandex Cloud Console](https://console.cloud.yandex.ru/)
2. Перейдите в раздел **IAM** → **Сервисные аккаунты**
3. Найдите сервисный аккаунт с именем, связанным с проектом (например, `domeo-k8s-sa`)
4. Если сервисного аккаунта нет, создайте новый:
   - **Создать** → **Сервисный аккаунт**
   - Имя: `domeo-k8s-access`
   - Назначьте роли:
     - `container-registry.images.pusher`
     - `k8s.clusters.agent`
     - `k8s.editor`
5. Создайте JSON ключ:
   - Перейдите в созданный сервисный аккаунт
   - Вкладка **Ключи** → **Создать новый ключ** → **JSON**
   - Сохраните файл в безопасное место

### 3. Kubernetes кластер

Информация о кластере:

- **ID кластера**: `cat9eenl393qj44riti4`
- **Namespace**: `prod`
- **Внешний IP**: `158.160.202.117`
- **Контекст**: `yc-domeo-prod` или `yc-default`

### 4. Container Registry

Информация о реестре:

- **ID реестра**: `crpuein3jvjccnafs2vc`
- **Полный путь образа**: `cr.yandex/crpuein3jvjccnafs2vc/app`
- **Текущий тег**: `v20251030202308`

## 📝 Настройка локального доступа

### Вариант 1: Через файл с ключом

```bash
# Сохраните JSON ключ в файл (НЕ коммитьте в репозиторий!)
export YC_SERVICE_ACCOUNT_KEY_FILE="/path/to/sa.json"

# Или в домашней директории (скрытый файл)
export YC_SERVICE_ACCOUNT_KEY_FILE="$HOME/.yc/sa-key.json"
```

### Вариант 2: Через переменную окружения

```bash
# Установите переменную с содержимым JSON (НЕ коммитьте!)
export YC_SA_KEY='{"service_account_id":"...","id":"...","private_key":"..."}'

# Или
export YC_SA_JSON='{"service_account_id":"...","id":"...","private_key":"..."}'
```

### Вариант 3: Через `.env` файл (не коммитится)

Создайте файл `.env.local` (уже в `.gitignore`):

```bash
# .env.local (НЕ коммитьте!)
YC_SERVICE_ACCOUNT_KEY_FILE=/path/to/sa.json
YC_CLOUD_ID=your-cloud-id
YC_FOLDER_ID=your-folder-id
```

Затем загрузите переменные:

```bash
# Linux/Mac
source .env.local

# Windows PowerShell
Get-Content .env.local | ForEach-Object { if ($_ -match '^([^=]+)=(.*)$') { [Environment]::SetEnvironmentVariable($matches[1], $matches[2]) } }
```

## 🔐 Безопасность

⚠️ **ВАЖНО**: 

1. **НЕ коммитьте ключи в репозиторий**
2. **НЕ делитесь ключами публично**
3. **Используйте `.gitignore`** для файлов с ключами:
   ```
   .env.local
   *.key.json
   sa-key.json
   ~/.yc/sa-key.json
   ```
4. **Ограничьте права доступа** к файлам с ключами:
   ```bash
   chmod 600 /path/to/sa.json
   ```

## ✅ Проверка доступа

После настройки проверьте доступ:

```bash
# 1. Проверка авторизации в YC
export YC_SERVICE_ACCOUNT_KEY_FILE="/path/to/sa.json"
yc iam create-token

# 2. Проверка доступа к Container Registry
yc iam create-token | docker login cr.yandex -u iam --password-stdin
docker pull cr.yandex/crpuein3jvjccnafs2vc/app:v20251030202308

# 3. Проверка доступа к кластеру
yc managed-kubernetes cluster get-credentials --id cat9eenl393qj44riti4 --external --force
kubectl config use-context yc-domeo-prod
kubectl config set-context --current --namespace=prod
kubectl -n prod get nodes
```

## 🆘 Если нет доступа

Если у вас нет данных для доступа:

1. **Обратитесь к администратору проекта** для получения:
   - JSON ключа сервисного аккаунта
   - Или создания нового ключа с необходимыми правами

2. **Проверьте права доступа**:
   - Доступ к Yandex Cloud Console
   - Доступ к IAM и сервисным аккаунтам
   - Доступ к Kubernetes кластеру

3. **Проверьте GitHub Secrets** (если используется CI/CD):
   - Убедитесь, что секреты настроены
   - Проверьте, что у вас есть доступ к репозиторию

## 📞 Контакты

Если нужна помощь с настройкой доступа, обратитесь к администратору инфраструктуры проекта.

---

**Последнее обновление**: 2025-10-31

