# 🔄 Полный Workflow доработки проекта Domeo

**Версия**: 1.0  
**Дата обновления**: 2025-11-01  
**Статус**: ✅ Актуально

---

## 📋 Оглавление

1. [Обзор Workflow](#обзор-workflow)
2. [Структура веток](#структура-веток)
3. [Процесс разработки](#процесс-разработки)
4. [Деплой на окружения](#деплой-на-окружения)
5. [Работа с базой данных](#работа-с-базой-данных)
6. [Проверка и тестирование](#проверка-и-тестирование)
7. [Экстренные ситуации](#экстренные-ситуации)
8. [Полезные команды](#полезные-команды)

---

## 🎯 Обзор Workflow

### Общая схема процесса:

```
Локальная разработка
    ↓
Feature ветка (feature/*)
    ↓
Коммиты и Push
    ↓
Pull Request (опционально)
    ↓
Merge в develop
    ↓
Автодеплой на Staging (ВМ: 130.193.40.35)
    ↓
Тестирование на Staging
    ↓
Merge в main + Tag
    ↓
Деплой на Production (K8s: Yandex Cloud)
```

---

## 🌿 Структура веток

### Основные ветки:

1. **`main`** (Production)
   - ✅ Только готовый код
   - ✅ Всегда стабилен
   - ✅ Используется для Production
   - ❌ НЕ коммитить напрямую

2. **`develop`** (Staging)
   - ✅ Основная ветка разработки
   - ✅ Автодеплой на Staging
   - ✅ Тестирование новых фич
   - ✅ Приемка изменений из feature веток

3. **`feature/*`** (Разработка)
   - ✅ Создаются от `develop`
   - ✅ Для новых фич и исправлений
   - ✅ После завершения мержатся в `develop`

### Схема веток:

```
main (production)
  ↑
  | merge + tag
  |
develop (staging)
  ↑
  | merge
  |
feature/new-feature
feature/bug-fix
```

---

## 🛠️ Процесс разработки

### Шаг 1: Подготовка к разработке

#### Вариант A: Создание feature ветки (рекомендуется)

```bash
# Обновляем develop
git checkout develop
git pull origin develop

# Создаем feature ветку
git checkout -b feature/my-feature-name

# Или через скрипт (PowerShell):
.\scripts\create-feature.ps1 my-feature-name
```

#### Вариант B: Прямая работа в develop (для быстрых фиксов)

```bash
git checkout develop
git pull origin develop
```

⚠️ **Внимание**: Прямая работа в `develop` допустима только для критических багфиксов и небольших изменений.

---

### Шаг 2: Разработка

#### Локальная разработка (если нужна)

```bash
# Windows
.\dev-safe.ps1

# Linux/Mac
./dev-safe.sh

# Или через Docker
docker-compose up -d
npm run dev
```

#### Проверка сборки

```bash
# Проверяем что проект собирается
npm run build

# Проверяем типы
npm run type-check

# Проверяем линтер
npm run lint
```

---

### Шаг 3: Коммит изменений

#### Conventional Commits формат:

```bash
git add .
git commit -m "feat: добавлена новая функция"
git commit -m "fix: исправлена ошибка в авторизации"
git commit -m "docs: обновлена документация"
git commit -m "refactor: рефакторинг модуля корзины"
git commit -m "chore: обновлены зависимости"
```

#### Типы коммитов:

- `feat:` - новая функциональность
- `fix:` - исправление бага
- `docs:` - изменения в документации
- `style:` - форматирование, отсутствующие точки с запятой и т.д.
- `refactor:` - рефакторинг кода
- `test:` - добавление тестов
- `chore:` - обновление задач сборки, настроек и т.д.

---

### Шаг 4: Push изменений

```bash
# Если feature ветка
git push origin feature/my-feature-name

# Если develop
git push origin develop
```

⚠️ **Важно**: Push в `develop` автоматически запускает деплой на Staging (ВМ).

---

### Шаг 5: Pull Request (опционально)

Если работали в feature ветке:

1. Создайте Pull Request в GitHub
   - `feature/my-feature-name` → `develop`
   - Опишите изменения
   - Добавьте скриншоты, если применимо

2. Code Review (если есть команда)

3. Merge после одобрения

---

## 🚀 Деплой на окружения

### Staging (автоматический)

**Окружение**: ВМ `130.193.40.35:3001`  
**Ветка**: `develop`  
**Автодеплой**: ✅ Да (при push в `develop`)

#### Что происходит автоматически:

1. Push в `develop` → GitHub Actions запускает workflow
2. Сборка образа
3. Деплой на Staging ВМ
4. Health check проверка

#### Проверка деплоя:

```bash
# Проверяем health endpoint
curl http://130.193.40.35:3001/api/health

# Или в браузере
http://130.193.40.35:3001
```

#### Ручной деплой на Staging (если нужно):

```bash
# На ВМ
ssh ubuntu@130.193.40.35
cd /opt/domeo
git pull origin develop
docker compose -f docker-compose.staging.yml up -d --build
```

---

### Production (ручной)

**Окружение**: Kubernetes, Yandex Cloud  
**Внешний IP**: `158.160.202.117:80`  
**Ветка**: `main`  
**Автодеплой**: ❌ Нет (только ручной)

#### Процесс деплоя на Production:

##### Шаг 1: Merge в main

```bash
# Обновляем main
git checkout main
git pull origin main

# Мержим develop
git merge develop

# Создаем тег
git tag v20251101120000  # формат: vYYYYMMDDHHMMSS

# Пушим
git push origin main
git push origin v20251101120000
```

##### Шаг 2: Сборка и пуш образа

```bash
# Windows
.\scripts\build_and_push.ps1 -ImageName app -Tag v20251101120000

# Linux/Mac
./scripts/build_and_push.sh app v20251101120000
```

**Registry**: `cr.yandex/crpuein3jvjccnafs2vc/app`

##### Шаг 3: Деплой в K8s

```bash
# Подключаемся к кластеру
yc managed-kubernetes cluster get-credentials --id cat9eenl393qj44riti4 --external --force
kubectl config use-context yc-domeo-prod
kubectl config set-context --current --namespace=prod

# Обновляем образ в манифестах (kustomization.yaml)
# Или применяем напрямую:
kubectl -n prod set image deployment/app app=cr.yandex/crpuein3jvjccnafs2vc/app:v20251101120000

# Или через скрипт:
./scripts/rollout.sh v20251101120000

# Проверяем статус
kubectl -n prod rollout status deploy/app
```

##### Шаг 4: Проверка

```bash
# Health check
curl http://158.160.202.117/api/health

# Проверка подов
kubectl -n prod get pods -l app=app
kubectl -n prod logs -l app=app --tail=50
```

---

## 💾 Работа с базой данных

### ⚠️ ВАЖНО: Миграции БД НЕ выполняются автоматически

**Причина**: База данных должна оставаться стабильной, схема не меняется при деплоях.

### Когда нужны изменения схемы:

1. **Создание миграции локально**:

```bash
# Изменяем schema.prisma
npx prisma format
npx prisma migrate dev --name my_migration_name
```

2. **Ручное применение в Production**:

```bash
# Бэкап БД (ОБЯЗАТЕЛЬНО!)
kubectl -n prod exec -i postgres-0 -- sh -lc "pg_dump -U staging_user -d domeo_staging > /tmp/backup.sql"

# Применяем миграцию
kubectl -n prod exec -i deployment/app -- sh -lc "npm run prisma:migrate:deploy"
```

### Проверка БД:

```bash
# Подключение к БД
kubectl -n prod exec -it postgres-0 -- sh
export PGPASSWORD=staging_password
psql -U staging_user -d domeo_staging

# Проверка таблиц
\dt

# Проверка данных
SELECT count(*) FROM products;
```

---

## ✅ Проверка и тестирование

### После деплоя на Staging:

1. **Health Check**:
   ```bash
   curl http://130.193.40.35:3001/api/health
   ```

2. **Функциональное тестирование**:
   - Проверка основных функций
   - Тестирование новых фич
   - Проверка UI/UX

3. **Проверка логов**:
   ```bash
   ssh ubuntu@130.193.40.35
   docker logs domeo-staging-app -f
   ```

### После деплоя на Production:

1. **Health Check**:
   ```bash
   curl http://158.160.202.117/api/health
   ```

2. **Мониторинг**:
   ```bash
   kubectl -n prod get pods -l app=app
   kubectl -n prod top pods -l app=app
   kubectl -n prod logs -l app=app --tail=100
   ```

3. **Проверка метрик** (если настроено):
   - Prometheus метрики
   - Response time
   - Error rate

---

## 🚨 Экстренные ситуации

### Откат на Production

```bash
# Откат последней версии
kubectl -n prod rollout undo deploy/app

# Откат на конкретную версию
kubectl -n prod rollout undo deploy/app --to-revision=2

# Или через скрипт
./scripts/rollback.sh
```

### Проблемы с БД

```bash
# Бэкап БД
kubectl -n prod exec -i postgres-0 -- sh -lc "pg_dump -U staging_user -d domeo_staging" > backup.sql

# Восстановление из бэкапа
kubectl -n prod exec -i postgres-0 -- sh -lc "psql -U staging_user -d domeo_staging" < backup.sql
```

### Проблемы с подами

```bash
# Перезапуск подов
kubectl -n prod delete pods -l app=app

# Проверка событий
kubectl -n prod get events --sort-by='.lastTimestamp'

# Описание пода
kubectl -n prod describe pod <pod-name>
```

---

## 📝 Полезные команды

### Git команды

```bash
# Статус
git status

# Логи
git log --oneline -10

# Сброс изменений (ОСТОРОЖНО!)
git reset --hard HEAD

# Отмена последнего коммита
git reset --soft HEAD~1
```

### Docker команды (Staging)

```bash
# Логи
docker logs domeo-staging-app -f

# Перезапуск
docker compose -f docker-compose.staging.yml restart

# Пересборка
docker compose -f docker-compose.staging.yml up -d --build
```

### Kubernetes команды (Production)

```bash
# Подключение к кластеру
yc managed-kubernetes cluster get-credentials --id cat9eenl393qj44riti4 --external --force
kubectl config use-context yc-domeo-prod
kubectl config set-context --current --namespace=prod

# Поды
kubectl -n prod get pods
kubectl -n prod describe pod <pod-name>
kubectl -n prod logs <pod-name> -f

# Сервисы
kubectl -n prod get svc
kubectl -n prod describe svc app

# Деплойменты
kubectl -n prod get deploy
kubectl -n prod describe deploy app
kubectl -n prod rollout history deploy/app

# БД
kubectl -n prod get pods -l app=postgres
kubectl -n prod exec -it postgres-0 -- sh
```

---

## 🎯 Чек-лист для разработчика

### Перед началом работы:

- [ ] Обновлена локальная ветка (`git pull`)
- [ ] Создана feature ветка (если новая фича)
- [ ] Понимаю что делаю и зачем

### Во время разработки:

- [ ] Код собирается (`npm run build`)
- [ ] Нет ошибок линтера (`npm run lint`)
- [ ] Нет ошибок типов (`npm run type-check`)
- [ ] Коммиты в формате Conventional Commits

### Перед merge в develop:

- [ ] Протестировано локально (если возможно)
- [ ] Изменения закоммичены
- [ ] Описание изменений готово
- [ ] Создан Pull Request (если нужно)

### Перед деплоем на Production:

- [ ] Протестировано на Staging
- [ ] Все работает корректно
- [ ] Создан тег версии
- [ ] Образ собран и запушен
- [ ] Готов к ручному деплою в K8s

---

## 📚 Дополнительная документация

- **[Архитектура](./ARCHITECTURE.md)** - Полная архитектура проекта
- **[Онбординг](./AGENT_ONBOARDING.md)** - Инфраструктура и состояние
- **[Локальная настройка](./LOCAL_DEVELOPMENT_SETUP.md)** - Настройка локальной разработки
- **[Деплой](./DEPLOY.md)** - Детальное руководство по деплою
- **[Правила системы](./SYSTEM_RULES_AND_PERMISSIONS.md)** - Бизнес-правила

---

**Последнее обновление**: 2025-11-01  
**Статус**: ✅ Актуально

