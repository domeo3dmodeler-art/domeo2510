# 🚀 Схема обновлений и деплоя

## 📋 Обзор
Этот документ описывает полную схему разработки, тестирования и деплоя приложения Domeo.

## 🔄 Workflow разработки

### 1. **Локальная разработка**
```bash
# Запуск dev сервера
npm run dev

# Проверка линтера
npm run lint

# Тестирование API
curl http://localhost:3000/api/health
curl http://localhost:3000/api/catalog/categories
```

### 2. **Подготовка к деплою**
```bash
# Очистка кэша
npm cache clean --force

# Установка зависимостей
npm ci

# Сборка production
npm run build

# Проверка сборки
npm run start
```

### 3. **Тестирование перед деплоем**
```bash
# Проверка всех основных функций
- ✅ Главная страница загружается
- ✅ API endpoints отвечают
- ✅ Админ панель доступна
- ✅ Каталог работает
- ✅ Конфигуратор функционирует
```

## 🐳 Docker деплой

### Production контейнер
```bash
# Сборка production образа
docker build -f Dockerfile.production -t domeo:latest .

# Запуск с docker-compose
docker-compose -f docker-compose.production.yml up -d
```

### Проверка деплоя
```bash
# Проверка статуса контейнеров
docker-compose -f docker-compose.production.yml ps

# Проверка логов
docker-compose -f docker-compose.production.yml logs -f

# Проверка доступности
curl http://localhost:3000/api/health
```

## 🔄 Схема обновлений

### Быстрое обновление (Hot Update)
```bash
# 1. Остановка сервисов
docker-compose -f docker-compose.production.yml down

# 2. Обновление кода
git pull origin main

# 3. Пересборка образа
docker build -f Dockerfile.production -t domeo:latest .

# 4. Запуск обновленных сервисов
docker-compose -f docker-compose.production.yml up -d

# 5. Проверка работоспособности
./scripts/health-check.sh
```

### Полное обновление с миграциями
```bash
# 1. Бэкап базы данных
./scripts/backup-database.sh

# 2. Остановка сервисов
docker-compose -f docker-compose.production.yml down

# 3. Обновление кода
git pull origin main

# 4. Применение миграций
npm run prisma:migrate:deploy

# 5. Пересборка и запуск
docker-compose -f docker-compose.production.yml up -d --build

# 6. Проверка работоспособности
./scripts/health-check.sh
```

## 📊 Мониторинг

### Health Checks
```bash
# Основные проверки
curl http://localhost:3000/api/health
curl http://localhost:3000/api/metrics

# Проверка базы данных
npm run prisma:studio
```

### Логи и метрики
```bash
# Просмотр логов приложения
docker-compose -f docker-compose.production.yml logs -f app

# Мониторинг ресурсов
docker stats

# Prometheus метрики
curl http://localhost:9090/metrics
```

## 🛠 Скрипты автоматизации

### `scripts/update-production.sh`
```bash
#!/bin/bash
# Полное обновление production среды
set -e

echo "🔄 Начинаем обновление production..."

# Бэкап
./scripts/backup-database.sh

# Обновление кода
git pull origin main

# Пересборка
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d --build

# Проверка
./scripts/health-check.sh

echo "✅ Обновление завершено!"
```

### `scripts/health-check.sh`
```bash
#!/bin/bash
# Проверка работоспособности всех сервисов

echo "🔍 Проверяем работоспособность..."

# Проверка основных endpoints
curl -f http://localhost:3000/api/health || exit 1
curl -f http://localhost:3000/api/catalog/categories || exit 1

echo "✅ Все проверки пройдены!"
```

## 🚨 Rollback процедура

### Экстренный откат
```bash
# 1. Остановка текущих сервисов
docker-compose -f docker-compose.production.yml down

# 2. Откат к предыдущей версии
git checkout HEAD~1

# 3. Пересборка и запуск
docker-compose -f docker-compose.production.yml up -d --build

# 4. Проверка
./scripts/health-check.sh
```

### Откат с восстановлением БД
```bash
# 1. Остановка сервисов
docker-compose -f docker-compose.production.yml down

# 2. Восстановление БД из бэкапа
./scripts/restore-database.sh backup_YYYY-MM-DD.sql

# 3. Откат кода
git checkout HEAD~1

# 4. Запуск
docker-compose -f docker-compose.production.yml up -d --build
```

## 📝 Чеклист перед деплоем

- [ ] Код протестирован локально
- [ ] Все тесты проходят
- [ ] Линтер не показывает ошибок
- [ ] Production сборка успешна
- [ ] Бэкап базы данных создан
- [ ] Миграции подготовлены
- [ ] Переменные окружения настроены
- [ ] Мониторинг настроен

## 🔧 Переменные окружения

### Production (.env.production)
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:password@db:5432/domeo
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://yourdomain.com
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=ru-central1
AWS_S3_BUCKET=your-bucket-name
```

## 📞 Контакты и поддержка

- **Разработчик**: AI Assistant
- **Версия**: 1.0.0
- **Дата создания**: $(date)
- **Статус**: Production Ready ✅
