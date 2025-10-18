# 🌿 GitHub Workflow для безопасной разработки

## 📋 Структура веток

```
main (production) ←── develop (staging) ←── feature/new-feature
     ↑                    ↑                        ↑
   Только готовое      Тестирование            Разработка
```

### 🏷️ **Ветки:**

- **`main`** - Production код (только стабильный)
- **`develop`** - Staging код (тестирование)
- **`feature/*`** - Разработка новых функций
- **`hotfix/*`** - Срочные исправления
- **`release/*`** - Подготовка релизов

---

## 🚀 Workflow разработки

### 1. **Создание новой функции:**
```bash
# Переключаемся на develop
git checkout develop
git pull origin develop

# Создаем ветку для функции
git checkout -b feature/new-door-calculator

# Разрабатываем локально
.\dev-safe.ps1

# Коммитим изменения
git add .
git commit -m "feat: add new door calculator"
git push origin feature/new-door-calculator
```

### 2. **Создание Pull Request:**
```bash
# В GitHub создаем PR: feature/new-door-calculator → develop
# Проверяем код, тестируем
# Мержим в develop
```

### 3. **Автоматический деплой на staging:**
```bash
# После мержа в develop автоматически деплоится на staging
# Тестируем на staging
# Исправляем баги если нужно
```

### 4. **Деплой на production:**
```bash
# ТОЛЬКО после тестирования на staging
git checkout main
git merge develop
git tag v1.2.3
git push origin v1.2.3

# Автоматически деплоится на production
```

---

## 🔧 Настройка GitHub Actions

### 1. **Автоматический деплой на staging:**
```yaml
# .github/workflows/staging.yml
name: Deploy to Staging
on:
  push:
    branches: [develop]
  pull_request:
    branches: [develop]

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Staging
        run: ./deploy-staging-safe.sh
```

### 2. **Автоматический деплой на production:**
```yaml
# .github/workflows/production.yml
name: Deploy to Production
on:
  push:
    tags: ['v*']

jobs:
  deploy-production:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Production
        run: ./deploy-production-safe.sh
```

---

## 🛡️ Защита веток

### 1. **Защита main ветки:**
- Требовать Pull Request
- Требовать проверки статуса
- Требовать обновление ветки
- Запретить force push

### 2. **Защита develop ветки:**
- Требовать Pull Request
- Требовать проверки статуса
- Разрешить force push только админам

---

## 📋 Ежедневный workflow с GitHub

### **Утром - начинаем разработку:**
```bash
# 1. Обновляем develop
git checkout develop
git pull origin develop

# 2. Создаем ветку для новой функции
git checkout -b feature/improve-catalog

# 3. Разрабатываем локально
.\dev-safe.ps1
```

### **Днем - коммитим и тестируем:**
```bash
# 1. Коммитим изменения
git add .
git commit -m "feat: improve catalog performance"
git push origin feature/improve-catalog

# 2. Создаем Pull Request в GitHub
# 3. После мержа автоматически деплоится на staging
# 4. Тестируем на staging
```

### **Вечером - релиз в production:**
```bash
# 1. ТОЛЬКО если все протестировано на staging
git checkout main
git merge develop
git tag v1.2.3
git push origin v1.2.3

# 2. Автоматически деплоится на production
```

---

## 🚨 Что делать при проблемах

### **Проблема в feature ветке:**
```bash
# Просто исправляем и коммитим
git add .
git commit -m "fix: resolve issue"
git push origin feature/improve-catalog
```

### **Проблема в staging (develop):**
```bash
# Создаем hotfix ветку
git checkout develop
git checkout -b hotfix/fix-staging-issue
# Исправляем
git add .
git commit -m "hotfix: resolve staging issue"
git push origin hotfix/fix-staging-issue
# Создаем PR и мержим
```

### **Проблема в production (main):**
```bash
# СРОЧНО! Создаем hotfix
git checkout main
git checkout -b hotfix/critical-production-fix
# Исправляем
git add .
git commit -m "hotfix: critical production fix"
git tag v1.2.4
git push origin v1.2.4
# Автоматически деплоится исправление
```

---

## 🔍 Мониторинг и логи

### **GitHub Actions логи:**
- Проверяем статус деплоев
- Мониторим ошибки сборки
- Отслеживаем тесты

### **Production логи:**
```bash
# Проверяем логи production
ssh -i $PROD_SSH_KEY ubuntu@$PROD_HOST "pm2 logs domeo"

# Проверяем health check
curl -f http://130.193.40.35:3000/api/health
```

---

## ✅ Правила безопасности

1. **Никогда не коммитьте напрямую в main**
2. **Всегда тестируйте на staging перед production**
3. **Используйте осмысленные commit сообщения**
4. **Создавайте теги для production релизов**
5. **Мониторьте логи после каждого деплоя**
6. **Имейте план отката для каждого релиза**

---

## 🎯 Преимущества этого workflow

- ✅ **Безопасность** - production защищен
- ✅ **Контроль** - видите что деплоится
- ✅ **Откат** - можете быстро вернуться
- ✅ **Тестирование** - все проверяется на staging
- ✅ **Автоматизация** - меньше ручной работы
- ✅ **Мониторинг** - видите статус всех деплоев
