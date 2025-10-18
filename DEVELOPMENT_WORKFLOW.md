# 🚀 Схема разработки Dev/Prod

## 📋 Окружения

### 🏠 **LOCAL DEV** (Локальная разработка)
- **Цель**: Разработка и отладка
- **База данных**: SQLite (dev.db)
- **Порт**: 3000
- **Команда**: `npm run dev`
- **Особенности**: Hot reload, отладочные логи

### 🧪 **STAGING** (Тестовое окружение)
- **Цель**: Тестирование перед продакшеном
- **База данных**: PostgreSQL (тестовая)
- **Порт**: 3001
- **URL**: `staging.yourdomain.com`
- **Особенности**: Автотесты, QA проверки

### 🏭 **PRODUCTION** (Продакшен)
- **Цель**: Реальные пользователи
- **База данных**: PostgreSQL (продакшен)
- **Порт**: 3000
- **URL**: `yourdomain.com`
- **Особенности**: Мониторинг, бэкапы, SSL

## 🔄 Workflow разработки

### 1. **Локальная разработка**
```bash
# Клонируем репозиторий
git clone <repo-url>
cd domeo

# Устанавливаем зависимости
npm install

# Запускаем локально
npm run dev
```

### 2. **Коммит и тестирование**
```bash
# Создаем ветку для фичи
git checkout -b feature/new-feature

# Разрабатываем
# ... код ...

# Коммитим
git add .
git commit -m "feat: add new feature"

# Пушим в GitHub
git push origin feature/new-feature
```

### 3. **Автоматическое тестирование**
- GitHub Actions запускает тесты
- Проверяется сборка
- Запускаются автотесты
- Проверяется качество кода

### 4. **Staging деплой**
```bash
# После успешных тестов
git checkout main
git merge feature/new-feature
git push origin main

# Автоматически деплоится на staging
```

### 5. **Production деплой**
```bash
# После тестирования на staging
git tag v1.2.3
git push origin v1.2.3

# Автоматически деплоится на production
```

## 🛠️ Команды разработки

### Локальная разработка
```bash
npm run dev          # Запуск dev сервера
npm run build        # Сборка проекта
npm run test         # Запуск тестов
npm run lint         # Проверка кода
npm run type-check   # Проверка типов
```

### Staging
```bash
npm run build:staging    # Сборка для staging
npm run deploy:staging   # Деплой на staging
npm run test:e2e         # E2E тесты
```

### Production
```bash
npm run build:prod      # Сборка для production
npm run deploy:prod     # Деплой на production
npm run backup          # Создание бэкапа
```

## 🔒 Безопасность деплоев

### 1. **Защита production**
- Только через CI/CD
- Обязательные тесты
- Code review
- Staging проверки

### 2. **Откат изменений**
```bash
# Быстрый откат
git revert <commit-hash>
git push origin main

# Или откат к предыдущей версии
git checkout <previous-tag>
git push origin main --force
```

### 3. **Мониторинг**
- Health checks
- Error tracking
- Performance monitoring
- Database monitoring

## 📊 Мониторинг и логи

### Локальная разработка
- Console logs
- Browser DevTools
- Hot reload

### Staging
- Structured logs
- Error tracking
- Performance metrics
- Test reports

### Production
- Centralized logging
- Real-time monitoring
- Alerting
- Analytics

## 🗄️ База данных

### Миграции
```bash
# Создание миграции
npx prisma migrate dev --name add_new_feature

# Применение миграций
npx prisma migrate deploy

# Откат миграции
npx prisma migrate reset
```

### Бэкапы
```bash
# Автоматические бэкапы
npm run backup:auto

# Ручной бэкап
npm run backup:manual

# Восстановление
npm run restore <backup-file>
```

## 🚨 Troubleshooting

### Проблемы с деплоем
1. Проверить логи CI/CD
2. Проверить тесты
3. Проверить конфигурацию
4. Откатить изменения

### Проблемы с базой данных
1. Проверить миграции
2. Проверить подключение
3. Проверить права доступа
4. Восстановить из бэкапа

### Проблемы с производительностью
1. Проверить мониторинг
2. Проверить логи
3. Оптимизировать запросы
4. Масштабировать ресурсы
