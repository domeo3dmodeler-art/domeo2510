# 🎯 Полное руководство по Git Workflow

## 🌿 Структура веток

```
main (production) ←── develop (staging) ←── feature/new-feature
     ↑                    ↑                        ↑
   Только готовое      Тестирование            Разработка
   Стабильный код      Проверки               Эксперименты
```

## 📋 Пошаговый workflow

### **Шаг 1: Создание feature ветки**
```bash
# Быстрый способ
.\new-feature.ps1 improve-catalog

# Или вручную
git checkout develop
git pull origin develop
git checkout -b feature/improve-catalog
```

### **Шаг 2: Локальная разработка**
```bash
# Запуск локального сервера
.\dev-safe.ps1

# Приложение доступно: http://localhost:3000
# Безопасно экспериментировать
```

### **Шаг 3: Коммит и push**
```bash
git add .
git commit -m "feat: improve catalog performance"
git push origin feature/improve-catalog
```

### **Шаг 4: Создание Pull Request**
1. Перейдите в GitHub: https://github.com/domeo3dmodeler-art/Domeo_config
2. Нажмите "Compare & pull request"
3. Выберите: `feature/improve-catalog` → `develop`
4. Добавьте описание изменений
5. Создайте PR

### **Шаг 5: Автоматический деплой на staging**
- После мержа PR в `develop`
- GitHub Actions автоматически деплоит на staging
- Проверьте логи в разделе "Actions"

### **Шаг 6: Тестирование на staging**
```bash
# Проверка health check
curl -f http://staging.yourdomain.com:3001/api/health

# Тестирование функций
# Исправление багов если нужно
```

### **Шаг 7: Деплой на production**
```bash
# ТОЛЬКО после тестирования на staging
git checkout main
git merge develop
git tag v1.2.3
git push origin v1.2.3

# Автоматически деплоится на production
```

## 🛡️ Правила безопасности

### ✅ **Что можно:**
- Коммитить в feature ветки
- Экспериментировать локально
- Тестировать на staging

### ❌ **Что нельзя:**
- Коммитить напрямую в `main`
- Коммитить напрямую в `develop`
- Деплоить на production без тестирования

## 🚨 Что делать при ошибках

### **Ошибка в feature ветке:**
```bash
# Просто исправляете и коммитите
git add .
git commit -m "fix: resolve issue"
git push origin feature/improve-catalog
```

### **Ошибка в staging:**
```bash
# Откатываете develop
git checkout develop
git revert <commit-hash>
git push origin develop
# Автоматически откатывается staging
```

### **Ошибка в production:**
```bash
# СРОЧНО! Откатываете к предыдущему тегу
git checkout v1.2.2
git push origin main --force
# Автоматически откатывается production
```

## 📊 Мониторинг

### **GitHub Actions:**
- Проверяйте статус деплоев
- Мониторьте ошибки сборки
- Отслеживайте тесты

### **Health Checks:**
```bash
# Staging
curl -f http://staging.yourdomain.com:3001/api/health

# Production
curl -f http://production.yourdomain.com:3000/api/health
```

### **Логи:**
```bash
# Staging
ssh -i $STAGING_SSH_KEY ubuntu@$STAGING_HOST "pm2 logs domeo-staging"

# Production
ssh -i $PROD_SSH_KEY ubuntu@$PROD_HOST "pm2 logs domeo"
```

## 🎯 Ежедневный workflow

### **Утром:**
```bash
# Обновляете develop
git checkout develop
git pull origin develop

# Создаете feature ветку
.\new-feature.ps1 today-feature

# Разрабатываете
.\dev-safe.ps1
```

### **Днем:**
```bash
# Коммитите изменения
git add .
git commit -m "feat: today's work"
git push origin feature/today-feature

# Создаете PR в GitHub
```

### **Вечером:**
```bash
# После тестирования на staging
git checkout main
git merge develop
git tag v1.2.3
git push origin v1.2.3
```

## 🔧 Полезные команды

```bash
# Статус workflow
npm run workflow:status

# Создание feature ветки
.\new-feature.ps1 feature-name

# Безопасный запуск локально
.\dev-safe.ps1

# Деплой на staging
./deploy-staging-safe.sh

# Деплой на production
./deploy-production-safe.sh

# Откат production
./rollback-production.sh
```

## 📚 Дополнительная документация

- [Безопасный Workflow](SAFE_WORKFLOW.md)
- [GitHub Workflow](GITHUB_WORKFLOW.md)
- [Процесс разработки](DEVELOPMENT_WORKFLOW.md)
