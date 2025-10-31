# 🏠 Domeo - Система конфигурации дверей

## 🚀 Быстрый старт

### Локальная разработка:
```bash
# Windows
.\dev-safe.ps1

# Linux/Mac
./dev-safe.sh
```

### Деплой на staging:
```bash
./deploy-staging-safe.sh
```

### Деплой на production:
```bash
./deploy-production-safe.sh
```

## 📋 Workflow

1. **Разработка** - создавайте feature ветки от `develop`
2. **Тестирование** - мержите в `develop` для деплоя на staging
3. **Production** - мержите `develop` в `main` и создавайте теги

## 🛡️ Безопасность

- Никогда не коммитьте напрямую в `main`
- Всегда тестируйте на staging перед production
- Используйте теги для production релизов

## 📚 Документация

Вся документация находится в папке [`docs/`](./docs/):

### ⭐ Основные документы:
- **[Архитектура проекта](./docs/ARCHITECTURE.md)** - Полная архитектура приложения, модули, API, инфраструктура
- **[Онбординг](./docs/AGENT_ONBOARDING.md)** - Инфраструктура и текущее состояние проекта
- **[Правила системы](./docs/SYSTEM_RULES_AND_PERMISSIONS.md)** - Полные правила работы с заказчиками и документами

### 🚀 Для разработчиков:
- **[Полный Workflow доработки](./docs/DEVELOPMENT_WORKFLOW_COMPLETE.md)** ⭐ - Пошаговый процесс разработки и деплоя
- [Workflow разработки](./docs/DEVELOPMENT_WORKFLOW.md) - Краткое описание
- [Локальная настройка](./docs/LOCAL_DEVELOPMENT_SETUP.md)
- [Руководство по деплою](./docs/DEPLOY.md)
- [Руководство разработчика](./docs/README-DEVELOPMENT.md)

### 👥 Для пользователей:
- [Инструкции пользователя](./docs/USER_INSTRUCTIONS.md)
- [Как загрузить фото](./docs/HOW_TO_UPLOAD_PHOTOS.md)

### 📋 Полный список документов:
См. [docs/README.md](./docs/README.md) для полного списка всей документации.

### 🛠️ План доработки:
См. [docs/TODO_ROADMAP.md](./docs/TODO_ROADMAP.md) для списка задач доработки проекта.

## 🌿 Структура веток

```
main (production) ←── develop (staging) ←── feature/new-feature
     ↑                    ↑                        ↑
   Только готовое      Тестирование            Разработка
```

## 🔧 Технологии

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **База данных**: SQLite (dev), PostgreSQL (prod)
- **Аутентификация**: JWT с ролевой моделью
- **Файловое хранилище**: Yandex Object Storage
- **Мониторинг**: Prometheus, Grafana, Loki
- **Контейнеризация**: Docker, Docker Compose
