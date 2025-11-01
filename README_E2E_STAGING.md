# 🧪 E2E тесты с staging БД - Краткая инструкция

## 🎯 Цель

Запустить E2E тесты Playwright, используя базу данных с тестовой ВМ (staging).

## ⚡ Быстрый старт

### 1. Запустить SSH туннель (в отдельном терминале)

```powershell
npm run test:e2e:tunnel
```

### 2. Настроить и запустить тесты

```powershell
npm run test:e2e:staging-full
```

---

## 📝 Детальная инструкция

См. [docs/E2E_TESTS_STAGING_DB.md](docs/E2E_TESTS_STAGING_DB.md) для полной документации.

## 🔍 Полезные команды

```powershell
# Проверка доступности staging сервера
npm run health:staging

# Настройка подключения к staging БД
npm run test:e2e:staging

# Создание SSH туннеля
npm run test:e2e:tunnel

# Полная автоматическая настройка и запуск
npm run test:e2e:staging-full

# Обычный запуск тестов (после настройки)
npm run test:e2e
```

---

## ⚙️ Конфигурация

- **Staging сервер**: `http://130.193.40.35:3001`
- **SSH ключ**: `C:\Users\petr2\.ssh\ssh-key-1757583003347\ssh-key-1757583003347`
- **БД пользователь**: `staging_user`
- **БД пароль**: `staging_password`
- **БД имя**: `domeo_staging`

