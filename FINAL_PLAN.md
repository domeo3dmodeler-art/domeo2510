# 🎯 ФИНАЛЬНЫЙ ПЛАН: Локальная разработка + Деплой на ВМ

## ✅ ЧТО УЖЕ РАБОТАЕТ:

1. ✅ **Prisma Client**: Engines скопированы с ВМ, работают локально
2. ✅ **Приложение**: Запускается локально (`npm run dev`)
3. ✅ **ВМ**: Работает, схема БД применена

## ❌ ТЕКУЩАЯ ПРОБЛЕМА:

**Ошибка**: `The table 'public.users' does not exist in the current database.`

**Причина**: Локальная БД (на порту 5434) пустая, нужна схема

---

## 🚀 RECOMMENDED РАБОЧИЙ ПРОЦЕСС:

### Вариант 1: ПРАВИТЬ БЕЗ ЛОКАЛЬНОЙ БД (РЕКОМЕНДУЮ)

**Когда:**
- Разработка API роутов
- Изменение UI
- Добавление новых страниц

**Как:**

```bash
# 1. Правим код локально
code app/api/auth/route.ts

# 2. Тестируем build (проверка компиляции)
npm run build

# 3. Коммитим и пушим
git add .
git commit -m "Fix: auth logic"
git push origin develop

# 4. Обновляем ВМ (где уже есть БД)
ssh ubuntu@130.193.40.35 "cd /opt/domeo && git pull && docker compose -f docker-compose.staging.yml up -d --build"

# 5. Тестируем на ВМ
# http://130.193.40.35:3001/api/auth/login
```

**Плюсы:**
- ✅ Быстро
- ✅ Не нужно настраивать БД локально
- ✅ Тестируем на реальном окружении

---

### Вариант 2: ПРАВИТЬ С ЛОКАЛЬНОЙ БД

**Когда:**
- Разработка сложной логики с БД
- Нужен быстрый feedback
- Отладка миграций

**Как:**

```bash
# ШАГ 1: Применить схему к локальной БД (ОДИН РАЗ)

# Вариант А: Скопировать схему с ВМ
ssh ubuntu@130.193.40.35 "docker exec domeo-staging-postgres pg_dump -U staging_user -d domeo_staging --schema-only" > schema.sql
docker exec -i domeo-local-postgres psql -U dev_user -d domeo_dev < schema.sql

# Вариант Б: Использовать существующую БД (Adminer)
# Открыть http://localhost:8082
# Подключиться к localhost:5435 (там уже есть схема)

# ШАГ 2: Разрабатывать
npm run dev

# ШАГ 3: Перед деплоем
git push origin develop
```

**Плюсы:**
- ✅ Полная локальная разработка
- ✅ Быстрая отладка

---

### Вариант 3: ГИБРИДНЫЙ (ОПТИМАЛЬНЫЙ)

**Для разных задач:**

#### 🔹 Простые изменения (UI, API)
```bash
# 1. Правим локально
code app/login/page.tsx

# 2. Проверяем сборку
npm run build

# 3. Пушим и деплоим
git push origin develop
# На ВМ автоматически обновится
```

#### 🔹 Сложные изменения (БД, миграции)
```bash
# 1. Работаем через Adminer (локальная БД)
http://localhost:8082 (localhost:5435 уже имеет схему)

# 2. Правим schema.prisma
code prisma/schema.prisma

# 3. Создаем миграцию
# (через Docker или на ВМ)
ssh ubuntu@130.193.40.35 "cd /opt/domeo && npx prisma migrate dev --name add_field"

# 4. Переносим миграцию локально
scp ubuntu@130.193.40.35:/opt/domeo/prisma/migrations/* ./prisma/migrations/

# 5. Пушим
git push origin develop
```

---

## 📋 ПРАКТИЧЕСКИЙ СТЕП-BY-STEP:

### Для сегодня:

```bash
# 1. Остановить все процессы
Get-Process node | Stop-Process

# 2. Использовать БД на порту 5435 (там уже есть схема)
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5435/postgres"

# 3. Запустить приложение
npm run dev

# 4. Тестировать
# http://localhost:3000/login
```

### Для дальнейшей работы:

1. **Править код локально**
2. **Пушить в Git** → `git push origin develop`
3. **Обновить ВМ** → `ssh ubuntu@130.193.40.35 "cd /opt/domeo && git pull && docker compose -f docker-compose.staging.yml up -d --build"`
4. **Тестировать на ВМ** → `http://130.193.40.35:3001`

---

## 🎯 МОЯ РЕКОМЕНДАЦИЯ:

**Используйте Вариант 1** для 80% задач:
- Быстро
- Работает
- Не требует настройки БД локально

**Используйте Вариант 3** для сложных задач с БД:
- Для миграций
- Для сложной логики с БД

---

## ✅ ГОТОВО К ИСПОЛЬЗОВАНИЮ:

```bash
# Запустить (с существующей БД на 5435)
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5435/postgres"; npm run dev

# Разрабатывать
# Править файлы локально
# Тестировать на localhost:3000

# Деплоить
git push origin develop
ssh ubuntu@130.193.40.35 "cd /opt/domeo && git pull && docker compose -f docker-compose.staging.yml up -d --build"
```

**Начинаем разработку?**

