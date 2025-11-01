# 🧪 E2E тесты с использованием Staging БД

Это руководство описывает, как настроить и запустить E2E тесты, используя базу данных с тестовой ВМ (staging).

## 📋 Предварительные требования

1. **Доступ к staging ВМ**: `130.193.40.35` (SSH)
2. **SSH ключ**: `C:\Users\petr2\.ssh\ssh-key-1757583003347\ssh-key-1757583003347`
3. **Учетные данные БД staging**:
   - Хост: ВМ `130.193.40.35` (внутри ВМ: `localhost:5432`)
   - Пользователь: `staging_user`
   - Пароль: `staging_password`
   - База данных: `domeo_staging`

## 🔧 Варианты подключения

### Вариант 1: SSH туннель (Рекомендуется) ⭐

**Преимущества:**
- ✅ Безопасно (зашифрованное подключение)
- ✅ Не требует открытия портов на ВМ
- ✅ Просто в настройке

**Шаги:**

1. **Создать SSH туннель** в отдельном терминале:
   ```powershell
   ssh -L 5432:localhost:5432 -i "C:\Users\petr2\.ssh\ssh-key-1757583003347\ssh-key-1757583003347" ubuntu@130.193.40.35
   ```

   > 💡 Оставьте этот терминал открытым - туннель работает пока терминал открыт

2. **Настроить DATABASE_URL** в `.env.local`:
   ```env
   DATABASE_URL="postgresql://staging_user:staging_password@localhost:5432/domeo_staging"
   ```

3. **Проверить подключение**:
   ```powershell
   npm run prisma:generate
   npm run prisma:migrate:deploy
   ```

4. **Запустить тесты**:
   ```powershell
   npm run test:e2e
   ```

---

### Вариант 2: Прямое подключение (если порт открыт)

Если PostgreSQL порт (5432) доступен извне на staging ВМ:

1. **Настроить DATABASE_URL** в `.env.local`:
   ```env
   DATABASE_URL="postgresql://staging_user:staging_password@130.193.40.35:5432/domeo_staging"
   ```

2. **Проверить подключение**:
   ```powershell
   npm run prisma:generate
   npm run prisma:migrate:deploy
   ```

3. **Запустить тесты**:
   ```powershell
   npm run test:e2e
   ```

---

## 🚀 Быстрая настройка

Используйте готовый скрипт:

```powershell
npm run test:e2e:staging
```

Скрипт проверит доступность staging сервера и создаст `.env.test` файл.

---

## ✅ Проверка подключения

### Проверка 1: Health check staging сервера

```powershell
curl http://130.193.40.35:3001/api/health
```

Ожидаемый результат:
```json
{
  "status": "healthy",
  "timestamp": "...",
  "checks": {
    "database": {
      "status": "ok",
      "responseTime": 123
    }
  }
}
```

### Проверка 2: Прямое подключение к БД

Если SSH туннель настроен:

```powershell
# Используя psql (если установлен)
psql "postgresql://staging_user:staging_password@localhost:5432/domeo_staging" -c "SELECT version();"
```

Или через Prisma Studio:

```powershell
npm run prisma:studio
```

---

## 📝 Создание тестовых пользователей

Перед запуском тестов убедитесь, что в staging БД есть тестовые пользователи:

```sql
-- Подключение к staging БД (через SSH туннель или напрямую)
-- Или через Prisma Studio
```

Нужные пользователи:
- `complectator@example.com` / `password` (роль: `complectator`)
- `executor@example.com` / `password` (роль: `executor`)
- `admin@example.com` / `password` (роль: `admin`)

**Создание через API** (если API доступен):
```powershell
# После входа в систему через admin можно создать тестовых пользователей
```

---

## 🔍 Отладка проблем

### Проблема: "Can't reach database server"

**Решение:**
1. Проверьте, что SSH туннель запущен (Вариант 1)
2. Проверьте доступность порта 5432 на staging ВМ
3. Убедитесь, что `.env.local` содержит правильный `DATABASE_URL`

### Проблема: "Authentication failed"

**Решение:**
1. Проверьте учетные данные: `staging_user` / `staging_password`
2. Убедитесь, что используете правильную БД: `domeo_staging`

### Проблема: "Connection timeout"

**Решение:**
1. Проверьте сетевое подключение к staging ВМ
2. Проверьте firewall правила на staging ВМ
3. Убедитесь, что PostgreSQL слушает на правильном порту

---

## 🎯 Автоматизация

Для автоматического запуска тестов с staging БД создайте скрипт:

```powershell
# scripts/run-e2e-with-staging.ps1

# 1. Проверка SSH туннеля (или его создание)
# 2. Настройка DATABASE_URL
# 3. Запуск тестов
# 4. Очистка
```

---

## 📊 Результаты тестов

После успешной настройки БД все 10 тестов должны пройти:

- ✅ Health check (2 теста)
- ✅ Аутентификация (4 теста)
- ✅ Работа с документами (4 теста)

---

## 💡 Рекомендации

1. **Используйте SSH туннель** - это самый безопасный способ
2. **Не коммитьте `.env.local`** - файл содержит чувствительные данные
3. **Используйте отдельную БД для тестов** - если возможно, создайте `domeo_test` БД
4. **Регулярно синхронизируйте данные** - staging БД должна содержать актуальные тестовые данные

