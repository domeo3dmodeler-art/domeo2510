# 🚀 Правильный Workflow Разработки Domeo

## 📋 Обзор

Этот документ описывает правильный workflow разработки для проекта Domeo с ручным управлением обновлениями.

## 🌐 Среды разработки

| **Среда** | **URL** | **Порт** | **Назначение** |
|-----------|---------|----------|----------------|
| **Production** | `http://130.193.40.35:3000` | 3000 | Рабочая среда для клиентов |
| **Staging** | `http://89.169.189.66:3001` | 3001 | Тестовая среда для проверки |

## 🔄 Workflow разработки

### **1. Локальная разработка**

```bash
# Запуск локальной разработки
npm run dev

# Проверка кода
npm run lint
npm run type-check
```

### **2. Создание новой функции**

```bash
# Создание feature ветки
npm run git:feature

# Или вручную:
git checkout -b feature/название-функции
```

### **3. Тестирование на Staging**

```bash
# Деплой на staging
npm run deploy:staging:safe

# Проверка работы
curl http://89.169.189.66:3001/api/health
```

### **4. Деплой на Production**

```bash
# Только после успешного тестирования на staging!
npm run deploy:prod:safe
```

## 🛠️ Доступные команды

### **Разработка**
- `npm run dev` - локальная разработка
- `npm run build` - сборка проекта
- `npm run lint` - проверка кода
- `npm run type-check` - проверка типов

### **Git Workflow**
- `npm run git:feature` - создание feature ветки
- `npm run git:status` - статус Git
- `npm run workflow:status` - статус workflow

### **Деплой**
- `npm run deploy:staging:safe` - безопасный деплой на staging
- `npm run deploy:prod:safe` - безопасный деплой на production
- `npm run rollback:prod` - откат production

### **Мониторинг**
- `npm run health:staging` - проверка staging
- `npm run health:prod` - проверка production

## 🔒 Правила безопасности

### **❌ НИКОГДА НЕ ДЕЛАЙТЕ:**
1. **Прямые изменения на Production VM** - только через скрипты
2. **Деплой на production без тестирования на staging**
3. **Изменения в базе данных production без бэкапа**

### **✅ ВСЕГДА ДЕЛАЙТЕ:**
1. **Тестируйте на staging** перед production
2. **Создавайте feature ветки** для новых функций
3. **Используйте безопасные скрипты** для деплоя
4. **Проверяйте health check** после деплоя

## 📊 Процесс обновления

### **Шаг 1: Разработка**
```bash
# Создаем feature ветку
git checkout -b feature/new-feature

# Разрабатываем локально
npm run dev

# Коммитим изменения
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature
```

### **Шаг 2: Тестирование**
```bash
# Создаем Pull Request в develop
# После мержа в develop:

# Деплоим на staging
npm run deploy:staging:safe

# Тестируем на http://89.169.189.66:3001
```

### **Шаг 3: Production**
```bash
# Только после успешного тестирования!

# Мержим develop в main
git checkout main
git merge develop
git tag v1.0.1
git push origin main --tags

# Деплоим на production
npm run deploy:prod:safe

# Проверяем на http://130.193.40.35:3000
```

## 🔧 Синхронизация данных

### **Копирование данных с Production на Staging**
```bash
# Используем созданный скрипт
./scripts/sync-data-between-environments.sh production staging
```

### **Копирование данных со Staging на Production**
```bash
# ОСТОРОЖНО! Только для восстановления
./scripts/sync-data-between-environments.sh staging production
```

## 🚨 Экстренные ситуации

### **Откат Production**
```bash
npm run rollback:prod
```

### **Восстановление из бэкапа**
```bash
# На production VM
cd /opt/domeo
cp prisma/database/dev.db.backup-YYYYMMDD_HHMMSS prisma/database/dev.db
```

## 📞 Контакты и поддержка

- **Production VM**: `130.193.40.35:3000`
- **Staging VM**: `89.169.189.66:3001`
- **SSH ключи**: `production_key`, `staging_key`

## 📝 Логи и мониторинг

### **Проверка логов**
```bash
# На VM
cd /opt/domeo  # или /opt/domeo-staging
tail -f logs/app.log
```

### **Health Check**
```bash
# Staging
curl http://89.169.189.66:3001/api/health

# Production
curl http://130.193.40.35:3000/api/health
```

---

## 🎯 Итоговые принципы

1. **Ручное управление** - все обновления только по команде
2. **Безопасность** - тестирование на staging перед production
3. **Контроль** - полный контроль над процессом деплоя
4. **Документирование** - все изменения документируются
5. **Мониторинг** - постоянный контроль состояния систем

**Помните: Production - это священная корова. Никогда не трогайте её напрямую!**
