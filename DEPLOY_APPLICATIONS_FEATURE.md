# Инструкция по деплою функционала управления заявками

## Описание изменений

Реализован функционал управления заявками (Applications) для личного кабинета исполнителя согласно ТЗ `docs/TASK_EXECUTOR_DASHBOARD_APPLICATIONS.md`.

### Что добавлено:

1. **База данных:**
   - Модель `Application` в Prisma схему
   - Связи с `Client` и `Invoice`

2. **API Endpoints:**
   - `POST /api/applications` - создание заявки
   - `GET /api/applications` - список заявок
   - `GET /api/applications/[id]` - получение заявки
   - `PUT /api/applications/[id]` - обновление заявки
   - `PUT /api/applications/[id]/status` - изменение статуса
   - `POST /api/applications/[id]/project` - загрузка проекта
   - `POST /api/applications/[id]/files` - загрузка файлов
   - `PUT /api/applications/[id]/door-dimensions` - данные дверей
   - `POST /api/applications/[id]/verify` - проверка данных

3. **UI Компоненты:**
   - `components/executor/ApplicationsBoard.tsx` - табло заявок
   - Интеграция в `app/executor/dashboard/page.tsx`

4. **Автоматизация:**
   - Автоматическое создание заявки при оплате счета (`status = PAID`)

## Шаги деплоя на ВМ

### 1. Подключение к ВМ и переход в директорию проекта

```bash
ssh -i "C:\Users\petr2\.ssh\ssh-key-1757583003347\ssh-key-1757583003347" ubuntu@130.193.40.35
cd /path/to/project
```

### 2. Получение изменений из git

```bash
git pull origin main  # или develop, если используете develop ветку
```

### 3. Применение миграции базы данных

```bash
# Генерация Prisma клиента
npx prisma generate

# Применение миграции (создание таблицы applications)
npx prisma migrate deploy

# ИЛИ если миграции отключены в CI/CD, использовать:
npx prisma db push
```

### 4. Пересборка Docker образа

```bash
# Пересборка образа приложения
docker compose -f docker-compose.production.yml build app

# ИЛИ если используется отдельный Dockerfile:
docker build -f Dockerfile.production -t your-registry/app:latest .
```

### 5. Перезапуск контейнеров

```bash
# Перезапуск сервиса app
docker compose -f docker-compose.production.yml up -d app

# ИЛИ полный перезапуск всех сервисов:
docker compose -f docker-compose.production.yml up -d
```

### 6. Проверка работоспособности

```bash
# Проверка здоровья приложения
curl -f http://localhost:3001/api/health

# Проверка логов
docker compose -f docker-compose.production.yml logs app --tail=50
```

## Проверка функционала

После деплоя проверьте:

1. Откройте `/executor/dashboard` в браузере
2. Убедитесь, что правая панель показывает "Табло заявок"
3. Проверьте работу создания заявки при оплате счета
4. Проверьте загрузку файлов проекта и других файлов

## Откат изменений (если необходимо)

```bash
# Откат git изменений
git reset --hard HEAD~1

# Пересборка и перезапуск
docker compose -f docker-compose.production.yml build app
docker compose -f docker-compose.production.yml up -d app
```

## Примечания

- Миграция БД должна быть выполнена перед перезапуском контейнеров
- Убедитесь, что переменные окружения корректно настроены
- Проверьте права доступа к директории `uploads/applications/` для загрузки файлов

