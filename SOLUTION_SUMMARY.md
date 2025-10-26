# ✅ РЕШЕНИЕ: Где править код

## 📊 Что мы сделали:

1. ✅ **Проблема**: Контейнер был `unhealthy` на ВМ
2. ✅ **Причина**: В Dockerfile не было `curl` для health check
3. ✅ **Решение**: Добавили `curl` в Dockerfile.staging **локально**
4. ✅ **Деплой**: Запушили в Git → автоматически обновили ВМ
5. ✅ **Результат**: Контейнер теперь `healthy` ✅

---

## 🎯 ОТВЕТ НА ВАШ ВОПРОС:

### **Где править?**

# ✅ **ПРАВИТЬ ЛОКАЛЬНО**

### Workflow:

```bash
# 1. Правим код локально
# Например: Dockerfile.staging, app/api/auth/route.ts, etc.

# 2. Коммитим
git add .
git commit -m "Fix: описание проблемы"
git push origin develop

# 3. На ВМ автоматически деплоится
# (через GitHub Actions или вручную)
```

---

## 📝 Конкретный пример (который мы только что сделали):

### Шаг 1: Правим локально

```dockerfile
# Dockerfile.staging (строка 34)
RUN apk add --no-cache openssl libc6-compat curl  # ← добавили curl
```

### Шаг 2: Коммитим и пушим

```bash
git add Dockerfile.staging
git commit -m "Fix: Add curl to Docker image for health check"
git push origin develop
```

### Шаг 3: Обновляем ВМ

```bash
ssh ubuntu@130.193.40.35 "cd /opt/domeo && git pull && docker compose -f docker-compose.staging.yml up -d --build"
```

### Шаг 4: Проверяем результат

```bash
# Статус: healthy ✅
docker compose -f docker-compose.staging.yml ps
```

---

## 🚀 УНИВЕРСАЛЬНОЕ ПРАВИЛО:

### ✅ Правим локально, деплоим через Git

**Почему?**

1. ✅ **Локально** - у вас IDE, отладка, hot reload
2. ✅ **Git** - версионирование, история изменений
3. ✅ **ВМ** - production-like окружение для тестов

### ❌ НЕ правим напрямую на ВМ

**Почему?**

1. ❌ Нет IDE и удобных инструментов
2. ❌ Изменения могут потеряться
3. ❌ Труднее отлаживать

---

## 📋 КОГДА ЧТО ПРАВИТЬ:

| Где | Что править | Пример |
|-----|-------------|--------|
| 🔧 **Локально** | Код приложения | `app/api/auth/route.ts` |
| 🔧 **Локально** | Dockerfile | `Dockerfile.staging` |
| 🔧 **Локально** | Package.json | `dependencies` |
| ⚙️ **На ВМ** | Конфигурация | `.env` файл |
| ⚙️ **На ВМ** | Миграции БД | `npx prisma migrate deploy` |

---

## 🎯 ТЕКУЩЕЕ СОСТОЯНИЕ:

- ✅ **ВМ**: Контейнер healthy
- ✅ **Git**: Код в develop
- ✅ **Деплой**: Автоматический
- ⏳ **Локально**: Нужно настроить окружение для разработки

---

## 🚀 ЧТО ДАЛЬШЕ?

### Вариант 1: Разработка без локального запуска

```bash
# 1. Правим код локально
code app/api/auth/route.ts

# 2. Тестируем только build
npm run build

# 3. Пушим на staging
git push origin develop

# 4. Тестируем на ВМ
curl https://your-domain/api/auth
```

### Вариант 2: Разработка с локальной БД (рекомендую)

```bash
# 1. Запускаем Docker Compose локально
docker compose -f docker-compose.local.yml up -d

# 2. Настраиваем локальное приложение
npx prisma generate
npx prisma db push

# 3. Разрабатываем
npm run dev

# 4. Тестируем локально
http://localhost:3000

# 5. Пушим на staging
git push origin develop
```

---

## ✨ РЕЗЮМЕ:

1. ✅ **Правим ЛОКАЛЬНО** - там у вас все инструменты
2. ✅ **Пушим в Git** - для версионирования
3. ✅ **Деплоим на ВМ** - для тестирования в production-like окружении
4. ✅ **Проблемы правим по тому же принципу**

**Вопросы?** 😊

