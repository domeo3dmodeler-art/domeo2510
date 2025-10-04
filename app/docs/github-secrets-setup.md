# 🔐 Настройка GitHub Secrets для Yandex Cloud

## 📋 Необходимые секреты

Для автоматического развертывания через GitHub Actions нужно настроить следующие секреты в репозитории:

### 1. **YC_SA_KEY** (Service Account Key)
```bash
# Создание Service Account
yc iam service-account create --name domeo-deploy-sa

# Создание ключа
yc iam key create --service-account-name domeo-deploy-sa --output key.json

# Содержимое key.json нужно добавить в GitHub Secrets
```

### 2. **YC_REGISTRY_ID** (Container Registry ID)
```bash
# Получение ID реестра
yc container registry list --format json | jq -r '.[0].id'
```

### 3. **DATABASE_URL** (PostgreSQL Connection String)
```bash
# Формат: postgresql://username:password@host:port/database
# Пример: postgresql://domeo_user:password@c-c9q...:6432/domeo_doors
```

### 4. **JWT_SECRET** (JWT Secret Key)
```bash
# Генерация случайного ключа
openssl rand -base64 32
```

### 5. **NEXT_PUBLIC_APP_URL** (Public URL)
```bash
# URL вашего приложения
# Пример: https://your-domain.com
```

## 🔧 Настройка секретов в GitHub

### Через веб-интерфейс:
1. Перейдите в Settings → Secrets and variables → Actions
2. Нажмите "New repository secret"
3. Добавьте каждый секрет с соответствующим именем

### Через GitHub CLI:
```bash
# Установка GitHub CLI
gh auth login

# Добавление секретов
gh secret set YC_SA_KEY < key.json
gh secret set YC_REGISTRY_ID "your-registry-id"
gh secret set DATABASE_URL "postgresql://user:pass@host:port/db"
gh secret set JWT_SECRET "your-jwt-secret"
gh secret set NEXT_PUBLIC_APP_URL "https://your-domain.com"
```

## 🚀 Права доступа Service Account

Service Account должен иметь следующие роли:

```bash
# Роли для развертывания
yc resource-manager folder add-access-binding <folder-id> \
  --role container-registry.images.puller \
  --subject serviceAccount:<service-account-id>

yc resource-manager folder add-access-binding <folder-id> \
  --role compute.editor \
  --subject serviceAccount:<service-account-id>

yc resource-manager folder add-access-binding <folder-id> \
  --role managed-postgresql.editor \
  --subject serviceAccount:<service-account-id>
```

## 📊 Проверка настройки

### 1. Проверка секретов:
```bash
# В GitHub Actions можно проверить наличие секретов
echo "Checking secrets..."
if [ -n "$YC_SA_KEY" ]; then
  echo "✅ YC_SA_KEY is set"
else
  echo "❌ YC_SA_KEY is missing"
fi
```

### 2. Тестовый запуск:
```bash
# Запуск workflow вручную
gh workflow run "Quick Deploy to Yandex Cloud"
```

## 🔒 Безопасность

### Рекомендации:
1. **Регулярно ротируйте ключи** - обновляйте Service Account ключи
2. **Минимальные права** - давайте только необходимые роли
3. **Мониторинг** - отслеживайте использование ключей
4. **Логирование** - включите аудит в Yandex Cloud

### Проверка безопасности:
```bash
# Проверка активных ключей
yc iam key list --service-account-name domeo-deploy-sa

# Проверка прав доступа
yc resource-manager folder list-access-bindings <folder-id>
```

## 🎯 Готовые команды

### Полная настройка:
```bash
# 1. Создание Service Account
yc iam service-account create --name domeo-deploy-sa

# 2. Создание ключа
yc iam key create --service-account-name domeo-deploy-sa --output key.json

# 3. Назначение ролей
yc resource-manager folder add-access-binding <folder-id> \
  --role container-registry.images.puller \
  --subject serviceAccount:$(yc iam service-account get domeo-deploy-sa --format json | jq -r '.id')

yc resource-manager folder add-access-binding <folder-id> \
  --role compute.editor \
  --subject serviceAccount:$(yc iam service-account get domeo-deploy-sa --format json | jq -r '.id')

# 4. Получение Registry ID
yc container registry list --format json | jq -r '.[0].id'

# 5. Добавление секретов в GitHub
gh secret set YC_SA_KEY < key.json
gh secret set YC_REGISTRY_ID "$(yc container registry list --format json | jq -r '.[0].id')"
```

---

## ✅ Готово!

После настройки всех секретов:
1. **Push в main ветку** - автоматически запустится развертывание
2. **Manual trigger** - можно запустить вручную через GitHub Actions
3. **Мониторинг** - отслеживайте логи развертывания

**🎉 Теперь каждое изменение в коде будет автоматически развертываться на Yandex Cloud!**
