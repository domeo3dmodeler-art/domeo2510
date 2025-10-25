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

- [Безопасный Workflow](SAFE_WORKFLOW.md)
- [GitHub Workflow](GITHUB_WORKFLOW.md)
- [Процесс разработки](DEVELOPMENT_WORKFLOW.md)

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
