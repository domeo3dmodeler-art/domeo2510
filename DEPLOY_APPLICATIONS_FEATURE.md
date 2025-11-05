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

### Вариант 1: Использование готового скрипта деплоя

```powershell
# Запуск скрипта автоматического деплоя (включает git pull, сборку и перезапуск)
.\scripts\deploy-fixes-to-staging.ps1
```

⚠️ **ВАЖНО**: После выполнения скрипта деплоя необходимо **вручную** применить миграцию БД (см. шаг 3 ниже).

### Вариант 2: Ручной деплой

#### 1. Подключение к ВМ и переход в директорию проекта

```bash
ssh -i "C:\Users\petr2\.ssh\ssh-key-1757583003347\ssh-key-1757583003347" ubuntu@130.193.40.35
cd /opt/domeo
```

#### 2. Получение изменений из git

```bash
git pull origin main  # или develop, если используете develop ветку
```

#### 3. Применение миграции базы данных ⚠️ ОБЯЗАТЕЛЬНО!

```bash
# Заходим в контейнер приложения
docker compose exec app bash

# Внутри контейнера выполняем:
npx prisma generate
npx prisma migrate deploy

# ИЛИ если миграции отключены, используем:
npx prisma db push

# Выходим из контейнера
exit
```

**Альтернативный способ (без захода в контейнер):**
```bash
docker compose exec app npx prisma generate
docker compose exec app npx prisma migrate deploy
# ИЛИ
docker compose exec app npx prisma db push
```

#### 4. Пересборка Docker образа (если изменения в коде)

```bash
# Пересборка образа приложения
docker compose build --no-cache app

# Перезапуск сервиса
docker compose up -d app
```

#### 5. Проверка работоспособности

```bash
# Проверка здоровья приложения
curl -f http://localhost:3001/api/health

# Проверка логов
docker compose logs app --tail=50

# Проверка статуса контейнеров
docker compose ps
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

⚠️ **КРИТИЧЕСКИ ВАЖНО**: 
- **Миграция БД ОБЯЗАТЕЛЬНА** перед использованием функционала - без неё приложение может падать с ошибками
- Миграция БД должна быть выполнена **после** получения изменений из git, но **перед** использованием функционала
- Убедитесь, что переменные окружения корректно настроены
- Проверьте права доступа к директории `uploads/applications/` для загрузки файлов

## Последовательность действий для деплоя

1. ✅ Изменения закоммичены в git и отправлены (`git push`)
2. ✅ Подключение к ВМ и получение изменений (`git pull`)
3. ⚠️ **Применение миграции БД** (`npx prisma migrate deploy` или `npx prisma db push`)
4. ✅ Пересборка образа (если нужно)
5. ✅ Перезапуск контейнеров
6. ✅ Проверка работоспособности

## Проверка после деплоя

После деплоя убедитесь, что:

1. Таблица `applications` создана в БД:
   ```bash
   docker compose exec postgres psql -U staging_user -d domeo_staging -c "\d applications"
   ```

2. Приложение запущено без ошибок:
   ```bash
   docker compose logs app --tail=100 | grep -i error
   ```

3. Health check проходит:
   ```bash
   curl -f http://localhost:3001/api/health
   ```

4. Страница `/executor/dashboard` открывается и показывает табло заявок

