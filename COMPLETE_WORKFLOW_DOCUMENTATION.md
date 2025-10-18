# 🚀 ПОЛНЫЙ ДОКУМЕНТ ПО WORKFLOW РАЗРАБОТКИ DOMEO

## 📋 Содержание

1. [Обзор системы](#обзор-системы)
2. [Архитектура сред](#архитектура-сред)
3. [Git Workflow](#git-workflow)
4. [Процесс разработки](#процесс-разработки)
5. [Команды и скрипты](#команды-и-скрипты)
6. [Мониторинг и диагностика](#мониторинг-и-диагностика)
7. [Безопасность и правила](#безопасность-и-правила)
8. [Экстренные ситуации](#экстренные-ситуации)
9. [Техническая информация](#техническая-информация)
10. [Контакты и поддержка](#контакты-и-поддержка)

---

## 🌐 Обзор системы

### **Назначение**
Проект Domeo - это система управления конфигуратором дверей с админ-панелью, каталогом товаров и системой заказов.

### **Технологический стек**
- **Frontend**: Next.js 15.5.6, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **База данных**: SQLite (development/staging), PostgreSQL (production)
- **Аутентификация**: JWT с ролевой системой (Admin, Complectator, Executor)
- **Файловое хранилище**: Yandex Object Storage, AWS SDK
- **Контейнеризация**: Docker, Docker Compose
- **Мониторинг**: Prometheus, Grafana, Loki, Promtail

---

## 🏗️ Архитектура сред

### **Среды разработки**

| **Среда** | **URL** | **Порт** | **IP** | **Назначение** |
|-----------|---------|----------|--------|----------------|
| **Local** | `http://localhost:3000` | 3000 | localhost | Локальная разработка |
| **Staging** | `http://89.169.189.66:3001` | 3001 | 89.169.189.66 | Тестирование |
| **Production** | `http://130.193.40.35:3000` | 3000 | 130.193.40.35 | Рабочая среда |

### **Структура проекта**

```
domeo/
├── app/                    # Next.js App Router
├── components/            # React компоненты
├── lib/                   # Утилиты и конфигурация
├── prisma/               # Схема базы данных
├── public/               # Статические файлы
├── scripts/              # Скрипты деплоя и мониторинга
├── styles/               # CSS стили
├── types/                # TypeScript типы
├── .github/workflows/    # GitHub Actions
└── monitoring/           # Конфигурация мониторинга
```

---

## 🌿 Git Workflow

### **Стратегия веток**

```
main (production)
├── develop (staging)
│   ├── feature/new-feature-1
│   ├── feature/new-feature-2
│   └── hotfix/critical-fix
└── release/v1.0.0
```

### **Типы веток**

- **`main`** - Production код, только стабильные релизы
- **`develop`** - Staging код, интеграция функций
- **`feature/*`** - Разработка новых функций
- **`hotfix/*`** - Критические исправления
- **`release/*`** - Подготовка релизов

### **Процесс работы с ветками**

1. **Создание feature ветки**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/new-feature
   ```

2. **Разработка**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   git push origin feature/new-feature
   ```

3. **Pull Request**
   - Создать PR из `feature/new-feature` в `develop`
   - Code review
   - Merge после одобрения

4. **Деплой на staging**
   - Автоматический деплой при мерже в `develop`

5. **Деплой на production**
   - Создать PR из `develop` в `main`
   - Создать тег `v1.0.0`
   - Автоматический деплой на production

---

## 🔄 Процесс разработки

### **1. Локальная разработка**

```bash
# Клонирование репозитория
git clone https://github.com/domeo3dmodeler-art/Domeo_config.git
cd Domeo_config

# Установка зависимостей
npm install

# Настройка окружения
cp .env.example .env.local
# Отредактировать .env.local

# Запуск локальной разработки
npm run dev
```

### **2. Создание новой функции**

```bash
# Создание feature ветки
npm run git:feature

# Или вручную:
git checkout -b feature/название-функции

# Разработка
npm run dev

# Проверка кода
npm run lint
npm run type-check

# Коммит
git add .
git commit -m "feat: add new feature"
git push origin feature/название-функции
```

### **3. Тестирование на Staging**

```bash
# Создание Pull Request
# После мержа в develop:

# Деплой на staging
npm run deploy:staging:safe

# Проверка работы
npm run health:staging
npm run monitor
```

### **4. Деплой на Production**

```bash
# Только после успешного тестирования на staging!

# Создание Pull Request из develop в main
# После мержа:

# Создание тега
git tag v1.0.1
git push origin v1.0.1

# Деплой на production
npm run deploy:prod:safe

# Проверка работы
npm run health:prod
npm run monitor
```

---

## 🛠️ Команды и скрипты

### **Разработка**

| Команда | Описание |
|---------|----------|
| `npm run dev` | Локальная разработка |
| `npm run build` | Сборка проекта |
| `npm run start` | Запуск production сборки |
| `npm run lint` | Проверка кода ESLint |
| `npm run lint:fix` | Автоисправление ESLint |
| `npm run type-check` | Проверка TypeScript |

### **Git Workflow**

| Команда | Описание |
|---------|----------|
| `npm run git:feature` | Создание feature ветки |
| `npm run git:status` | Статус Git |
| `npm run workflow:status` | Статус workflow |

### **Деплой**

| Команда | Описание |
|---------|----------|
| `npm run deploy:staging:safe` | Безопасный деплой на staging |
| `npm run deploy:prod:safe` | Безопасный деплой на production |
| `npm run rollback:prod` | Откат production |

### **Мониторинг**

| Команда | Описание |
|---------|----------|
| `npm run health:staging` | Проверка staging |
| `npm run health:prod` | Проверка production |
| `npm run monitor` | Полный мониторинг обеих сред |
| `npm run monitor:ps1` | Мониторинг (PowerShell) |

### **Синхронизация данных**

| Команда | Описание |
|---------|----------|
| `npm run sync:data production staging` | Копировать данные с prod на staging |
| `npm run sync:data staging production` | Копировать данные со staging на prod |

---

## 📊 Мониторинг и диагностика

### **Health Check**

```bash
# Проверка staging
curl http://89.169.189.66:3001/api/health

# Проверка production
curl http://130.193.40.35:3000/api/health
```

### **Полный мониторинг**

```bash
# Bash
npm run monitor

# PowerShell
npm run monitor:ps1
```

### **Проверка логов**

```bash
# На staging VM
ssh -i staging_key ubuntu@89.169.189.66
cd /opt/domeo-staging
tail -f logs/app.log

# На production VM
ssh -i production_key ubuntu@130.193.40.35
cd /opt/domeo
tail -f logs/app.log
```

### **Проверка процессов**

```bash
# На VM
ps aux | grep node
sudo ss -tlnp | grep :3000
sudo ss -tlnp | grep :3001
```

---

## 🔒 Безопасность и правила

### **❌ НИКОГДА НЕ ДЕЛАЙТЕ:**

1. **Прямые изменения на Production VM**
   - Никогда не редактируйте файлы напрямую на production
   - Используйте только безопасные скрипты деплоя

2. **Деплой на production без тестирования на staging**
   - Всегда тестируйте изменения на staging
   - Проверяйте health check после деплоя

3. **Изменения в базе данных production без бэкапа**
   - Создавайте бэкапы перед изменениями
   - Используйте миграции Prisma

4. **Коммиты в main ветку напрямую**
   - Используйте Pull Requests
   - Следуйте процессу code review

### **✅ ВСЕГДА ДЕЛАЙТЕ:**

1. **Тестируйте на staging** перед production
2. **Создавайте feature ветки** для новых функций
3. **Используйте безопасные скрипты** для деплоя
4. **Проверяйте health check** после деплоя
5. **Документируйте изменения** в commit messages
6. **Создавайте бэкапы** перед критическими операциями

### **Права доступа**

| **Роль** | **Доступ** |
|----------|------------|
| **Admin** | Полный доступ ко всем функциям |
| **Complectator** | Управление товарами и заказами |
| **Executor** | Выполнение заказов |

---

## 🚨 Экстренные ситуации

### **Откат Production**

```bash
# Быстрый откат
npm run rollback:prod

# Или вручную на VM
cd /opt/domeo
git checkout HEAD~1
npm ci --only=production
npx prisma migrate deploy
pm2 restart domeo
```

### **Восстановление из бэкапа**

```bash
# На production VM
cd /opt/domeo
cp prisma/database/dev.db.backup-YYYYMMDD_HHMMSS prisma/database/dev.db
pm2 restart domeo
```

### **Восстановление SSH доступа**

Если потерян SSH доступ к VM:

1. **Через панель управления Yandex Cloud**
   - Перезагрузить VM
   - Проверить Security Groups
   - Сбросить пароль

2. **Восстановление через консоль**
   - Использовать веб-консоль Yandex Cloud
   - Проверить статус сервисов

### **Критические ошибки**

| **Ошибка** | **Решение** |
|------------|--------------|
| `EADDRINUSE` | Остановить конфликтующий процесс |
| `Database locked` | Перезапустить приложение |
| `Health check failed` | Проверить логи и перезапустить |
| `SSH timeout` | Проверить Security Groups |

---

## 🔧 Техническая информация

### **Конфигурация серверов**

#### **Production VM (130.193.40.35)**
- **OS**: Ubuntu 20.04 LTS
- **RAM**: 4GB
- **CPU**: 2 cores
- **Storage**: 20GB SSD
- **Path**: `/opt/domeo`
- **Port**: 3000

#### **Staging VM (89.169.189.66)**
- **OS**: Ubuntu 20.04 LTS
- **RAM**: 2GB
- **CPU**: 1 core
- **Storage**: 10GB SSD
- **Path**: `/opt/domeo-staging`
- **Port**: 3001

### **Переменные окружения**

#### **Production (.env)**
```env
NODE_ENV=production
DATABASE_URL="file:./prisma/database/dev.db"
JWT_SECRET=your-secret-key
NEXT_PUBLIC_BASE_URL=http://130.193.40.35:3000
```

#### **Staging (.env)**
```env
NODE_ENV=staging
DATABASE_URL="file:./prisma/database/dev.db"
JWT_SECRET=your-secret-key
NEXT_PUBLIC_BASE_URL=http://89.169.189.66:3001
```

### **Security Groups**

#### **Production**
- **SSH (22)**: Разрешено
- **HTTP (80)**: Разрешено
- **HTTPS (443)**: Разрешено
- **Custom (3000)**: Разрешено

#### **Staging**
- **SSH (22)**: Разрешено
- **HTTP (80)**: Разрешено
- **HTTPS (443)**: Разрешено
- **Custom (3001)**: Разрешено

### **Firewall (UFW)**

```bash
# Настройка UFW
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp  # Production
sudo ufw allow 3001/tcp  # Staging
sudo ufw --force enable
```

---

## 📞 Контакты и поддержка

### **Быстрые ссылки**

- **Production**: http://130.193.40.35:3000
- **Staging**: http://89.169.189.66:3001
- **GitHub**: https://github.com/domeo3dmodeler-art/Domeo_config

### **SSH доступ**

```bash
# Production
ssh -i production_key ubuntu@130.193.40.35

# Staging
ssh -i staging_key ubuntu@89.169.189.66
```

### **Документация**

- **Полный workflow**: `DEVELOPMENT_WORKFLOW_FINAL.md`
- **Шпаргалка**: `QUICK_REFERENCE.md`
- **Git workflow**: `GITHUB_WORKFLOW.md`

### **Мониторинг**

```bash
# Проверка статуса
npm run monitor

# Health check
npm run health:staging
npm run health:prod
```

---

## 🎯 Итоговые принципы

### **Основные принципы**

1. **🎯 Ручное управление** - все обновления только по команде
2. **🔒 Безопасность** - тестирование на staging перед production
3. **⚡ Контроль** - полный контроль над процессом деплоя
4. **📚 Документирование** - все изменения документируются
5. **🔍 Мониторинг** - постоянный контроль состояния систем

### **Workflow в одном предложении**

> **Разрабатывай локально → Тестируй на staging → Деплой на production только после успешного тестирования**

### **Помните**

- **Production - это священная корова**
- **Никогда не трогайте production напрямую**
- **Всегда тестируйте перед деплоем**
- **Используйте безопасные скрипты**
- **Мониторьте состояние систем**

---

**Документ создан**: $(date)  
**Версия**: 1.0  
**Статус**: Production Ready ✅
