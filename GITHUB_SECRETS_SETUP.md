# GitHub Secrets Setup для domeo2510

## Необходимые Secrets для Staging деплоя:

### 1. STAGING_HOST
- **Значение**: `130.193.40.35`
- **Описание**: IP адрес staging сервера

### 2. STAGING_SSH_KEY
- **Значение**: Приватный SSH ключ для доступа к серверу
- **Описание**: SSH ключ для подключения к ubuntu@130.193.40.35

## Как настроить:

1. Перейдите в Settings репозитория: https://github.com/domeo3dmodeler-art/domeo2510/settings/secrets/actions
2. Нажмите "New repository secret"
3. Добавьте каждый secret с указанными именами и значениями

## Проверка настройки:

После добавления secrets, GitHub Actions должен успешно:
- Подключиться к серверу по SSH
- Обновить код в `/opt/domeo`
- Перезапустить приложение через pm2

## Текущие проблемы:

- ❌ Prisma Client не генерируется локально (проблема с сетью)
- ✅ GitHub Actions настроены с правильными secrets
- ✅ Путь на сервере исправлен: `/opt/domeo`
- ✅ Деплой должен работать после настройки secrets
