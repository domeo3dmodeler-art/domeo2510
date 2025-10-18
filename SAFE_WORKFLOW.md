# 🛡️ Безопасный Workflow Разработки

## 🎯 Три зоны безопасности

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   🏠 LOCAL DEV  │───▶│   🧪 STAGING    │───▶│   🏭 PRODUCTION │
│                 │    │                 │    │                 │
│ • Ваш компьютер │    │ • Тестовая ВМ   │    │ • Реальная ВМ   │
│ • Безопасно     │    │ • Тестирование  │    │ • Пользователи  │
│ • Эксперименты  │    │ • Проверки      │    │ • Только готовое│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🏠 Локальная разработка

### Запуск:
```bash
# Linux/Mac
./dev-safe.sh

# Windows
.\dev-safe.ps1
```

### Что безопасно:
- ✅ Любые эксперименты
- ✅ Поломка кода
- ✅ Тестирование функций
- ✅ Отладка

### Что НЕ влияет:
- ❌ На production
- ❌ На реальных пользователей
- ❌ На продакшен базу данных

---

## 🧪 Staging (Тестирование)

### Настройка переменных:
```bash
export STAGING_HOST="staging.yourdomain.com"
export STAGING_SSH_KEY="/path/to/ssh/key"
```

### Деплой:
```bash
./deploy-staging-safe.sh
```

### Что тестируете:
- ✅ Новые функции
- ✅ Интеграции
- ✅ Производительность
- ✅ UI/UX

---

## 🏭 Production (Только готовое)

### Настройка переменных:
```bash
export PROD_HOST="130.193.40.35"
export PROD_SSH_KEY="/path/to/ssh/key"
```

### Деплой:
```bash
./deploy-production-safe.sh
```

### Откат (если что-то пошло не так):
```bash
./rollback-production.sh
```

---

## 📋 Ежедневный workflow

### 1. Утром - разработка:
```bash
# Запускаете локально
./dev-safe.sh

# Разрабатываете новые функции
# Тестируете локально
# Коммитите изменения
git add .
git commit -m "feat: new feature"
git push origin feature/new-feature
```

### 2. Днем - тестирование:
```bash
# Мержите в develop
git checkout develop
git merge feature/new-feature
git push origin develop

# Автоматически деплоится на staging
# Тестируете на staging
# Исправляете баги
```

### 3. Вечером - продакшен:
```bash
# ТОЛЬКО если все протестировано
git checkout main
git merge develop
git tag v1.2.3
git push origin v1.2.3

# Автоматически деплоится на production
```

---

## 🚨 Что делать если что-то сломалось

### На локальной разработке:
```bash
# Просто перезапустите
./dev-safe.sh
```

### На staging:
```bash
# Откатите изменения
git revert <commit-hash>
git push origin develop
```

### На production:
```bash
# СРОЧНО! Откатите к предыдущей версии
./rollback-production.sh
```

---

## ✅ Главные правила безопасности

1. **Никогда не деплойте на production без тестирования на staging**
2. **Всегда создавайте бэкапы перед деплоем**
3. **Используйте теги версий для production**
4. **Мониторьте логи после каждого деплоя**
5. **Имейте план отката**

---

## 🔧 Настройка

### 1. Установите переменные окружения:
```bash
# Для staging
export STAGING_HOST="staging.yourdomain.com"
export STAGING_SSH_KEY="/path/to/ssh/key"

# Для production
export PROD_HOST="130.193.40.35"
export PROD_SSH_KEY="/path/to/ssh/key"
```

### 2. Сделайте скрипты исполняемыми:
```bash
chmod +x dev-safe.sh
chmod +x deploy-staging-safe.sh
chmod +x deploy-production-safe.sh
chmod +x rollback-production.sh
```

### 3. Настройте SSH ключи:
```bash
# Создайте SSH ключ для staging
ssh-keygen -t rsa -b 4096 -f ~/.ssh/staging_key

# Создайте SSH ключ для production
ssh-keygen -t rsa -b 4096 -f ~/.ssh/production_key
```

---

## 📊 Мониторинг

### Health checks:
```bash
# Staging
curl -f http://staging.yourdomain.com:3001/api/health

# Production
curl -f http://130.193.40.35:3000/api/health
```

### Логи:
```bash
# Staging
ssh -i $STAGING_SSH_KEY ubuntu@$STAGING_HOST "pm2 logs domeo-staging"

# Production
ssh -i $PROD_SSH_KEY ubuntu@$PROD_HOST "pm2 logs domeo"
```

---

## 🎉 Готово!

Теперь вы можете спокойно разрабатывать, зная что production защищен! 🛡️
