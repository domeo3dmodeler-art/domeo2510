# Глубокий анализ проблем deployment

## Текущее состояние (коммит 6058ccc)

### Проблема #1: PostgreSQL версия несовместима
**Симптомы:**
- Контейнер `postgres:16-alpine` пытается запустить БД, созданную для версии 15
- Ошибка: `database files are incompatible with server`
- Контейнер постоянно перезапускается

**Причина:**
- В `docker-compose.production.yml` указана версия 16: `image: postgres:16-alpine`
- Volume `postgres_data` содержит данные, инициализированные PostgreSQL 15
- PostgreSQL 16 не может читать данные формата версии 15 без миграции

**Решение:**
- Изменить на `postgres:15-alpine` в docker-compose.production.yml

---

### Проблема #2: Redis падает из-за пустого пароля
**Симптомы:**
- Redis контейнер перезапускается с ошибкой: `wrong number of arguments` для `requirepass`
- Ошибка: `*** FATAL CONFIG FILE ERROR (Redis 7.4.6) ***`

**Причина:**
- В docker-compose: `command: redis-server --requirepass ${REDIS_PASSWORD}`
- Переменная `REDIS_PASSWORD` пустая (не загружается из .env)
- Redis получает команду: `redis-server --requirepass` (без значения)
- Redis требует значение для --requirepass

**Решение:**
- Либо установить пароль в .env
- Либо изменить команду на условную: запускать без --requirepass если пароль пустой

---

### Проблема #3: Переменные окружения не загружаются
**Симптомы:**
- Все переменные пустые: `The "POSTGRES_DB" variable is not set. Defaulting to a blank string.`
- Контейнеры не могут запуститься без правильных значений

**Причина:**
- `docker-compose.production.yml` не имеет `env_file:` директивы
- Docker Compose не загружает автоматически .env файл
- Переменные `${POSTGRES_DB}`, `${POSTGRES_USER}`, etc. остаются пустыми

**Решение:**
- Добавить `env_file: - .env` к каждому сервису или использовать значения по умолчанию

---

### Проблема #4: Dockerfile не устанавливает dev-зависимости для сборки
**Симптомы:**
- При сборке приложения ошибка: `Cannot find module 'tailwindcss'`
- Сборка падает на этапе `npm rid build`

**Причина:**
- В `Dockerfile.production` этап `deps` устанавливает только production зависимости: `npm ci --only=production`
- Этап `builder` копирует только production node_modules
- Для сборки Next.js нужны dev-зависимости (tailwindcss, postcss, autoprefixer)

**Решение:**
- В этапе `builder` установить все зависимости: `npm ci` (без --only=production)

---

### Проблема #5: Healthcheck для Redis не учитывает пароль
**Симптомы:**
- Redis healthcheck: `test: ["CMD", "redis-cl坚定", "--raw", "incr", "ping"]`
- Если Redis с паролем, healthcheck не пройдет

**Причина:**
- Healthcheck не передает пароль в redis-cli

**Решение:**
- Использовать условный healthcheck с проверкой пароля

---

## Минимальные исправления для запуска:

1. **PostgreSQL:** `postgres:15-alpine` вместо `postgres:16-alpine`
2. **Redis:** Условная команда запуска с поддержкой пустого пароля
3. **env_file:** Добавить загрузку .env файла
4. **Dockerfile:** Установка всех зависимостей в builder этапе
5. **Healthcheck Redis:** Условный с учетом пароля

---

## Рекомендации:

1. **Краткосрочно:** Применить минимальные исправления для запуска
2. **Среднесрочно:** Настроить правильный production .env файл на сервере
3. **Долгосрочно:** Автоматизировать проверку совместимости версий БД перед запуском

