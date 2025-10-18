# 🚀 Domeo - Руководство разработчика

## 📋 Быстрый старт

### Локальная разработка
```bash
# Клонируем репозиторий
git clone <repo-url>
cd domeo

# Устанавливаем зависимости
npm install

# Запускаем локально
npm run dev
```

Приложение будет доступно по адресу: `http://localhost:3000`

## 🏗️ Структура проекта

```
domeo/
├── app/                    # Next.js App Router
├── components/             # React компоненты
├── lib/                    # Утилиты и сервисы
├── prisma/                 # База данных
├── public/                 # Статические файлы
├── scripts/                # Скрипты деплоя
├── .github/workflows/      # CI/CD
└── docker-compose.*.yml    # Docker конфигурации
```

## 🔄 Workflow разработки

### 1. Создание фичи
```bash
git checkout -b feature/new-feature
# ... разработка ...
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature
```

### 2. Code Review
- Создаем Pull Request
- Проходим Code Review
- Исправляем замечания

### 3. Деплой на staging
```bash
git checkout develop
git merge feature/new-feature
git push origin develop
# Автоматически деплоится на staging
```

### 4. Деплой на production
```bash
git checkout main
git merge develop
git tag v1.2.3
git push origin v1.2.3
# Автоматически деплоится на production
```

## 🛠️ Команды

### Разработка
```bash
npm run dev              # Запуск dev сервера
npm run build            # Сборка проекта
npm run lint             # Проверка кода
npm run lint:fix         # Исправление ошибок линтера
npm run type-check       # Проверка типов
```

### База данных
```bash
npm run prisma:generate  # Генерация Prisma клиента
npm run prisma:migrate   # Создание миграции
npm run prisma:studio    # Prisma Studio
npm run db:init          # Инициализация БД
npm run db:reset         # Сброс БД
```

### Деплой
```bash
npm run deploy:staging   # Деплой на staging
npm run deploy:prod      # Деплой на production
```

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

### Prisma Studio
```bash
npm run prisma:studio
```

## 🧪 Тестирование

### Локальные тесты
```bash
npm run test
```

### E2E тесты
```bash
npm run test:e2e
```

## 🐳 Docker

### Локальная разработка
```bash
docker-compose up -d
```

### Staging
```bash
docker-compose -f docker-compose.staging.yml up -d
```

### Production
```bash
docker-compose -f docker-compose.production.yml up -d
```

## 🔒 Безопасность

### Переменные окружения
- Никогда не коммитьте `.env` файлы
- Используйте разные секреты для разных окружений
- Регулярно ротируйте секреты

### Деплой
- Всегда тестируйте на staging перед production
- Используйте CI/CD для автоматических деплоев
- Создавайте бэкапы перед деплоем

## 🚨 Troubleshooting

### Проблемы с зависимостями
```bash
rm -rf node_modules package-lock.json
npm install
```

### Проблемы с базой данных
```bash
npm run db:reset
npm run db:init
```

### Проблемы с Docker
```bash
docker-compose down
docker system prune -f
docker-compose up -d --build
```

## 📊 Мониторинг

### Локальная разработка
- Console logs в терминале
- Browser DevTools
- Hot reload

### Staging
- Structured logs
- Error tracking
- Performance metrics

### Production
- Centralized logging
- Real-time monitoring
- Alerting

## 🤝 Code Style

### TypeScript
- Используйте строгую типизацию
- Избегайте `any`
- Используйте интерфейсы

### React
- Функциональные компоненты
- Hooks вместо классов
- Props типизация

### CSS
- Tailwind CSS
- Компонентный подход
- Responsive design

## 📝 Документация

- API документация: `/api/docs`
- Компоненты: Storybook (планируется)
- База данных: Prisma Studio

## 🆘 Поддержка

- Создавайте Issues в GitHub
- Используйте Pull Requests для изменений
- Следуйте Conventional Commits
